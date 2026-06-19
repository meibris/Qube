import { 
    ClerkLoaded, 
    ClerkLoading, 
    SignedIn,
    SignedOut,
    SignInButton,
    UserButton,
} from "@clerk/nextjs"
import { Loader } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export const Header = () => {
    return (
        <header className="h-20 w-full border-b-2 border-slate-200 px-4">
          <div className="lg:max-w-screen-lg mx-auto flex items-center justify-between h-full"> 
            <div className="pt-8 pl-4 pb-7 flex items-center gap-x-3">
              <Image src="/QubeSymbolTemp.svg" height={40} width={40} alt="Logo" />
              <h1 className="text-2xl font-extrabold text-blue-500 tracking-wide">
                Qube
              </h1>
            </div>
            <ClerkLoading>
              <Loader className="h-5 w-5 text-muted-foreground animate-spin" /> 
            </ClerkLoading> 
            <ClerkLoaded>
              <SignedIn>
                <UserButton 
                  afterSignOutUrl="/"
                />
               </SignedIn>
              <SignedOut> 
                <SignInButton
                  mode="modal"
                  forceRedirectUrl="/classroom"
                >
                  <Button size="lg" variant="defaultOutline">
                    Login
                  </Button>
                </SignInButton>
              </SignedOut>
            </ClerkLoaded>
          </div>
        </header>
    ) // the loader checks if we are logged in!
}
