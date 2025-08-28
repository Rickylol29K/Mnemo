import * as React from "react";

const cn = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-xl font-medium transition " +
      "active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed " +
      "focus-visible:focus-ring";
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary: "bg-black text-white hover:brightness-95",
      secondary: "border border-zinc-300 bg-white hover:bg-zinc-50",
      ghost: "hover:bg-zinc-100",
    };
    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
