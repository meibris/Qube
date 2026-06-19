import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const Promo = () => {
    return (
        <div className="border-2 rounded-xl p-4 space-y-4">
            <div className="space-y-2">
                <div className="flex items center gap-x-2">
                    <Image
                        src="/QubeSymbolTemp.svg" //this is a placeholder!
                        alt="placeholder" //TOOD: change this
                        height={26}
                        width={26}
                    />
                    <h3 className="font-bold text-lg">
                        Learn more - Khan Academy {/* ? TODO: change this too :l  */}
                    </h3>
                </div>
                <p className="text-muted-foreground">
                    Find videos, articles, and practice questions to advance your knowledge
                </p>
            </div>
            <Button 
                asChild
                variant="super"
                className="w-full"
                size="lg"
            >
                <Link href="https://www.khanacademy.org/college-careers-more/financial-literacy">
                    Learn more{/* ? */}
                </Link>
            </Button>
        </div>
    )
}