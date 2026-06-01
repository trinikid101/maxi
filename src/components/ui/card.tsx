import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface/70 shadow-sm backdrop-blur-md",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  title,
  subtitle,
  icon,
  action,
}: {
  className?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 p-5 pb-3", className)}>
      <div className="flex items-center gap-3">
        {icon ? (
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-accent">
            {icon}
          </div>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {subtitle ? (
            <p className="text-xs text-muted">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}
