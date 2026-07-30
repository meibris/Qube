import { BlankLessonClient } from "@/app/lesson/blank-lesson/client"

// Not currently wired into Unit 1's lesson sequence. Lesson 6's review
// slot is tax-brackets instead. Kept in case a dedicated fishing review
// gets built later.
export default function VariableIncomePage() {
  return <BlankLessonClient lessonKey="fishAnalysisCompleted" />
}
