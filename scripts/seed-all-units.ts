/**
 * Adds units + lessons + challenges for courses 2-5
 * (Budgeting, Loans, Assets, Investments).
 *
 * Run with:  npx tsx scripts/seed-all-units.ts
 *
 * Safe to run multiple times — uses INSERT … ON CONFLICT DO NOTHING.
 */
import "dotenv/config"
import { sql } from "drizzle-orm"
import db from "@/db/drizzle"
import * as schema from "@/db/schema"

// ─── helpers ────────────────────────────────────────────────────────────────

async function insertUnitSafe(unit: typeof schema.units.$inferInsert) {
    await db.execute(sql`
        INSERT INTO units (id, course_id, title, description, "order")
        VALUES (${unit.id}, ${unit.courseId}, ${unit.title}, ${unit.description}, ${unit.order})
        ON CONFLICT (id) DO NOTHING
    `)
}

async function insertLessonSafe(lesson: typeof schema.lessons.$inferInsert) {
    await db.execute(sql`
        INSERT INTO lessons (id, unit_id, title, "order")
        VALUES (${lesson.id}, ${lesson.unitId}, ${lesson.title}, ${lesson.order})
        ON CONFLICT (id) DO NOTHING
    `)
}

async function insertChallengeSafe(c: typeof schema.challenges.$inferInsert) {
    await db.execute(sql`
        INSERT INTO challenges (id, lessons_id, type, question, "order")
        VALUES (${c.id}, ${c.lessonId}, ${c.type}, ${c.question}, ${c.order})
        ON CONFLICT (id) DO NOTHING
    `)
}

async function insertOptionSafe(o: typeof schema.challengeOptions.$inferInsert) {
    await db.execute(sql`
        INSERT INTO challenge_options (id, challenge_id, text, correct)
        VALUES (${o.id}, ${o.challengeId}, ${o.text}, ${o.correct})
        ON CONFLICT (id) DO NOTHING
    `)
}

// ─── data ───────────────────────────────────────────────────────────────────

const UNITS = [
    { id: 2, courseId: 2, title: "Unit 1", description: "Making a Budget",    order: 1 },
    { id: 3, courseId: 3, title: "Unit 1", description: "Understanding Loans", order: 1 },
    { id: 4, courseId: 4, title: "Unit 1", description: "Building Assets",    order: 1 },
    { id: 5, courseId: 5, title: "Unit 1", description: "Smart Investing",    order: 1 },
]

const LESSONS = [
    // Budgeting (unit 2)
    { id: 3,  unitId: 2, title: "What Is a Budget?",        order: 1 },
    { id: 4,  unitId: 2, title: "Fixed vs Variable Expenses", order: 2 },
    // Loans (unit 3)
    { id: 5,  unitId: 3, title: "How Loans Work",           order: 1 },
    { id: 6,  unitId: 3, title: "Interest Rates",           order: 2 },
    // Assets (unit 4)
    { id: 7,  unitId: 4, title: "What Are Assets?",         order: 1 },
    { id: 8,  unitId: 4, title: "Stocks Basics",            order: 2 },
    // Investments (unit 5)
    { id: 9,  unitId: 5, title: "Why Invest?",              order: 1 },
    { id: 10, unitId: 5, title: "Investment Types",         order: 2 },
]

