import "dotenv/config"
import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { eq } from "drizzle-orm"
import * as schema from "../db/schema"

const sql = neon(process.env.DATABASE_URL!)
// @ts-ignore
const db = drizzle(sql, { schema })

const main = async () => {
    try {
        console.log("Renaming courses...")

        await db.update(schema.courses).set({ title: "Adventure" }).where(eq(schema.courses.id, 1))
        await db.update(schema.courses).set({ title: "Goals" }).where(eq(schema.courses.id, 2))
        await db.update(schema.courses).set({ title: "Net Worth" }).where(eq(schema.courses.id, 3))
        await db.update(schema.courses).set({ title: "Stock Market" }).where(eq(schema.courses.id, 4))
        await db.update(schema.courses).set({ title: "Tools" }).where(eq(schema.courses.id, 5))

        console.log("Done!")
    } catch (e) {
        console.error(e)
        throw new Error("Failed to rename courses")
    }
}

main()
