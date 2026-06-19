import "dotenv/config"
import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { eq } from "drizzle-orm"
import * as schema from "../db/schema"

const sql = neon(process.env.DATABASE_URL!)
// @ts-ignore
const db = drizzle(sql, { schema })

const updates = [
    { id: 1, imageSrc: "/TaxesSymbol.svg" },
    { id: 2, imageSrc: "/BudgetSymbol.svg" },
    { id: 3, imageSrc: "/LoanSymbol.svg" },
    { id: 4, imageSrc: "/AssetSymbol.svg" },
    { id: 5, imageSrc: "/InvestmentSymbol.svg" },
]

async function main() {
    for (const u of updates) {
        await db.update(schema.courses).set({ imageSrc: u.imageSrc }).where(eq(schema.courses.id, u.id))
        console.log(`Updated course ${u.id} → ${u.imageSrc}`)
    }

    const courses = await db.query.courses.findMany()
    for (const c of courses) {
        console.log(`  DB: ${c.id} ${c.title} → ${c.imageSrc}`)
    }
    console.log("Done")
}

main()
