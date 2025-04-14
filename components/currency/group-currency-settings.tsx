"use client"

import { useState } from "react"
import { useCurrency } from "@/contexts/currency-context"
import { CurrencySelector } from "./currency-selector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

interface GroupCurrencySettingsProps {
  groupId: string
  initialCurrency: string
  onSave: (currency: string) => void
  hasExistingExpenses?: boolean
}

export function GroupCurrencySettings({
  groupId,
  initialCurrency,
  onSave,
  hasExistingExpenses = false,
}: GroupCurrencySettingsProps) {
  const { currencies, userPreference } = useCurrency()
  const { toast } = useToast()

  const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency || userPreference.defaultCurrency)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = () => {
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      onSave(selectedCurrency)
      setIsLoading(false)

      toast({
        title: "group currency updated",
        description: `the group currency has been set to ${currencies[selectedCurrency]?.name || selectedCurrency}`,
        duration: 3000,
      })
    }, 1000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>group currency</CardTitle>
        <CardDescription>set the currency used for all expenses in this group</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasExistingExpenses && (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              this group already has expenses. changing the currency will not automatically convert existing expense
              amounts.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="group-currency">currency</Label>
          <CurrencySelector value={selectedCurrency} onChange={setSelectedCurrency} className="w-[300px]" />
          <p className="text-sm text-muted-foreground mt-1">all expenses in this group will use this currency</p>
        </div>

        <Button onClick={handleSave} disabled={isLoading || selectedCurrency === initialCurrency}>
          {isLoading ? "saving..." : "save currency setting"}
        </Button>
      </CardContent>
    </Card>
  )
}
