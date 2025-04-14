"use client"

import { useCurrency } from "@/contexts/currency-context"
import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CurrencyAmountProps {
  amount: number
  currency: string
  showConverted?: boolean
  className?: string
  isNegative?: boolean
  isPositive?: boolean
}

export function CurrencyAmount({
  amount,
  currency,
  showConverted = true,
  className = "",
  isNegative = false,
  isPositive = false,
}: CurrencyAmountProps) {
  const { userPreference, convertAmount, formatAmount, isLoading } = useCurrency()
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [conversionError, setConversionError] = useState(false)

  // Determine if we need to show the converted amount
  const shouldShowConverted =
    showConverted && userPreference.showConvertedValues && currency !== userPreference.defaultCurrency

  useEffect(() => {
    if (shouldShowConverted) {
      setIsConverting(true)
      setConversionError(false)

      convertAmount(amount, currency)
        .then((converted) => {
          setConvertedAmount(converted)
        })
        .catch((error) => {
          console.error("Error converting currency:", error)
          setConversionError(true)
          setConvertedAmount(amount) // Use original amount as fallback
        })
        .finally(() => {
          setIsConverting(false)
        })
    }
  }, [amount, currency, userPreference.defaultCurrency, shouldShowConverted, convertAmount])

  // Apply sign based on props
  const signedAmount = isNegative ? -Math.abs(amount) : isPositive ? Math.abs(amount) : amount

  // Determine text color based on sign
  const textColorClass = isNegative ? "text-red-600" : isPositive ? "text-green-600" : ""

  // Format the original amount
  const formattedOriginal = formatAmount(signedAmount, currency)

  if (isLoading || isConverting) {
    return <Skeleton className="h-4 w-24" />
  }

  if (shouldShowConverted && convertedAmount !== null && !conversionError) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`${textColorClass} ${className}`}>{formattedOriginal}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {formatAmount(
                isNegative ? -Math.abs(convertedAmount) : isPositive ? Math.abs(convertedAmount) : convertedAmount,
                userPreference.defaultCurrency,
              )}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return <span className={`${textColorClass} ${className}`}>{formattedOriginal}</span>
}
