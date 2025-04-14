import { LoginForm } from "@/components/login-form"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold">s</div>
          <span className="text-xl">spltr3</span>
        </Link>
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl">welcome back</h1>
            <p className="text-muted-foreground">enter your credentials to access your account</p>
          </div>
          <LoginForm />
          <div className="text-center text-sm">
            don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
