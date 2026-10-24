import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-indigo-600/20 text-indigo-400 border-indigo-600/30",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-rose-500/20 text-rose-400 border-rose-500/30",
        profit: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        loss: "border-rose-500/30 bg-rose-500/10 text-rose-400",
        outline: "text-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
