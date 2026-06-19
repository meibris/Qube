"use client"

import { createContext, useContext, useEffect, useState } from "react"

const DevModeContext = createContext(false)

export function DevModeProvider({ children }: { children: React.ReactNode }) {
    const [devMode, setDevMode] = useState(false)

    useEffect(() => {
        setDevMode(localStorage.getItem("devMode") === "true")
    }, [])

    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === "devMode") setDevMode(e.newValue === "true")
        }
        window.addEventListener("storage", handler)
        return () => window.removeEventListener("storage", handler)
    }, [])

    return (
        <DevModeContext.Provider value={devMode}>
            {children}
        </DevModeContext.Provider>
    )
}

export function useDevMode() {
    return useContext(DevModeContext)
}

export function toggleDevMode() {
    const next = localStorage.getItem("devMode") !== "true"
    localStorage.setItem("devMode", String(next))
    window.dispatchEvent(new StorageEvent("storage", { key: "devMode", newValue: String(next) }))
    return next
}
