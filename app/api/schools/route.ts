import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
    if (q.length < 2) return NextResponse.json([])

    try {
        // Search public K-12 schools (NCES Common Core of Data via Urban Institute)
        // and private K-12 schools (NCES Private School Survey) in parallel
        const [pubRes, privRes] = await Promise.allSettled([
            fetch(
                `https://educationdata.urban.org/api/v1/schools/ccd/directory/?school_name=${encodeURIComponent(q)}&per_page=8&year=2022`,
                { next: { revalidate: 3600 } }
            ),
            fetch(
                `https://educationdata.urban.org/api/v1/schools/pss/school-characteristics/?school_name=${encodeURIComponent(q)}&per_page=5&year=2021`,
                { next: { revalidate: 3600 } }
            ),
        ])

        const results: { name: string; city: string; state: string }[] = []

        if (pubRes.status === "fulfilled" && pubRes.value.ok) {
            const data = await pubRes.value.json()
            for (const s of data.results ?? []) {
                results.push({
                    name: s.school_name ?? s.name ?? "",
                    city: s.city_location ?? s.city ?? "",
                    state: s.state_location ?? s.state_name ?? s.state ?? "",
                })
            }
        }

        if (privRes.status === "fulfilled" && privRes.value.ok) {
            const data = await privRes.value.json()
            for (const s of data.results ?? []) {
                results.push({
                    name: s.school_name ?? s.name ?? "",
                    city: s.city_location ?? s.city ?? "",
                    state: s.state_location ?? s.state_name ?? s.state ?? "",
                })
            }
        }

        // Deduplicate by name+city and remove blanks
        const seen = new Set<string>()
        const deduped = results.filter(r => {
            if (!r.name) return false
            const key = `${r.name}|${r.city}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })

        return NextResponse.json(deduped.slice(0, 10))
    } catch {
        return NextResponse.json([])
    }
}
