"use client"

import { DevModeProvider } from "@/contexts/dev-mode"
import { DevToggle } from "@/components/dev-toggle"

export function LearnShell({ children }: { children: React.ReactNode }) {
    return (
        <DevModeProvider>
            {children}
            <DevToggle />
        </DevModeProvider>
    )
}
