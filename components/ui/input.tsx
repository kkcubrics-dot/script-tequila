import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn("flex h-10 w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[rgba(255,252,247,0.9)] px-3 py-2 text-sm text-[var(--text)] transition-[border-color,box-shadow,background-color] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(47,103,216,0.16)] focus-visible:border-[rgba(47,103,216,0.44)] disabled:cursor-not-allowed disabled:opacity-60", className)}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
