import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wide",
  {
    variants: {
      variant: {
        locked: "bg-neutral-200 text-primary-foreground hover:bg-neutral-200/90 border-neutral-400 border-b-4 active:border-b-0",
        default: "bg-white text-black border-slate-200 border-2 border-b-[4px] active:border-b-2 hover:bg-slate-100 text-slate-500",
        defaultOutline: "bg-transparent text-slate-500 border-transparent border-0 hover:bg-slate-100",
        primary: "bg-sky-400 text-primary-foreground hover:bg-sky-400/90 border-sky-500 border-b-4 active:border-b-0",
        primaryOutline:"bg-white text-sky-500 hover:bg-slate-100",
        secondary: "bg-green-500 text-primary-foreground hover:bg-green-500/90 border-green-600 border-b-4 active:border-b-0",
        secondaryOutline:"bg-white text-green-500 hover:bg-slate-100",
        blue: "bg-blue-500 text-primary-foreground hover:bg-blue-500/90 border-blue-600 border-b-4 active:border-b-0",
        blueOutline: "bg-white text-blue-500 hover:bg-slate-100",
        red: "bg-red-500 text-primary-foreground hover:bg-red-500/90 border-red-600 border-b-4 active:border-b-0",
        redOutline: "bg-white text-red-500 hover:bg-slate-100",
        orange: "bg-orange-500 text-primary-foreground hover:bg-orange-500/90 border-orange-600 border-b-4 active:border-b-0",
        orangeOutline: "bg-white text-orange-500 hover:bg-slate-100",
        purple: "bg-purple-500 text-primary-foreground hover:bg-purple-500/90 border-purple-600 border-b-4 active:border-b-0",
        purpleOutline: "bg-white text-purple-500 hover:bg-slate-100",
        danger: "bg-rose-500 text-primary-foreground hover:bg-rose-500/90 border-rose-600 border-b-4 active:border-b-0",
        dangerOutline:"bg-white text-rose-500 hover:bg-slate-100",
        super: "bg-indigo-500 text-primary-foreground hover:bg-indigo-500/90 border-indigo-600 border-b-4 active:border-b-0",
        superOutline:"bg-white text-indigo-500 hover:bg-slate-100",
        sidebar: "bg-transparent text-slate-500 border-2 border-transparent hover:bg-slate-100 transition-none",
        sidebarOutline: "bg-sky-500/15 text-sky-500 border-sky-300 border-2 hover:bg-sky-500/20 transition-none"
      },
      size: {
        default: "h-11 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 px-6 has-[>svg]:px-4",
        icon: "h-10 w-10",
        rounded: "rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
