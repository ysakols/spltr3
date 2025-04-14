"use client"

import { useState } from "react"
import { useCurrency } from "@/contexts/currency-context"
import { CurrencySelector } from "./currency-selector"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export function CurrencyPreferences() {
  const { userPreference, setUserPreference } = useCurrency()
  const { toast } = useToast()

  const [localPreference, setLocalPreference] = useState({ ...userPreference })

  const handleSave = () => {
    setUserPreference(localPreference)
    toast({
      title: "preferences saved",
      description: "your currency preferences have been updated",
      duration: 3000,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>currency preferences</CardTitle>
        <CardDescription>manage how currencies are displayed throughout the app</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="default-currency">default currency</Label>
          <CurrencySelector
            value={localPreference.defaultCurrency}
            onChange={(value) => setLocalPreference({ ...localPreference, defaultCurrency: value })}
            className="w-[300px]"
          />
          <p className="text-sm text-muted-foreground mt-1">
            this currency will be used for new expenses and as the default for summaries
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-original">show original currency</Label>
              <p className="text-sm text-muted-foreground">display amounts in their original currency</p>
            </div>
            <Switch
              id="show-original"
              checked={localPreference.showOriginalCurrency}
              onCheckedChange={(checked) => setLocalPreference({ ...localPreference, showOriginalCurrency: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-converted">show converted values</Label>
              <p className="text-sm text-muted-foreground">
                show converted values when hovering over amounts in different currencies
              </p>
            </div>
            <Switch
              id="show-converted"
              checked={localPreference.showConvertedValues}
              onCheckedChange={(checked) => setLocalPreference({ ...localPreference, showConvertedValues: checked })}
            />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          save preferences
        </Button>
      </CardContent>
    </Card>
  )
}
