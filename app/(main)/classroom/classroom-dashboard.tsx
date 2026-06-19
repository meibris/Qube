"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { Copy, Check, X, Zap, Pencil, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { updateClassroomName, deleteClassroom } from "@/actions/classroom"

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

type Classroom = {
    id: number
    name: string
    emoji: string
    school: string
    code: string
    teacherUserId: string
    createdAt: Date
}

type Props = {
    classroom: Classroom | null
    members: Member[]
    freshCode: string | null
    onCreateNew?: () => void
    backHref?: string
}

type Tab = "students" | "assign" | "settings"

function getAvatarBg(characterData: string | null): string {
    try {
        const parsed = JSON.parse(characterData ?? "")
        return parsed.bgColor ?? "#e5e7eb"
    } catch {
        return "#e5e7eb"
    }
}

function StudentAvatar({ member }: { member: Member }) {
    const bg = getAvatarBg(member.characterData)
    let avatarSrc: string | null = null
    try {
        const parsed = JSON.parse(member.characterData ?? "")
        if (parsed.selectedImage) avatarSrc = parsed.selectedImage
    } catch {}

    if (!avatarSrc && member.userImageSrc && !member.userImageSrc.includes("mascot")) {
        avatarSrc = member.userImageSrc
    }

    return (
        <div
            className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ backgroundColor: bg }}
        >
            {avatarSrc ? (
                <Image src={avatarSrc} alt={member.userName ?? "Student"} width={36} height={36} className="object-contain" />
            ) : (
                <span className="text-sm font-bold text-white">
                    {(member.userName ?? "?")[0].toUpperCase()}
                </span>
            )}
        </div>
    )
}

