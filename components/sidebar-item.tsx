"use client" //server component vs client compounents
// the error: You're importing a component that needs `usePathname`. This React hook only works in a client component. To fix, mark the file (or its parent) with the `"use client"` directive.
// u can read more here: nextjs.org/docs/messages/react-client-hook-in-server-component
// or nextjs.org/docs/app/api-references/components
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

 //this is a boundry so i can work normally

type Props = {
    label: string
    iconSrc: string
    href: string
}

export const SidebarItem = ({
    label,
    iconSrc,
    href,
}: Props) => {
    const pathname = usePathname()
    const active = pathname === href

    return (
        <Button
            variant = {active ? "sidebarOutline"  : "sidebar"}
            className = "justify-start h-[52px]"
            asChild
        >
            <Link href={href}>
                <Image 
                    src={iconSrc}
                    alt={label}
                    className="mr-5"
                    height={32}
                    width={32}
                />
                {label}
            </Link>
        </Button>
    )
}