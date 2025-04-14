import { CurrencyPreferences } from "@/components/currency/currency-preferences"

export default function CurrencySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">currency settings</h2>
        <p className="text-muted-foreground">manage your currency preferences and display options.</p>
      </div>
      <CurrencyPreferences />
    </div>
  )
}