export const ClassroomDashboard = ({ classroom, members, freshCode, onCreateNew, backHref }: Props) => {
    const [tab, setTab] = useState<Tab>("students")
    const [selectedMember, setSelectedMember] = useState<Member | null>(null)
    const [copied, setCopied] = useState(false)
    const [linkCopied, setLinkCopied] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Settings state
    const [editingName, setEditingName] = useState(false)
    const [nameValue, setNameValue] = useState(classroom?.name ?? "")
    const [confirmDelete, setConfirmDelete] = useState(false)

    const code = classroom?.code ?? freshCode ?? ""
    const joinLink = typeof window !== "undefined"
        ? `${window.location.origin}/classroom?code=${code}`
        : `/classroom?code=${code}`

    const copyCode = async () => {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        toast.success("Code copied!")
        setTimeout(() => setCopied(false), 2000)
    }

    const copyLink = async () => {
        await navigator.clipboard.writeText(joinLink)
        setLinkCopied(true)
        toast.success("Link copied!")
        setTimeout(() => setLinkCopied(false), 2000)
    }

    const saveName = () => {
        if (!nameValue.trim() || !classroom) return
        startTransition(async () => {
            const res = await updateClassroomName(classroom.id, nameValue.trim())
            if (res && "error" in res) {
                toast.error(res.error)
            } else {
                toast.success("Classroom name updated!")
                setEditingName(false)
            }
        })
    }

    const handleDelete = () => {
        if (!classroom) return
        startTransition(async () => {
            await deleteClassroom(classroom.id)
        })
    }

    const tabs: { value: Tab; label: string }[] = [
        { value: "students", label: "Students" },
        { value: "assign", label: "Assign" },
        { value: "settings", label: "Settings" },
    ]

    if (!classroom) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-neutral-500">Loading classroom...</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 relative">
            {/* Back link */}
            {backHref && (
                <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-600 mb-4 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> All classrooms
                </Link>
            )}
            {/* Header */}
            <div className="flex items-center gap-3 mb-1">
                <span className="text-4xl">{classroom.emoji}</span>
                <div>
                    <h1 className="text-2xl font-bold text-neutral-800">{classroom.name}</h1>
                    <p className="text-sm text-neutral-500">{classroom.school}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-neutral-100 rounded-lg px-3 py-2">
                        <span className="text-sm text-neutral-500">Code:</span>
                        <span className="font-mono font-bold text-neutral-800 tracking-widest">
                            {code}
                        </span>
                        <button onClick={copyCode} className="text-neutral-400 hover:text-green-500 transition-colors ml-1">
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-200 mb-6 mt-4">
                {tabs.map((t) => (
                    <button
                        key={t.value}
                        onClick={() => setTab(t.value)}
                        className={`px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 -mb-px ${
                            tab === t.value
                                ? "border-blue-500 text-blue-500"
                                : "border-transparent text-neutral-500 hover:text-neutral-700"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Students Tab */}
            {tab === "students" && (
                <div className="flex gap-4">
                    <div className="flex-1">
                        <p className="text-neutral-600 font-semibold mb-4">
                            {members.length} {members.length === 1 ? "student" : "students"}
                        </p>

                        {members.length === 0 ? (
                            <div className="border-2 border-dashed border-neutral-200 rounded-xl p-12 text-center">
                                <p className="text-neutral-500 font-medium">No students yet</p>
                                <p className="text-neutral-400 text-sm mt-1">
                                    Share your code <span className="font-mono font-bold">{code}</span> so students can join.
                                </p>
                            </div>
                        ) : (
                            <div className="border border-neutral-200 rounded-xl overflow-hidden">
                                {/* Table header */}
                                <div className="grid grid-cols-[1fr_120px_120px_100px] gap-4 px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Name</span>
                                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">XP Earned</span>
                                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Time Spent</span>
                                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Coins</span>
                                </div>

                                {/* Table rows */}
                                {members.map((member) => (
                                    <button
                                        key={member.userId}
                                        onClick={() => setSelectedMember(member)}
                                        className={`w-full grid grid-cols-[1fr_120px_120px_100px] gap-4 px-4 py-3 items-center text-left border-b border-neutral-100 last:border-b-0 hover:bg-blue-50 transition-colors ${
                                            selectedMember?.userId === member.userId ? "bg-blue-50" : ""
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <StudentAvatar member={member} />
                                            <span className="font-medium text-neutral-800">
                                                {member.userName ?? "Student"}
                                            </span>
                                        </div>
                                        <span className="text-blue-500 font-semibold">
                                            {member.points ?? 0} XP
                                        </span>
                                        <span className="text-neutral-500">—</span>
                                        <span className="text-neutral-700 font-medium">
                                            {member.tokens ?? 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Student detail panel */}
                    {selectedMember && (
                        <div className="w-64 border border-neutral-200 rounded-xl p-5 flex-shrink-0 h-fit">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col items-center gap-2 w-full">
                                    <StudentAvatar member={selectedMember} />
                                    <div className="text-center">
                                        <p className="font-bold text-neutral-800">
                                            {selectedMember.userName ?? "Student"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedMember(null)}
                                    className="text-neutral-400 hover:text-neutral-600 flex-shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                                Progress since joining class
                            </p>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-neutral-50 rounded-lg p-3 flex flex-col items-center">
                                    <div className="flex items-center gap-1 text-yellow-500 mb-1">
                                        <Zap className="h-4 w-4" />
                                        <span className="font-bold text-neutral-800">
                                            {selectedMember.points ?? 0}
                                        </span>
                                    </div>
                                    <span className="text-xs text-neutral-500">XP</span>
                                </div>
                                <div className="bg-neutral-50 rounded-lg p-3 flex flex-col items-center">
                                    <div className="flex items-center gap-1 text-amber-500 mb-1">
                                        <span className="font-bold text-neutral-800">
                                            {selectedMember.tokens ?? 0}
                                        </span>
                                    </div>
                                    <span className="text-xs text-neutral-500">Coins</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === "assign" && (
                <div className="flex items-center justify-center h-48 text-neutral-400">
                    <p>Coming soon</p>
                </div>
            )}

            {tab === "settings" && (
                <div className="max-w-lg flex flex-col divide-y divide-neutral-100">

                    {/* Classroom code */}
                    <div className="py-5 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Classroom code</p>
                            <p className="font-mono font-bold text-neutral-800 tracking-widest mt-1">{code}</p>
                        </div>
                        <button onClick={copyCode} className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-sm font-semibold transition-colors">
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copied ? "Copied" : "Copy"}
                        </button>
                    </div>

                    {/* Classroom link */}
                    <div className="py-5 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Classroom link</p>
                            <p className="text-sm text-neutral-600 mt-1 truncate">{joinLink}</p>
                        </div>
                        <button onClick={copyLink} className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-sm font-semibold transition-colors flex-shrink-0">
                            {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {linkCopied ? "Copied" : "Copy"}
                        </button>
                    </div>

                    {/* Classroom name */}
                    <div className="py-5">
                        <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Classroom name</p>
                        {editingName ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    value={nameValue}
                                    onChange={(e) => setNameValue(e.target.value)}
                                    maxLength={60}
                                    className="max-w-xs"
                                    autoFocus
                                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false) }}
                                />
                                <Button size="sm" variant="primary" onClick={saveName} disabled={isPending}>
                                    {isPending ? "Saving..." : "Save"}
                                </Button>
                                <Button size="sm" variant="default" onClick={() => { setEditingName(false); setNameValue(classroom?.name ?? "") }}>
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-neutral-800 font-medium">{classroom?.name}</span>
                                <button onClick={() => setEditingName(true)} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                                    <Pencil className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Create new classroom */}
                    <div className="py-5">
                        <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">New classroom</p>
                        <Button variant="secondary" onClick={onCreateNew}>
                            + Create a new classroom
                        </Button>
                    </div>

                    {/* Delete classroom */}
                    <div className="py-5">
                        <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Delete classroom</p>
                        {confirmDelete ? (
                            <div className="flex flex-col gap-2">
                                <p className="text-sm text-red-500">This will remove all students and cannot be undone.</p>
                                <div className="flex gap-2">
                                    <Button variant="danger" onClick={handleDelete} disabled={isPending}>
                                        {isPending ? "Deleting..." : "Yes, delete"}
                                    </Button>
                                    <Button variant="default" onClick={() => setConfirmDelete(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Button variant="dangerOutline" onClick={() => setConfirmDelete(true)}>
                                Delete classroom
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
