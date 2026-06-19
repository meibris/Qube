"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

interface Props {
  selectedImage?: string
  bgColor?: string
  userImageSrc?: string
}

export function ProfileSidebarItem({ selectedImage, bgColor }: Props) {
  const pathname = usePathname()
  const active = pathname === "/profile"

  return (
    <Button
      variant={active ? "sidebarOutline" : "sidebar"}
      className="justify-start h-[52px] w-full"
      asChild
    >
      <Link href="/profile" className="flex items-center gap-x-3">
        <div
          className="w-8 h-8 aspect-square rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-white/50"
          style={{ backgroundColor: selectedImage ? (bgColor ?? "#e2e8f0") : "transparent" }}
        >
          {selectedImage ? (
            <Image
              src={selectedImage}
              alt="Profile"
              width={24}
              height={24}
              className="object-contain"
            />
          ) : null}
        </div>
        MY PROFILE
      </Link>
    </Button>
  )
}