// Each lesson gets 2 SELECT challenges
const CHALLENGES: (typeof schema.challenges.$inferInsert)[] = [
    // ── Lesson 3: What Is a Budget? ─────────────────────────────────────────
    { id: 1, lessonId: 3, type: "SELECT", order: 1,
      question: "What is the main purpose of a budget?" },
    { id: 2, lessonId: 3, type: "SELECT", order: 2,
      question: "The 50/30/20 rule splits your income into..." },

    // ── Lesson 4: Fixed vs Variable Expenses ────────────────────────────────
    { id: 3, lessonId: 4, type: "SELECT", order: 1,
      question: "Which of these is a FIXED expense?" },
    { id: 4, lessonId: 4, type: "SELECT", order: 2,
      question: "Which of these is a VARIABLE expense?" },

    // ── Lesson 5: How Loans Work ─────────────────────────────────────────────
    { id: 5, lessonId: 5, type: "SELECT", order: 1,
      question: "What is the 'principal' of a loan?" },
    { id: 6, lessonId: 5, type: "SELECT", order: 2,
      question: "What does APR stand for?" },

    // ── Lesson 6: Interest Rates ─────────────────────────────────────────────
    { id: 7, lessonId: 6, type: "SELECT", order: 1,
      question: "You borrow 🪙 1,000 at 10% annual interest for 1 year. How much interest do you owe?" },
    { id: 8, lessonId: 6, type: "SELECT", order: 2,
      question: "Which loan term results in paying MORE total interest?" },

    // ── Lesson 7: What Are Assets? ───────────────────────────────────────────
    { id: 9,  lessonId: 7, type: "SELECT", order: 1,
      question: "What is an asset?" },
    { id: 10, lessonId: 7, type: "SELECT", order: 2,
      question: "Which of these is an example of an asset?" },

    // ── Lesson 8: Stocks Basics ──────────────────────────────────────────────
    { id: 11, lessonId: 8, type: "SELECT", order: 1,
      question: "What do you own when you buy a stock?" },
    { id: 12, lessonId: 8, type: "SELECT", order: 2,
      question: "What is a dividend?" },

    // ── Lesson 9: Why Invest? ────────────────────────────────────────────────
    { id: 13, lessonId: 9, type: "SELECT", order: 1,
      question: "What is compound interest?" },
    { id: 14, lessonId: 9, type: "SELECT", order: 2,
      question: "Why is starting to invest EARLY so powerful?" },

    // ── Lesson 10: Investment Types ──────────────────────────────────────────
    { id: 15, lessonId: 10, type: "SELECT", order: 1,
      question: "Which investment is generally considered the SAFEST?" },
    { id: 16, lessonId: 10, type: "SELECT", order: 2,
      question: "What does 'diversification' mean in investing?" },
]

