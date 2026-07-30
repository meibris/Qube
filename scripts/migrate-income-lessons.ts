/**
 * Scoped, non-destructive-to-everything-else migration: replaces Income unit
 * (unitId 1) lesson rows for order >= 3 with the new 8-lesson CYOA structure
 * (drops the old order-9 "Blank" row entirely).
 *
 * Unlike scripts/seed.ts, this does NOT touch courses, units, userProgress,
 * challenges, or any other unit's lessons, only `lessons` rows where
 * unitId = 1 AND order >= 3. Safe to run against the live DB: those rows
 * never had challenges attached (db/queries.ts always takes the
 * `challenges.length === 0` branch for unit 1), so there's nothing to cascade.
 *
 * Run with: npx tsx scripts/migrate-income-lessons.ts
 */
import "dotenv/config"

import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { and, eq, gte } from "drizzle-orm"

import * as schema from "../db/schema"

const sql = neon(process.env.DATABASE_URL!)
// @ts-ignore
const db = drizzle(sql, { schema })

const main = async () => {
  try {
    console.log("Updating Income unit (unitId 1) lessons, order >= 3...")

    await db
      .delete(schema.lessons)
      .where(and(eq(schema.lessons.unitId, 1), gte(schema.lessons.order, 3)))

    await db.insert(schema.lessons).values([
      { id: 3, unitId: 1, order: 3, title: "Choose Your Adventure" },
      { id: 4, unitId: 1, order: 4, title: "Financial Concept Review" },
      { id: 5, unitId: 1, order: 5, title: "Choose Your Adventure" },
      { id: 6, unitId: 1, order: 6, title: "Financial Concept Review" },
      { id: 7, unitId: 1, order: 7, title: "Your Final Adventure" },
      { id: 8, unitId: 1, order: 8, title: "Financial Concept Review" },
    ])

    console.log("Done. Income unit now has lessons 1-8 (order 9 removed).")
  } catch (error) {
    console.error(error)
    throw new Error("Failed to migrate Income unit lessons")
  }
}

main()
