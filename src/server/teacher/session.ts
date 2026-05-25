import "server-only";

import { mockTeacherId } from "@/server/teacher/mockTeacher";

export async function requireTeacherSession() {
  // TODO:
  // - Replace this mock with httpOnly cookie based teacher session validation.
  // - Read teacherId from the verified cookie/session instead of the mock.
  // - Return 401 from teacher APIs when teacherId is missing or invalid.
  // - Keep every teacher API dependent on this utility for teacherId access.
  return {
    teacherId: mockTeacherId,
    role: "teacher" as const,
  };
}
