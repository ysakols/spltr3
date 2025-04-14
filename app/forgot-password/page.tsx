import { ForgotPasswordForm } from "@/components/forgot-password-form"
import Link from "next/link"

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold">s</div>
          <span className="text-xl">spltr3</span>
        </Link>
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl">reset your password</h1>
            <p className="text-muted-foreground">
              enter your email address and we'll send you a link to reset your password
            </p>
          </div>
          <ForgotPasswordForm />
          <div className="text-center text-sm">
            remember your password?{" "}
            <Link href="/login" className="text-primary hover:underline">
              sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
