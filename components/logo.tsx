import Image from "next/image"
import Link from "next/link"

interface LogoProps {
  size?: "small" | "default" | "large"
  asChild?: boolean
  href?: string
}

export function Logo({ size = "default", asChild = false, href = "/" }: LogoProps) {
  const sizeMap = {
    small: { width: 24, height: 24, textClass: "text-sm" },
    default: { width: 32, height: 32, textClass: "text-base" },
    large: { width: 40, height: 40, textClass: "text-xl" },
  }

  const { width, height, textClass } = sizeMap[size]

  const LogoContent = (
    <>
      <div className="relative">
        <Image
          src="/images/spltr3-logo-new.png"
          alt="spltr3 logo"
          width={width}
          height={height}
          className="object-contain"
        />
      </div>
      <span className={`font-medium ${textClass}`}>spltr3</span>
    </>
  )

  if (asChild) {
    return LogoContent
  }

  return (
    <Link href={href} className="flex items-center gap-2">
      {LogoContent}
    </Link>
  )
}
