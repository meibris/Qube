import { Button } from "@/components/ui/button"
import Image from "next/image"

export const Footer = () => {
    return (
        <footer className="hidden lg:block h-20 w-full border-t-2 border-slate-200 p-2">
          <div className="max-w-screen-lg mx-auto flex items-center justify-evenly h-full">
            <Button size="lg" variant="defaultOutline" className="w-full">
              <Image
                src="/InvestmentSymbol.svg"
                alt="Investment"
                height={32}
                width={40}
                className="mr-4 rounded-md"
              />
              Investment
            </Button>
            <Button size="lg" variant="defaultOutline" className="w-full">
              <Image 
                src="/BudgetSymbol.svg" //change this for the real thing!
                alt="Budget" 
                height={32} 
                width={40}
                className="mr-4 rounded-md"
              />
              Budget
            </Button>
            <Button size="lg" variant="defaultOutline" className="w-full">
              <Image 
                src="/TaxesSymbol.svg"
                alt="Taxes" 
                height={32} 
                width={40}
                className="mr-4 rounded-md"
              />
              Taxes
            </Button>
            <Button size="lg" variant="defaultOutline" className="w-full">
              <Image 
                src="/LoanSymbol.svg" //change this for the real thing!
                alt="Loans" 
                height={32} 
                width={40}
                className="mr-4 rounded-md"
              />
              Loans
            </Button>
          </div>
        </footer>
    )
}