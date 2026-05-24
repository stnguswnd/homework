import type { ManagedStudent } from "@/features/student-management/types/studentManagement";

export type CreateStudentRequest = {
  name: string;
  studentLoginId: string;
  password: string;
  schoolName?: string;
  grade?: string;
  classIds?: string[];
  memo?: string;
};

export async function createStudent(input: CreateStudentRequest) {
  const response = await fetch("/api/teacher/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "학생 생성 중 오류가 발생했습니다.");
  }

  return data as ManagedStudent;
}

export async function getTeacherStudent(studentId: string) {
  const response = await fetch(`/api/teacher/students/${studentId}`, { cache: "no-store" });
  if (!response.ok) return null;
  return response.json() as Promise<ManagedStudent>;
}

export async function updateTeacherStudent(studentId: string, input: unknown) {
  const response = await fetch(`/api/teacher/students/${studentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "학생 수정 중 오류가 발생했습니다.");
  return data as ManagedStudent;
}

export async function deleteTeacherStudent(studentId: string) {
  const response = await fetch(`/api/teacher/students/${studentId}`, { method: "DELETE" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "학생 삭제 중 오류가 발생했습니다.");
  return data as ManagedStudent;
}

export async function listTeacherStudents() {
  const response = await fetch("/api/teacher/students", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("학생 목록을 불러오지 못했습니다.");
  }
  return response.json() as Promise<ManagedStudent[]>;
}
