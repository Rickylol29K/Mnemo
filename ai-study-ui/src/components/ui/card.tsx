import * as React from "react";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type H3Props = React.HTMLAttributes<HTMLHeadingElement>;

export const Card: React.FC<DivProps> = ({ className, ...props }) => (
  <div
    className={cn(
      "rounded-2xl border border-zinc-200 bg-white shadow-sm",
      className
    )}
    {...props}
  />
);

export const CardHeader: React.FC<DivProps> = ({ className, ...props }) => (
  <div className={cn("px-6 py-4 border-b", className)} {...props} />
);

export const CardTitle: React.FC<H3Props> = ({ className, ...props }) => (
  <h3 className={cn("text-lg font-semibold", className)} {...props} />
);

export const CardContent: React.FC<DivProps> = ({ className, ...props }) => (
  <div className={cn("p-6", className)} {...props} />
);

export const CardFooter: React.FC<DivProps> = ({ className, ...props }) => (
  <div className={cn("px-6 py-4 border-t", className)} {...props} />
);
