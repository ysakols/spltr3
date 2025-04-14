import { type LucideIcon, UserIcon } from "lucide-react"

interface UserProps {
  icon?: LucideIcon
}

export function User({ icon: Icon = UserIcon }: UserProps) {
  return <Icon className="h-4 w-4" />
}
