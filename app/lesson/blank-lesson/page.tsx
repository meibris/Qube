import { BlankLessonClient } from "./client"

type Props = {
    searchParams: Promise<{ key?: string }>
}

export default async function BlankLessonPage({ searchParams }: Props) {
    const { key } = await searchParams
    return <BlankLessonClient lessonKey={key ?? ""} />
}
