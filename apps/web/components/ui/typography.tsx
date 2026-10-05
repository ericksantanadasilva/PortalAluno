import * as React from "react"
import { cn } from "@/lib/utils"

export function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
    return (
        <h1
            className={cn("text-3xl font-semibold tracking-tight text-foreground", className)}
            {...props}
        />
    )
}

export function SectionTitle({ className, ...props }: React.ComponentProps<"h2">) {
    return (
        <h2
            className={cn("text-xl font-semibold text-foreground", className)}
            {...props}
        />
    )
}

export function BlockTitle({ className, ...props }: React.ComponentProps<"h3">) {
    return (
        <h3
            className={cn("text-lg font-semibold text-foreground", className)}
            {...props}
        />
    )
}

export function SmallLabel({ className, ...props }: React.ComponentProps<"h3">) {
    return (
        <h3
            className={cn(
                "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                className
            )}
            {...props}
        />
    )
}