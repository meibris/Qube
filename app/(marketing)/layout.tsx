import { Footer } from "./footer"
import { Header } from "./header"

type Props = {
  children:React.ReactNode
}

const MarketingLayout = ({ children }: Props) => {
  return ( //so everything that is under this page will have these (this is the parent folder)
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center">
        {children} 
      </main>
      <Footer />
    </div> 
  )
}

export default MarketingLayout