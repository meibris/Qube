"use client"

import { useState } from "react"
import { RoleSelector } from "./role-selector"
import { CreateClassroom } from "./create-classroom"
import { JoinClassroom } from "./join-classroom"
import { ClassroomDashboard } from "./classroom-dashboard"

type Role = "teacher" | "student" | "other"

type Member = {
    userId: string
    role: string
    joinedAt: Date
    userName: string | null
    userImageSrc: string | null
    points: number | null
    tokens: number | null
    characterData: string | null
}

type ClassroomData = {
    classroom: {
        id: number
        name: string
        emoji: string
        school: string
        code: string
        teacherUserId: string
        createdAt: Date
    }
    members: Member[]
} | null

type Props = {
    initialRole: string | null
    classroomData: ClassroomData
    forceCreate?: boolean
}

type Step =
    | "role-select"
    | "create-classroom"
    | "code-reveal"
    | "join-classroom"
    | "dashboard"

export const ClassroomClient = ({ initialRole, classroomData, forceCreate }: Props) => {
    const deriveStep = (): Step => {
        if (!initialRole) return "role-select"
        if (initialRole === "teacher") {
            if (forceCreate) return "create-classroom"
            return classroomData ? "dashboard" : "create-classroom"
        }
        // student/other already picked their role — skip straight to joining
        return "join-classroom"
    }

    const [step, setStep] = useState<Step>(deriveStep)
    const [selectedRole, setSelectedRole] = useState<Role | null>(
        initialRole as Role | null
    )
    const [generatedCode, setGeneratedCode] = useState<string | null>(
        classroomData?.classroom.code ?? null
    )
    const [liveClassroomData, setLiveClassroomData] =
        useState<ClassroomData>(classroomData)

    const handleRoleSelect = (role: Role) => {
        setSelectedRole(role)
        if (role === "teacher") {
            setStep("create-classroom")
        } else {
            setStep("join-classroom")
        }
    }

    const handleClassroomCreated = (code: string) => {
        setGeneratedCode(code)
        setStep("dashboard")
    }

    if (step === "role-select") {
        return <RoleSelector onSelect={handleRoleSelect} />
    }

    if (step === "create-classroom") {
        return <CreateClassroom onCreated={handleClassroomCreated} />
    }

    if (step === "join-classroom") {
        return <JoinClassroom role={selectedRole as "student" | "other"} />
    }

    if (step === "dashboard") {
        return (
            <ClassroomDashboard
                classroom={liveClassroomData?.classroom ?? null}
                members={liveClassroomData?.members ?? []}
                freshCode={generatedCode}
                onCreateNew={() => setStep("create-classroom")}
            />
        )
    }

    return null
}
