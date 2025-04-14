"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { type Currency, commonCurrencies } from "@/types/currency"

interface CurrencySelectorProps {
  value: string
  onChange: (value: string) => void
  currencies?: Record<string, Currency>
  className?: string
  triggerClassName?: string
}

export function CurrencySelector({
  value,
  onChange,
  currencies = commonCurrencies,
  className,
  triggerClassName,
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false)
  const [currencyList, setCurrencyList] = useState<Currency[]>([])

  useEffect(() => {
    setCurrencyList(Object.values(currencies))
  }, [currencies])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", triggerClassName)}
        >
          <div className="flex items-center">
            {value && currencies[value] ? (
              <>
                <span className="mr-1">{currencies[value].flag}</span>
                <span>{currencies[value].code}</span>
              </>
            ) : (
              "select currency"
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", className)}>
        <Command>
          <CommandInput placeholder="search currency..." />
          <CommandList>
            <CommandEmpty>no currency found</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {currencyList.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={currency.code}
                  onSelect={(currentValue) => {
                    onChange(currentValue)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === currency.code ? "opacity-100" : "opacity-0")} />
                  <span className="mr-2">{currency.flag}</span>
                  <span className="mr-2">{currency.code}</span>
                  <span className="text-muted-foreground">{currency.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
