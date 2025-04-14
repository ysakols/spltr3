export interface Currency {
  code: string
  name: string
  symbol: string
  flag?: string
  decimalDigits: number
}

export interface ExchangeRate {
  base: string
  timestamp: number
  rates: Record<string, number>
}

export interface CurrencyPreference {
  defaultCurrency: string
  showOriginalCurrency: boolean
  showConvertedValues: boolean
}

export type CurrencyAmount = {
  amount: number
  currency: string
}

// Helper function to format currency amounts
export function formatCurrency(amount: number, currencyCode: string, currencies: Record<string, Currency>): string {
  const currency = currencies[currencyCode]
  if (!currency) return `${amount.toFixed(2)} ${currencyCode}`

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: currency.decimalDigits,
    maximumFractionDigits: currency.decimalDigits,
  }).format(amount)
}

// Common currencies data
export const commonCurrencies: Record<string, Currency> = {
  USD: {
    code: "USD",
    name: "us dollar",
    symbol: "$",
    flag: "🇺🇸",
    decimalDigits: 2,
  },
  EUR: {
    code: "EUR",
    name: "euro",
    symbol: "€",
    flag: "🇪🇺",
    decimalDigits: 2,
  },
  GBP: {
    code: "GBP",
    name: "british pound",
    symbol: "£",
    flag: "🇬🇧",
    decimalDigits: 2,
  },
  JPY: {
    code: "JPY",
    name: "japanese yen",
    symbol: "¥",
    flag: "🇯🇵",
    decimalDigits: 0,
  },
  CAD: {
    code: "CAD",
    name: "canadian dollar",
    symbol: "C$",
    flag: "🇨🇦",
    decimalDigits: 2,
  },
  AUD: {
    code: "AUD",
    name: "australian dollar",
    symbol: "A$",
    flag: "🇦🇺",
    decimalDigits: 2,
  },
  CNY: {
    code: "CNY",
    name: "chinese yuan",
    symbol: "¥",
    flag: "🇨🇳",
    decimalDigits: 2,
  },
  INR: {
    code: "INR",
    name: "indian rupee",
    symbol: "₹",
    flag: "🇮🇳",
    decimalDigits: 2,
  },
  MXN: {
    code: "MXN",
    name: "mexican peso",
    symbol: "$",
    flag: "🇲🇽",
    decimalDigits: 2,
  },
  BRL: {
    code: "BRL",
    name: "brazilian real",
    symbol: "R$",
    flag: "🇧🇷",
    decimalDigits: 2,
  },
}
