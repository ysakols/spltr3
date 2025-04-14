"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { CalendarIcon, ChevronLeft, ChevronRight, Camera, Upload, X, Plus, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { Textarea } from "@/components/ui/textarea"
import { CurrencySelector } from "@/components/currency/currency-selector"
import { useCurrency } from "@/contexts/currency-context"
import { CurrencyAmount } from "@/components/currency/currency-amount"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

interface UnifiedExpenseFormProps {
  groupId?: string
  groupName?: string
  groupCurrency?: string
  isDialog?: boolean
  onComplete?: () => void
  onCancel?: () => void
}

export function UnifiedExpenseForm({
  groupId,
  groupName,
  groupCurrency,
  isDialog = false,
  onComplete,
  onCancel,
}: UnifiedExpenseFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [date, setDate] = useState<Date>(new Date())
  const [splitType, setSplitType] = useState("equal")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [selectedPayerId, setSelectedPayerId] = useState("1") // Default to "you"
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(groupId)
  const [groupError, setGroupError] = useState<string | null>(null)
  const [splitError, setSplitError] = useState<string | null>(null)
  const { toast } = useToast()
  const { userPreference, currencies } = useCurrency()

  // Use group currency if provided, otherwise use user's default
  const [selectedCurrency, setSelectedCurrency] = useState(groupCurrency || userPreference.defaultCurrency)

  // State for member splits
  const [memberPercentages, setMemberPercentages] = useState<Record<string, string>>({})
  const [memberExactAmounts, setMemberExactAmounts] = useState<Record<string, string>>({})

  const splitInitialized = useRef(false)

  // Mock data for groups - in a real app, this would be fetched from an API
  const groups = [
    { id: "1", name: "Roommates", currency: "USD" },
    { id: "2", name: "Trip to Barcelona", currency: "EUR" },
    { id: "3", name: "Office Lunch", currency: "USD" },
    { id: "4", name: "Game Night", currency: "USD" },
  ]

  // Update selected currency when group changes
  useEffect(() => {
    if (selectedGroupId) {
      const group = groups.find((g) => g.id === selectedGroupId)
      if (group) {
        setSelectedCurrency(group.currency)
      }
    }
  }, [selectedGroupId])

  // Mock data for members
  const members = [
    {
      id: "1",
      name: "you",
      avatar: "y",
    },
    {
      id: "2",
      name: "alex",
      avatar: "a",
    },
    {
      id: "3",
      name: "jamie",
      avatar: "j",
    },
    {
      id: "4",
      name: "sam",
      avatar: "s",
    },
  ]

  // Initialize member splits with equal values when amount or members change
  useEffect(() => {
    if (members.length > 0 && !splitInitialized.current) {
      const equalPercentage = (100 / members.length).toFixed(2)
      const equalAmount = amount ? (Number.parseFloat(amount) / members.length).toFixed(2) : "0.00"

      const newPercentages: Record<string, string> = {}
      const newExactAmounts: Record<string, string> = {}

      members.forEach((member) => {
        newPercentages[member.id] = equalPercentage
        newExactAmounts[member.id] = equalAmount
      })

      setMemberPercentages(newPercentages)
      setMemberExactAmounts(newExactAmounts)
      splitInitialized.current = true
    }
  }, [members, amount])

  // Update exact amounts when amount changes (only if already initialized)
  useEffect(() => {
    if (splitInitialized.current && amount && splitType === "equal") {
      const equalAmount = (Number.parseFloat(amount) / members.length).toFixed(2)
      const newExactAmounts: Record<string, string> = {}

      members.forEach((member) => {
        newExactAmounts[member.id] = equalAmount
      })

      setMemberExactAmounts(newExactAmounts)
    }
  }, [amount, members.length, splitType])

  // Validate splits before proceeding to next step
  const validateSplits = (): boolean => {
    if (splitType === "equal") {
      return true
    }

    if (splitType === "percent") {
      const totalPercent = Object.values(memberPercentages).reduce((sum, value) => sum + Number(value || 0), 0)

      if (Math.abs(totalPercent - 100) > 0.01) {
        setSplitError(`Percentages must add up to 100%. Current total: ${totalPercent.toFixed(2)}%`)
        return false
      }
    }

    if (splitType === "exact") {
      const totalExact = Object.values(memberExactAmounts).reduce((sum, value) => sum + Number(value || 0), 0)
      const expenseAmount = Number.parseFloat(amount || "0")

      if (Math.abs(totalExact - expenseAmount) > 0.01) {
        setSplitError(`Amounts must add up to ${expenseAmount.toFixed(2)}. Current total: ${totalExact.toFixed(2)}`)
        return false
      }
    }

    setSplitError(null)
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate that a group is selected
    if (!selectedGroupId) {
      setGroupError("Please select a group for this expense")
      return
    }

    // Validate splits
    if (!validateSplits()) {
      return
    }

    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)

      toast({
        title: "Expense added",
        description: "Your expense has been added successfully",
        duration: 3000,
      })

      if (onComplete) {
        onComplete()
      } else {
        router.push("/dashboard/expenses")
      }
    }, 1000)
  }

  const handleSplitEqually = () => {
    // Calculate equal splits for all members
    const equalPercentage = (100 / members.length).toFixed(2)
    const equalAmount = amount ? (Number.parseFloat(amount) / members.length).toFixed(2) : "0.00"

    const newPercentages: Record<string, string> = {}
    const newExactAmounts: Record<string, string> = {}

    members.forEach((member) => {
      newPercentages[member.id] = equalPercentage
      newExactAmounts[member.id] = equalAmount
    })

    setMemberPercentages(newPercentages)
    setMemberExactAmounts(newExactAmounts)
    setSplitError(null)

    toast({
      title: "Split equally",
      description: `Split equally among ${members.length} members`,
      duration: 3000,
    })
  }

  const handlePercentageChange = (memberId: string, value: string) => {
    setMemberPercentages((prev) => ({
      ...prev,
      [memberId]: value,
    }))
    // Clear error when user starts making changes
    setSplitError(null)
  }

  const handleExactAmountChange = (memberId: string, value: string) => {
    setMemberExactAmounts((prev) => ({
      ...prev,
      [memberId]: value,
    }))
    // Clear error when user starts making changes
    setSplitError(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setReceiptImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeReceiptImage = () => {
    setReceiptImage(null)
  }

  const nextStep = () => {
    // Validate group selection before proceeding
    if (step === 1 && !selectedGroupId) {
      setGroupError("Please select a group for this expense")
      return
    } else {
      setGroupError(null)
    }

    // Validate splits before proceeding from step 2
    if (step === 2 && !validateSplits()) {
      return
    }

    setStep(step + 1)
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  const handleGroupChange = (value: string) => {
    if (value === "new") {
      // Redirect to groups page to create a new group
      router.push("/dashboard/groups")
    } else {
      setSelectedGroupId(value)
      setGroupError(null)

      // Update currency based on selected group
      const group = groups.find((g) => g.id === value)
      if (group) {
        setSelectedCurrency(group.currency)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium">
          {step === 1 && "Basic Details"}
          {step === 2 && "Split Options"}
          {step === 3 && "Review & Save"}
        </h2>
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                s === step ? "bg-primary" : s < step ? "bg-primary-300" : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      {/* Show currency warning if group has a different currency */}
      {groupCurrency && selectedCurrency !== groupCurrency && (
        <Alert variant="warning" className="mb-4">
          <AlertDescription>
            This group uses {currencies[groupCurrency]?.name || groupCurrency} ({groupCurrency}). Changing the currency
            may affect calculations within the group.
          </AlertDescription>
        </Alert>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {step === 1 && (
            <div className="space-y-4">
              <div className="form-group">
                <Label htmlFor="group" className="text-sm font-medium">
                  Which group is this expense for? <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedGroupId} onValueChange={handleGroupChange}>
                  <SelectTrigger className="h-12 w-full">
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center gap-2">
                          <span>{group.name}</span>
                          <span className="text-xs text-muted-foreground">({group.currency})</span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="new" className="text-primary">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        <span>Create new group</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {groupError && <p className="text-sm text-red-500 mt-1">{groupError}</p>}
              </div>

              <div className="form-group">
                <Label htmlFor="description" className="text-sm font-medium">
                  What's this expense for?
                </Label>
                <Input
                  id="description"
                  placeholder="e.g., Dinner, Groceries, Rent"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-12"
                  required
                />
              </div>

              <div className="form-group">
                <Label htmlFor="amount" className="text-sm font-medium">
                  How much was it?
                </Label>
                <div className="flex items-center gap-2">
                  <CurrencySelector
                    value={selectedCurrency}
                    onChange={setSelectedCurrency}
                    triggerClassName="w-24 h-12"
                    className="w-[200px]"
                  />
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500">{currencies[selectedCurrency]?.symbol || selectedCurrency}</span>
                    </div>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-12 text-lg pl-8"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <Label className="text-sm font-medium">When was it?</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal h-12 w-full",
                          !date && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "MMM d, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={date} onSelect={(date) => date && setDate(date)} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="form-group">
                  <Label htmlFor="payer" className="text-sm font-medium">
                    Who paid?
                  </Label>
                  <Select value={selectedPayerId} onValueChange={setSelectedPayerId}>
                    <SelectTrigger className="h-12 w-full">
                      <SelectValue placeholder="Select payer" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback>{member.avatar}</AvatarFallback>
                            </Avatar>
                            <span>{member.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="form-group">
                <Label className="text-sm font-medium">Add a receipt (optional)</Label>
                {receiptImage ? (
                  <div className="relative mt-2">
                    <img
                      src={receiptImage || "/placeholder.svg"}
                      alt="Receipt"
                      className="max-h-48 rounded-md object-contain mx-auto border border-border p-2"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={removeReceiptImage}
                      aria-label="Remove receipt image"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant="outline"
                      className="h-12 justify-start"
                      type="button"
                      onClick={() => document.getElementById("receipt-upload")?.click()}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Take Photo
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 justify-start"
                      type="button"
                      onClick={() => document.getElementById("receipt-upload")?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                    <input
                      id="receipt-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={onCancel || (() => router.back())}>
                  Cancel
                </Button>
                <Button onClick={nextStep} disabled={!description || !amount}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="form-group">
                <Label className="text-sm font-medium">How do you want to split this expense?</Label>
                <Tabs defaultValue="equal" onValueChange={setSplitType} className="mt-2">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="equal">Equal</TabsTrigger>
                    <TabsTrigger value="percent">Percent</TabsTrigger>
                    <TabsTrigger value="exact">Exact</TabsTrigger>
                  </TabsList>

                  {/* Equal split tab */}
                  <TabsContent value="equal" className="pt-4">
                    <p className="text-sm text-muted-foreground mb-4">Everyone pays the same amount</p>
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{member.avatar}</AvatarFallback>
                            </Avatar>
                            <span>{member.name}</span>
                          </div>
                          <div className="flex items-center">
                            <CurrencyAmount
                              amount={amount ? Number.parseFloat(amount) / members.length : 0}
                              currency={selectedCurrency}
                              className="text-sm font-medium"
                            />
                            <span className="text-xs text-muted-foreground ml-2">(25%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Percentage split tab */}
                  <TabsContent value="percent" className="pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-muted-foreground">Split by percentage</p>
                      <Button type="button" variant="outline" size="sm" onClick={handleSplitEqually}>
                        Reset to Equal
                      </Button>
                    </div>

                    {/* Percentage validation summary */}
                    <div
                      className={cn(
                        "mb-4 p-3 rounded-md text-sm flex items-center gap-2",
                        Math.abs(
                          Object.values(memberPercentages).reduce((sum, value) => sum + Number(value || 0), 0) - 100,
                        ) <= 0.01
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200",
                      )}
                    >
                      {Math.abs(
                        Object.values(memberPercentages).reduce((sum, value) => sum + Number(value || 0), 0) - 100,
                      ) <= 0.01 ? (
                        "✓ Percentages add up to 100%"
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4" /> Total:{" "}
                          {Object.values(memberPercentages)
                            .reduce((sum, value) => sum + Number(value || 0), 0)
                            .toFixed(2)}
                          % (should be 100%)
                        </>
                      )}
                    </div>

                    <div className="space-y-2">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{member.avatar}</AvatarFallback>
                            </Avatar>
                            <span>{member.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              className="w-20 h-8"
                              value={memberPercentages[member.id] || "0"}
                              onChange={(e) => handlePercentageChange(member.id, e.target.value)}
                              min="0"
                              max="100"
                              step="0.01"
                            />
                            <span>%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Exact amount split tab */}
                  <TabsContent value="exact" className="pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-muted-foreground">Split by exact amounts</p>
                      <Button type="button" variant="outline" size="sm" onClick={handleSplitEqually}>
                        Reset to Equal
                      </Button>
                    </div>

                    {/* Exact amount validation summary */}
                    <div
                      className={cn(
                        "mb-4 p-3 rounded-md text-sm flex items-center gap-2",
                        Math.abs(
                          Object.values(memberExactAmounts).reduce((sum, value) => sum + Number(value || 0), 0) -
                            Number.parseFloat(amount || "0"),
                        ) <= 0.01
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200",
                      )}
                    >
                      {Math.abs(
                        Object.values(memberExactAmounts).reduce((sum, value) => sum + Number(value || 0), 0) -
                          Number.parseFloat(amount || "0"),
                      ) <= 0.01 ? (
                        "✓ Amounts add up to the total"
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4" /> Total:{" "}
                          {Object.values(memberExactAmounts)
                            .reduce((sum, value) => sum + Number(value || 0), 0)
                            .toFixed(2)}{" "}
                          (should be {Number.parseFloat(amount || "0").toFixed(2)})
                        </>
                      )}
                    </div>

                    <div className="space-y-2">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{member.avatar}</AvatarFallback>
                            </Avatar>
                            <span>{member.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{currencies[selectedCurrency]?.symbol || selectedCurrency}</span>
                            <Input
                              type="number"
                              className="w-24 h-8"
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              value={memberExactAmounts[member.id] || "0"}
                              onChange={(e) => handleExactAmountChange(member.id, e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Display validation error if any */}
                {splitError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{splitError}</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="form-group">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Add notes (optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add any details about this expense"
                  className="resize-none"
                  rows={3}
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={prevStep}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={nextStep}>
                  Review
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">{description}</h3>
                      <CurrencyAmount
                        amount={Number.parseFloat(amount || "0")}
                        currency={selectedCurrency}
                        className="text-lg font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Paid by</p>
                        <p className="font-medium">{members.find((m) => m.id === selectedPayerId)?.name || "You"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date</p>
                        <p className="font-medium">{format(date, "MMM d, yyyy")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Split method</p>
                        <p className="font-medium capitalize">{splitType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Group</p>
                        <p className="font-medium">
                          {groups.find((g) => g.id === selectedGroupId)?.name || "Not specified"}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-2">Split summary</p>
                      <div className="space-y-1">
                        {members.map((member) => {
                          let memberAmount = 0

                          if (splitType === "equal") {
                            memberAmount = Number.parseFloat(amount || "0") / members.length
                          } else if (splitType === "percent") {
                            const percentage = Number.parseFloat(memberPercentages[member.id] || "0")
                            memberAmount = (Number.parseFloat(amount || "0") * percentage) / 100
                          } else if (splitType === "exact") {
                            memberAmount = Number.parseFloat(memberExactAmounts[member.id] || "0")
                          }

                          return (
                            <div key={member.id} className="flex justify-between text-sm">
                              <span>{member.name}</span>
                              <CurrencyAmount amount={memberAmount} currency={selectedCurrency} />
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {receiptImage && (
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium mb-2">Receipt</p>
                        <img
                          src={receiptImage || "/placeholder.svg"}
                          alt="Receipt"
                          className="h-20 rounded-md object-contain"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={prevStep}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Expense"}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
