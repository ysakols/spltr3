"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { type Currency, type CurrencyPreference, commonCurrencies } from "@/types/currency"
import { currencyService } from "@/services/currency-service"

interface CurrencyContextType {
  currencies: Record<string, Currency>
  userPreference: CurrencyPreference
  setUserPreference: (pref: CurrencyPreference) => void
  convertAmount: (amount: number, fromCurrency: string, toCurrency?: string) => Promise<number>
  formatAmount: (amount: number, currency: string) => string
  isLoading: boolean
}

const defaultPreference: CurrencyPreference = {
  defaultCurrency: "USD",
  showOriginalCurrency: true,
  showConvertedValues: true,
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencies, setCurrencies] = useState<Record<string, Currency>>(commonCurrencies)
  const [userPreference, setUserPreference] = useState<CurrencyPreference>(defaultPreference)
  const [isLoading, setIsLoading] = useState(false)

  // Load user preferences from localStorage on mount
  useEffect(() => {
    const savedPreference = localStorage.getItem("currencyPreference")
    if (savedPreference) {
      try {
        const parsed = JSON.parse(savedPreference)
        setUserPreference(parsed)
      } catch (e) {
        console.error("Failed to parse saved currency preference", e)
      }
    }
  }, [])

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem("currencyPreference", JSON.stringify(userPreference))
  }, [userPreference])

  // Convert an amount from one currency to another (or to default if not specified)
  const convertAmount = async (amount: number, fromCurrency: string, toCurrency?: string): Promise<number> => {
    const targetCurrency = toCurrency || userPreference.defaultCurrency

    if (fromCurrency === targetCurrency) return amount

    setIsLoading(true)
    try {
      // Add a safety check to handle cases where the currency service might fail
      const converted = await currencyService.convertAmount(amount, fromCurrency, targetCurrency).catch((error) => {
        console.error("Currency conversion failed:", error)
        // Return the original amount if conversion fails
        return amount
      })

      return converted
    } catch (error) {
      console.error("Currency conversion failed:", error)
      return amount // Return original amount if conversion fails
    } finally {
      setIsLoading(false)
    }
  }

  // Format an amount with its currency symbol
  const formatAmount = (amount: number, currencyCode: string): string => {
    const currency = currencies[currencyCode]
    if (!currency) return `${amount.toFixed(2)} ${currencyCode}`

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: currency.decimalDigits,
      maximumFractionDigits: currency.decimalDigits,
    }).format(amount)
  }

  const value = {
    currencies,
    userPreference,
    setUserPreference,
    convertAmount,
    formatAmount,
    isLoading,
  }

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider")
  }
  return context
}
