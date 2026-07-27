import type { Metadata } from "next"
import { Footer } from "./footer"
import { Header } from "./header"

type Props = {
  children:React.ReactNode
}

// SEO: this description is what shows as the grey snippet under "Qube Finance" in Google search results.
export const metadata: Metadata = {
  title: "Qube Finance | Learn Financial Literacy Through Games",
  description:
    "Qube Finance is a gamified app that teaches teens and young adults budgeting, taxes, investing, and loans through fun, interactive lessons and games.",
  openGraph: {
    title: "Qube Finance",
    description:
      "Learn budgeting, taxes, investing, and loans through fun, interactive lessons and games.",
    url: "https://www.playqube.org",
    siteName: "Qube Finance",
    images: ["/QubeSymbolTemp.svg"],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Qube Finance",
    description:
      "Learn budgeting, taxes, investing, and loans through fun, interactive lessons and games.",
    images: ["/QubeSymbolTemp.svg"],
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Qube Finance",
  alternateName: "Qube",
  url: "https://www.playqube.org",
  description:
    "Qube Finance is a gamified app that teaches teens and young adults budgeting, taxes, investing, and loans through fun, interactive lessons and games.",
}

const MarketingLayout = ({ children }: Props) => {
  return ( //so everything that is under this page will have these (this is the parent folder)
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export default MarketingLayout