import type { ClassHomeworkType } from "@/features/class-calendar/types/classCalendar";
import type { StudentLearningHistory } from "@/features/student-management/types/studentManagement";
import type { Student } from "@/types/student";

export function homeworkTypeLabel(type: ClassHomeworkType) {
  if (type === "listening_recording") return "듣기/녹음";
  if (type === "image_speaking") return "이미지 보고 말하기";
  if (type === "sentence_shadowing") return "문장 따라 읽기";
  if (type === "free_speaking") return "자유 말하기";
  if (type === "writing") return "라이팅";
  if (type === "vocabulary") return "단어";
  return "일반";
}

export const classCalendarRepository = {
  getInitialState() {
    return { scheduleDays: [], assignments: [], assignmentTargets: [] };
  },
  loadState() {
    return this.getInitialState();
  },
  async loadSchedule(classId: string, start?: string, end?: string) {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    const response = await fetch(`/api/teacher/classes/${classId}/schedule?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("수업 일정을 불러오지 못했습니다.");
    return response.json();
  },
  async saveScheduleDay(classId: string, input: unknown) {
    const response = await fetch(`/api/teacher/classes/${classId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("수업 일정을 저장하지 못했습니다.");
    return response.json();
  },
  async updateScheduleDay(classId: string, scheduleDayId: string, input: unknown) {
    const response = await fetch(`/api/teacher/classes/${classId}/schedule/${scheduleDayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("수업 일정을 수정하지 못했습니다.");
    return response.json();
  },
  async deleteScheduleDay(classId: string, scheduleDayId: string) {
    const response = await fetch(`/api/teacher/classes/${classId}/schedule/${scheduleDayId}`, { method: "DELETE" });
    if (!response.ok) throw new Error("수업 일정을 삭제하지 못했습니다.");
  },
  saveState(_state?: unknown) {
    // Removed: class calendar is persisted through route handlers and class_schedule_days.
  },
  getLearningHistoryForManagedStudent(): StudentLearningHistory[] {
    return [];
  },
  getClassHomeworkRows(_classId: string, _students: Student[], _state?: unknown) {
    return [];
  },
};