// 4 options per challenge (id = challengeId * 10 + 1/2/3/4)
const OPTIONS: (typeof schema.challengeOptions.$inferInsert)[] = [
    // Challenge 1
    { id: 11, challengeId: 1, text: "Track your spending and saving",        correct: true  },
    { id: 12, challengeId: 1, text: "Make you spend more money",             correct: false },
    { id: 13, challengeId: 1, text: "Only useful for rich people",           correct: false },
    { id: 14, challengeId: 1, text: "A type of bank account",                correct: false },

    // Challenge 2
    { id: 21, challengeId: 2, text: "Needs, Wants, Savings",                 correct: true  },
    { id: 22, challengeId: 2, text: "Food, Rent, Fun",                       correct: false },
    { id: 23, challengeId: 2, text: "Taxes, Bills, Shopping",                correct: false },
    { id: 24, challengeId: 2, text: "Savings, Debt, Spending",               correct: false },

    // Challenge 3
    { id: 31, challengeId: 3, text: "Monthly rent payment",                  correct: true  },
    { id: 32, challengeId: 3, text: "Restaurant meals",                      correct: false },
    { id: 33, challengeId: 3, text: "Movie tickets",                         correct: false },
    { id: 34, challengeId: 3, text: "Clothing shopping",                     correct: false },

    // Challenge 4
    { id: 41, challengeId: 4, text: "Grocery shopping",                      correct: true  },
    { id: 42, challengeId: 4, text: "Monthly car loan payment",              correct: false },
    { id: 43, challengeId: 4, text: "Internet subscription",                 correct: false },
    { id: 44, challengeId: 4, text: "Rent",                                  correct: false },

    // Challenge 5
    { id: 51, challengeId: 5, text: "The original amount borrowed",          correct: true  },
    { id: 52, challengeId: 5, text: "The interest you pay",                  correct: false },
    { id: 53, challengeId: 5, text: "The monthly payment amount",            correct: false },
    { id: 54, challengeId: 5, text: "The lender's processing fee",           correct: false },

    // Challenge 6
    { id: 61, challengeId: 6, text: "Annual Percentage Rate",                correct: true  },
    { id: 62, challengeId: 6, text: "Average Payment Required",              correct: false },
    { id: 63, challengeId: 6, text: "Amount Per Return",                     correct: false },
    { id: 64, challengeId: 6, text: "Annual Payment Record",                 correct: false },

    // Challenge 7
    { id: 71, challengeId: 7, text: "🪙 100",                                correct: true  },
    { id: 72, challengeId: 7, text: "🪙 10",                                 correct: false },
    { id: 73, challengeId: 7, text: "🪙 1,000",                              correct: false },
    { id: 74, challengeId: 7, text: "🪙 110",                                correct: false },

    // Challenge 8
    { id: 81, challengeId: 8, text: "A 30-year loan",                        correct: true  },
    { id: 82, challengeId: 8, text: "A 5-year loan",                         correct: false },
    { id: 83, challengeId: 8, text: "They cost the same total",              correct: false },
    { id: 84, challengeId: 8, text: "A 10-year loan",                        correct: false },

    // Challenge 9
    { id: 91, challengeId: 9, text: "Something you own that has value",      correct: true  },
    { id: 92, challengeId: 9, text: "A type of debt or liability",           correct: false },
    { id: 93, challengeId: 9, text: "A monthly expense",                     correct: false },
    { id: 94, challengeId: 9, text: "A bank processing fee",                 correct: false },

    // Challenge 10
    { id: 101, challengeId: 10, text: "A house you own",                     correct: true  },
    { id: 102, challengeId: 10, text: "Credit card debt",                    correct: false },
    { id: 103, challengeId: 10, text: "Monthly rent payments",               correct: false },
    { id: 104, challengeId: 10, text: "A student loan balance",              correct: false },

    // Challenge 11
    { id: 111, challengeId: 11, text: "A small piece of ownership in a company", correct: true  },
    { id: 112, challengeId: 11, text: "The entire company",                  correct: false },
    { id: 113, challengeId: 11, text: "A loan you give the company",         correct: false },
    { id: 114, challengeId: 11, text: "A savings account",                   correct: false },

    // Challenge 12
    { id: 121, challengeId: 12, text: "A share of company profits paid to investors", correct: true  },
    { id: 122, challengeId: 12, text: "A type of investment tax",            correct: false },
    { id: 123, challengeId: 12, text: "A stock market trading fee",          correct: false },
    { id: 124, challengeId: 12, text: "The company's total debt",            correct: false },

    // Challenge 13
    { id: 131, challengeId: 13, text: "Earning interest on your principal AND previous interest", correct: true  },
    { id: 132, challengeId: 13, text: "Paying extra fees on a loan",        correct: false },
    { id: 133, challengeId: 13, text: "A type of income tax",               correct: false },
    { id: 134, challengeId: 13, text: "A fixed monthly bank payment",       correct: false },

    // Challenge 14
    { id: 141, challengeId: 14, text: "More time for compound interest to grow your money", correct: true  },
    { id: 142, challengeId: 14, text: "Young people always lose money investing",            correct: false },
    { id: 143, challengeId: 14, text: "Banks only let young people invest",                  correct: false },
    { id: 144, challengeId: 14, text: "Starting late gives you better rates",               correct: false },

    // Challenge 15
    { id: 151, challengeId: 15, text: "A savings account or government bonds",  correct: true  },
    { id: 152, challengeId: 15, text: "Individual stocks in one company",        correct: false },
    { id: 153, challengeId: 15, text: "Cryptocurrency",                          correct: false },
    { id: 154, challengeId: 15, text: "Options trading",                         correct: false },

    // Challenge 16
    { id: 161, challengeId: 16, text: "Spreading investments across different assets to reduce risk", correct: true  },
    { id: 162, challengeId: 16, text: "Putting all your money into one stock",   correct: false },
    { id: 163, challengeId: 16, text: "Only investing in gold",                  correct: false },
    { id: 164, challengeId: 16, text: "Never selling any investment",            correct: false },
]

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log("Inserting units…")
    for (const u of UNITS)      await insertUnitSafe(u)

    console.log("Inserting lessons…")
    for (const l of LESSONS)    await insertLessonSafe(l)

    console.log("Inserting challenges…")
    for (const c of CHALLENGES) await insertChallengeSafe(c)

    console.log("Inserting options…")
    for (const o of OPTIONS)    await insertOptionSafe(o)

    console.log("✅ All units seeded!")
    process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
