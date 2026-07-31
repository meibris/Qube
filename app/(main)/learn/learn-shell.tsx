"use client"

import { DevModeProvider } from "@/contexts/dev-mode"

export function LearnShell({ children }: { children: React.ReactNode }) {
    return (
        <DevModeProvider>
            {children}
        </DevModeProvider>
    )
}
