import "dotenv/config"

import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"

import * as schema from "../db/schema"

const sql = neon(process.env.DATABASE_URL!)
// @ts-ignore
const db = drizzle(sql, { schema })

const main = async () => {
    try {
        console.log("Seeding database")

        await db.delete(schema.courses)
        await db.delete(schema.userProgress)
        await db.delete(schema.units)
        await db.delete(schema.lessons)
        await db.delete(schema.challenges)
        await db.delete(schema.challengeOptions)
        await db.delete(schema.challengeProgress)

        //courses
        await db.insert(schema.courses).values([
            {
                id:1,
                title: "Spanish",
                imageSrc: "/es.svg",
            },
            {
                id:2,
                title: "Evolution and Classification",
                imageSrc: "/ch.svg",
            },
            {
                id:3,
                title: "Metabolism",
                imageSrc: "/kr.svg",
            },
            {
                id:4,
                title: "Protein Synthesis",
                imageSrc: "/it.svg",
            },
            {
                id:5,
                title: "Genetics",
                imageSrc: "/it.svg",
            },
        ])

        //units
        await db.insert(schema.units).values([
            {
                id: 1,
                courseId: 1, //spanish
                title: "Unit 1",
                description: "Learn the basics of Spanish",
                order: 1,
            }
        ])

        //lessons
        await db.insert(schema.lessons).values([
            {
                id: 1,
                unitId: 1, //unit 1 learn the basics...
                order: 1,
                title: "Nouns",
            },
            {
                id: 2,
                unitId: 1, //unit 1 learn the basics...
                order: 2,
                title: "Verb",
            },
            {
                id: 3,
                unitId: 1, //unit 1 learn the basics...
                order: 3,
                title: "Verb",
            },
            {
                id: 4,
                unitId: 1, //unit 1 learn the basics...
                order: 4,
                title: "Verb",
            },
            {
                id: 5,
                unitId: 1, //unit 1 learn the basics...
                order: 5,
                title: "Verb",
            },
        ])
        
        //questions/challenges
        await db.insert(schema.challenges).values([
            {
                id: 1,
                lessonId: 1, //nouns
                type: "SELECT",
                order: 1,
                question: 'Which one of these is the "man"?'
            },
            {
                id: 2,
                lessonId: 1, //nouns
                type: "ASSIST",
                order: 2,
                question: '"The man"',
            },
            {
                id: 3,
                lessonId: 1, //nouns
                type: "SELECT",
                order: 3,
                question: 'Which one of these is the "woman"?',
            },
        ])

        //questions/challenges
        await db.insert(schema.challenges).values([
            {
                id: 4,
                lessonId: 2, //verbs
                type: "SELECT",
                order: 1,
                question: 'Which one of these is the "man"?'
            },
            {
                id: 5,
                lessonId: 2, 
                type: "ASSIST",
                order: 2,
                question: '"The man"',
            },
            {
                id: 6,
                lessonId: 2,
                type: "SELECT",
                order: 3,
                question: 'Which one of these is the "woman"?',
            },
        ])

        //answers: choose man
        await db.insert(schema.challengeOptions).values([
            {
                challengeId: 1, //which one of these is "the man"?
                imageSrc: "/man.svg",
                correct: true,
                text: "el hombre",
                audioSrc: "/es_man.mp3", //AI voice!
            },
            {
                challengeId: 1, 
                imageSrc: "/woman.svg",
                correct: false,
                text: "la mujer",
                audioSrc: "/es_woman.mp3", 
            },
            {
                challengeId: 1, 
                imageSrc: "/bear.svg",
                correct: false,
                text: "el oso",
                audioSrc: "/es_bear.mp3", 
            },
            {
                challengeId: 1, 
                imageSrc: "/woman.svg",
                correct: false,
                text: "test!!! (also checking if long answers work cus)",
                audioSrc: "/es_woman.mp3", 
            },
        ])

        //answers: man
        await db.insert(schema.challengeOptions).values([
            {
                challengeId: 2, //"the man"
                correct: true,
                text: "el hombre",
                audioSrc: "/es_man.mp3", //AI voice!
            },
            {
                challengeId: 2, 
                correct: false,
                text: "la mujer",
                audioSrc: "/es_woman.mp3", 
            },
            {
                challengeId: 2, 
                correct: false,
                text: "el oso",
                audioSrc: "/es_bear.mp3", 
            },
            {
                id: 8,
                challengeId: 2, 
                correct: false,
                text: "la mujer 2",
                audioSrc: "/es_woman.mp3", 
            },
        ])

        //answers: woman
        await db.insert(schema.challengeOptions).values([
            {
                challengeId: 3, //which one of these is "the man"?
                imageSrc: "/man.svg",
                correct: false,
                text: "el hombre",
                audioSrc: "/es_man.mp3", //AI voice!
            },
            {
                challengeId: 3, 
                imageSrc: "/woman.svg",
                correct: true,
                text: "la mujer",
                audioSrc: "/es_woman.mp3", 
            },
            {
                challengeId: 3, 
                imageSrc: "/bear.svg",
                correct: false,
                text: "el oso",
                audioSrc: "/es_bear.mp3", 
            },
        ])

        console.log("Seeding finished")
    } catch (error) {
        console.error(error)
        throw new Error("Failed to seed the database")
    }
}

main()