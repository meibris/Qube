import { Button, buttonVariants } from "@/components/ui/button"
import { NotebookText } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { VariantProps } from "class-variance-authority"

type Props = {
    title: string
    description: string
    bannerBg?: string
    buttonVariant?: VariantProps<typeof buttonVariants>["variant"]
}

export const UnitBanner = ({
    title,
    description,
    bannerBg = "bg-green-500",
    buttonVariant = "secondary",
}: Props) => {
    return (
        <div className={cn("w-full rounded-xl p-5 text-white flex items-center justify-between", bannerBg)}>
            <div className="space-y-2.5">
                <h3 className="Text-2xl font-bold">
                    {title}
                </h3>
                {description && <p className="text-lg">{description}</p>}
            </div>
            <Link href="/lesson">
                <Button
                    size="lg"
                    variant={buttonVariant}
                    className="hidden lg:flex border-2 border-b-4 active:border-b-2" //change lg to xl? his is lg, but mine works with xl
                >
                    <NotebookText className="mr-2" />
                    Continue
                </Button>
            </Link>
        </div>
    )
}