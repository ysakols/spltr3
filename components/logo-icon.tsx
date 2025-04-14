import Image from "next/image"

interface LogoIconProps {
  size?: number
  className?: string
}

export function LogoIcon({ size = 32, className = "" }: LogoIconProps) {
  return (
    <div className={`relative ${className}`}>
      <Image
        src="/images/spltr3-logo-new.png"
        alt="spltr3 logo"
        width={size}
        height={size}
        className="object-contain"
      />
    </div>
  )
}
