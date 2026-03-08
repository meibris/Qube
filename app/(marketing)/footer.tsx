import { Button } from "@/components/ui/button"
import Image from "next/image"

export const Footer = () => {
    return (
        <footer className="hidden lg:block h-20 w-full border-t-2 border-slate-200 p-2">
          <div className="max-w-screen-lg mx-auto flex items-center justify-evenly h-full">
            <Button size="lg" variant="defaultOutline" className="w-full">
              <Image 
                src="/es.svg" 
                alt="Spanish" 
                height={32} 
                width={40}
                className="mr-4 rounded-md"
              />
              Spanish
            </Button>
            <Button size="lg" variant="defaultOutline" className="w-full">
              <Image 
                src="/cn.svg" //change this for the real thing!
                alt="China" 
                height={32} 
                width={40}
                className="mr-4 rounded-md"
              />
              China
            </Button>
            <Button size="lg" variant="defaultOutline" className="w-full">
              <Image 
                src="/kr.svg" //change this for the real thing!
                alt="Korean" 
                height={32} 
                width={40}
                className="mr-4 rounded-md"
              />
              Korean
            </Button>
            <Button size="lg" variant="defaultOutline" className="w-full">
              <Image 
                src="/it.svg" //change this for the real thing!
                alt="Italian" 
                height={32} 
                width={40}
                className="mr-4 rounded-md"
              />
              Italian
            </Button>
          </div>
        </footer>
    )
}