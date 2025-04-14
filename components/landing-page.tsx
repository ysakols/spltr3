"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Logo } from "./logo"

export function LandingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate authentication
    setTimeout(() => {
      setIsLoading(false)
      router.push("/dashboard")
      toast({
        title: "Login successful",
        description: "Welcome back to Spltr3!",
      })
    }, 1500)
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate registration
    setTimeout(() => {
      setIsLoading(false)
      router.push("/dashboard")
      toast({
        title: "Registration successful",
        description: "Welcome to Spltr3!",
      })
    }, 1500)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Logo size="large" />
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row">
        <div className="flex-1 flex items-center justify-center p-6 md:p-10">
          <div className="max-w-md space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Split expenses with friends, without the awkwardness
              </h1>
              <p className="mt-4 text-muted-foreground">
                Spltr3 makes it easy to track shared expenses, settle debts, and maintain transparency in your group
                finances.
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-teal-500 rounded-2xl opacity-20 blur-xl"></div>
              <div className="relative bg-white dark:bg-gray-950 border rounded-xl shadow-lg p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Trip to Barcelona</h3>
                    <span className="text-sm text-gray-500">4 members</span>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span>Alex paid for Dinner</span>
                        </div>
                        <span className="font-medium">$120.00</span>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span>Jamie paid for Hotel</span>
                        </div>
                        <span className="font-medium">$350.00</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Your balance</span>
                      <span className="text-lg font-bold text-red-500">You owe $78.25</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-gray-50 dark:bg-gray-900">
          <div className="w-full max-w-md">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card>
                  <CardContent className="pt-6">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email-login">Email</Label>
                        <Input id="email-login" type="email" placeholder="name@example.com" required />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password-login">Password</Label>
                          <Button variant="link" className="p-0 h-auto text-xs">
                            Forgot password?
                          </Button>
                        </div>
                        <Input id="password-login" type="password" required />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="remember" />
                        <Label
                          htmlFor="remember"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Remember me
                        </Label>
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign in"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="register">
                <Card>
                  <CardContent className="pt-6">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="first-name">First name</Label>
                          <Input id="first-name" placeholder="John" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last-name">Last name</Label>
                          <Input id="last-name" placeholder="Doe" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-register">Email</Label>
                        <Input id="email-register" type="email" placeholder="name@example.com" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password-register">Password</Label>
                        <Input id="password-register" type="password" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm password</Label>
                        <Input id="confirm-password" type="password" required />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Creating account..." : "Create account"}
                      </Button>
                      <p className="text-xs text-gray-500 text-center">
                        By creating an account, you agree to our{" "}
                        <a href="/terms" className="text-green-600 hover:underline dark:text-green-400">
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="/privacy" className="text-green-600 hover:underline dark:text-green-400">
                          Privacy Policy
                        </a>
                        .
                      </p>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center text-xs text-gray-500">
              <p>
                <a href="/privacy" className="text-green-600 hover:underline dark:text-green-400">
                  Privacy Policy
                </a>
                {" • "}
                <a href="/terms" className="text-green-600 hover:underline dark:text-green-400">
                  Terms of Service
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
