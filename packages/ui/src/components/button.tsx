import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

/**
 * Button variants following DESIGN.md
 * - Primary: Neon button with slide animation
 * - Secondary: Dark button
 * - Solid: Neon solid for highlights
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        primary: // Neon button with slide animation
          "neon-btn border border-charcoal text-charcoal hover:text-charcoal hover:border-neon transition-all",
        secondary: // Dark button
          "bg-charcoal text-white hover:bg-charcoalLight transition-colors",
        solid: // Neon solid button
          "bg-neon text-charcoal hover:bg-neonDim transition-colors",
        ghost: "bg-transparent text-charcoal hover:bg-neonGhost transition-colors",
        outline: "border border-borderMain text-charcoal hover:border-charcoal transition-colors",
      },
      size: {
        default: "px-6 py-3",
        sm: "px-4 py-2 text-xs",
        lg: "px-8 py-4 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * Primary Button Component
 *
 * Uses a slide animation for neon button variant.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

/* Button Styles - Neon animation */
import "./button.css";

export { Button, buttonVariants };
