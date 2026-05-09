import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-[transform,background-color,border-color,box-shadow,color] disabled:pointer-events-none disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,103,216,0.28)]", {
  variants: {
    variant: {
      default: "border border-[rgba(30,18,11,0.5)] bg-[var(--text)] text-[#fff8ef] hover:bg-[#34251b]",
      secondary: "border border-[var(--line)] bg-[rgba(255,255,255,0.68)] text-[var(--text)] hover:bg-[rgba(255,255,255,0.98)]",
      ghost: "border border-transparent bg-[rgba(143,118,83,0.08)] text-[var(--muted)] hover:bg-[rgba(143,118,83,0.14)]",
      outline: "border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--text)] hover:bg-[rgba(255,255,255,0.98)]"
    },
    size: {
      default: "h-9 px-3 py-2",
      sm: "h-8 rounded-md px-2.5",
      lg: "h-10 px-4",
      icon: "h-9 w-9"
    }
  },
  defaultVariants: {
    variant: "outline",
    size: "default"
  }
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
