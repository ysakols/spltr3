import Link from "next/link"
import { Logo } from "@/components/logo"

export function Footer() {
  return (
    <footer className="w-full border-t py-6 md:py-8">
      <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
        <Logo />
        <nav className="flex gap-4 md:gap-6">
          <Link href="/privacy" className="text-sm hover:underline">
            privacy
          </Link>
          <Link href="/terms" className="text-sm hover:underline">
            terms
          </Link>
          <Link href="#" className="text-sm hover:underline">
            contact
          </Link>
        </nav>
        <div className="flex-1 text-center md:text-right text-sm text-muted-foreground">
          © 2023 spltr3. all rights reserved.
        </div>
      </div>
    </footer>
  )
}
