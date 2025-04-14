import { DialogHeader as ShadcnDialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface DialogHeaderProps {
  title: string
  description?: string
}

export function DialogHeader({ title, description }: DialogHeaderProps) {
  return (
    <ShadcnDialogHeader>
      <DialogTitle className="text-lg font-medium">{title}</DialogTitle>
      {description && <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>}
    </ShadcnDialogHeader>
  )
}
