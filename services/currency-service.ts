import type { ExchangeRate } from "@/types/currency"

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 60 * 60 * 1000

class CurrencyService {
  private exchangeRates: Record<string, ExchangeRate> = {}
  private apiKey: string
  private baseUrl: string
  private fallbackRates: Record<string, Record<string, number>> = {
    USD: { EUR: 0.93, GBP: 0.79, JPY: 150.59, CAD: 1.37, AUD: 1.52, CNY: 7.24, INR: 83.36 },
    EUR: { USD: 1.07, GBP: 0.85, JPY: 161.92, CAD: 1.47, AUD: 1.63, CNY: 7.78, INR: 89.63 },
    GBP: { USD: 1.26, EUR: 1.18, JPY: 190.49, CAD: 1.73, AUD: 1.92, CNY: 9.15, INR: 105.45 },
  }

  constructor(apiKey = "YOUR_API_KEY") {
    this.apiKey = apiKey
    this.baseUrl = "https://api.exchangerate.host"

    // Initialize with fallback rates
    Object.keys(this.fallbackRates).forEach((base) => {
      this.exchangeRates[base] = {
        base,
        timestamp: Date.now(),
        rates: this.fallbackRates[base],
      }
    })
  }

  // Fetch exchange rates for a base currency
  async getExchangeRates(baseCurrency: string): Promise<ExchangeRate> {
    // Check if we have cached rates that are still valid
    const cachedRates = this.exchangeRates[baseCurrency]
    const now = Date.now()

    if (cachedRates && now - cachedRates.timestamp < CACHE_DURATION) {
      return cachedRates
    }

    try {
      // In a real implementation, use your API key
      const response = await fetch(`${this.baseUrl}/latest?base=${baseCurrency}`)
      const data = await response.json()

      if (!data || !data.rates) {
        throw new Error("Invalid response from exchange rate API")
      }

      const exchangeRate: ExchangeRate = {
        base: baseCurrency,
        timestamp: now,
        rates: data.rates,
      }

      // Cache the rates
      this.exchangeRates[baseCurrency] = exchangeRate

      return exchangeRate
    } catch (error) {
      console.error("Failed to fetch exchange rates:", error)

      // Return cached rates even if expired
      if (cachedRates) return cachedRates

      // If no cached rates, use fallback rates if available
      if (this.fallbackRates[baseCurrency]) {
        return {
          base: baseCurrency,
          timestamp: now,
          rates: this.fallbackRates[baseCurrency],
        }
      }

      // If no fallback rates for this currency, create a simple 1:1 rate
      return {
        base: baseCurrency,
        timestamp: now,
        rates: { USD: 1, EUR: 1, GBP: 1 },
      }
    }
  }

  // Convert an amount from one currency to another
  async convertAmount(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return amount

    try {
      const rates = await this.getExchangeRates(fromCurrency)

      if (!rates.rates[toCurrency]) {
        console.warn(`Exchange rate not available for ${toCurrency}, using 1:1 conversion`)
        return amount
      }

      return amount * rates.rates[toCurrency]
    } catch (error) {
      console.error(`Error converting from ${fromCurrency} to ${toCurrency}:`, error)
      return amount // Return original amount if conversion fails
    }
  }

  // Convert multiple amounts at once (more efficient)
  async convertAmounts(
    amounts: Array<{ amount: number; fromCurrency: string }>,
    toCurrency: string,
  ): Promise<number[]> {
    try {
      const uniqueFromCurrencies = [...new Set(amounts.map((a) => a.fromCurrency))]

      // Fetch all needed exchange rates in parallel
      const ratesPromises = uniqueFromCurrencies.map((curr) => this.getExchangeRates(curr))
      const ratesResults = await Promise.all(ratesPromises)

      // Create a map for quick lookup
      const ratesMap = ratesResults.reduce(
        (map, rates) => {
          map[rates.base] = rates
          return map
        },
        {} as Record<string, ExchangeRate>,
      )

      // Convert each amount
      return amounts.map(({ amount, fromCurrency }) => {
        if (fromCurrency === toCurrency) return amount

        const rates = ratesMap[fromCurrency]
        if (!rates || !rates.rates[toCurrency]) {
          console.error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`)
          return amount // Return original amount if conversion fails
        }

        return amount * rates.rates[toCurrency]
      })
    } catch (error) {
      console.error("Error converting multiple amounts:", error)
      return amounts.map(({ amount }) => amount) // Return original amounts if conversion fails
    }
  }
}

// Create a singleton instance
export const currencyService = new CurrencyService()
