"use client"

import { useState, useEffect } from "react"
import { useCurrency } from "@/contexts/currency-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CurrencyAmount } from "./currency-amount"
import { Skeleton } from "@/components/ui/skeleton"

interface CurrencySummaryItem {
  currency: string
  amount: number
}

interface CurrencySummaryProps {
  items: CurrencySummaryItem[]
  title: string
  emptyMessage?: string
}

export function CurrencySummary({ items, title, emptyMessage = "no data to display" }: CurrencySummaryProps) {
  const { userPreference, convertAmount } = useCurrency()
  const [isLoading, setIsLoading] = useState(true)
  const [convertedTotal, setConvertedTotal] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<"original" | "converted">("original")

  // Group items by currency
  const groupedByCurrency = items.reduce(
    (acc, item) => {
      if (!acc[item.currency]) {
        acc[item.currency] = 0
      }
      acc[item.currency] += item.amount
      return acc
    },
    {} as Record<string, number>,
  )

  // Convert all amounts to the user's default currency
  useEffect(() => {
    if (items.length === 0) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const convertPromises = Object.entries(groupedByCurrency).map(([currency, amount]) =>
      convertAmount(amount, currency, userPreference.defaultCurrency),
    )

    Promise.all(convertPromises)
      .then((convertedAmounts) => {
        const total = convertedAmounts.reduce((sum, amount) => sum + amount, 0)
        setConvertedTotal(total)
      })
      .catch((error) => {
        console.error("Failed to convert amounts:", error)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [items, userPreference.defaultCurrency])

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="original" onValueChange={(value) => setViewMode(value as "original" | "converted")}>
          <TabsList className="mb-4">
            <TabsTrigger value="original">original currencies</TabsTrigger>
            <TabsTrigger value="converted">converted to {userPreference.defaultCurrency}</TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="space-y-2">
            {Object.entries(groupedByCurrency).map(([currency, amount]) => (
              <div key={currency} className="flex justify-between items-center">
                <span>{currency}</span>
                <CurrencyAmount
                  amount={amount}
                  currency={currency}
                  showConverted={false}
                  isNegative={amount < 0}
                  isPositive={amount > 0}
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="converted" className="space-y-2">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex justify-between items-center">
                <span>total in {userPreference.defaultCurrency}</span>
                <span
                  className={
                    convertedTotal && convertedTotal < 0
                      ? "text-red-600"
                      : convertedTotal && convertedTotal > 0
                        ? "text-green-600"
                        : ""
                  }
                >
                  {convertedTotal !== null ? (
                    <CurrencyAmount
                      amount={convertedTotal}
                      currency={userPreference.defaultCurrency}
                      showConverted={false}
                      isNegative={convertedTotal < 0}
                      isPositive={convertedTotal > 0}
                    />
                  ) : (
                    "unable to convert"
                  )}
                </span>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
