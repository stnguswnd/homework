import type { Assignment } from "@/types/assignment";

export async function listStudentAssignments() {
  const response = await fetch("/api/student/assignments", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("학생 과제를 불러오지 못했습니다.");
  }
  return response.json() as Promise<Array<Assignment & { status: string }>>;
}
