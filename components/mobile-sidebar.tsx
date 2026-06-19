import { Sidebar } from "@/components/sidebar"
import { Menu } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
    SheetHeader,
} from "@/components/ui/sheet"

export const MobileSidebar = () => {
  return (
    <Sheet>
      <SheetTrigger>
        <Menu className="text-white" />
      </SheetTrigger>
        <SheetContent className="p-0 z-[100]" side="left">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <Sidebar />
        </SheetContent>
    </Sheet>
  )
}
