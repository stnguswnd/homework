import type {
  AssignmentTarget,
  CalendarAssignment,
  ClassCalendarState,
  ClassHomeworkType,
  ClassScheduleDay,
  CreateCalendarHomeworkInput
} from "@/features/class-calendar/types/classCalendar";
import type { StudentLearningHistory } from "@/features/student-management/types/studentManagement";
import type { Student } from "@/types/student";

const STORAGE_KEY = "homework-studio.class-calendar.v1";

const seedScheduleDays: ClassScheduleDay[] = [
  {
    id: "schedule-class-a-2026-05-23",
    classId: "class-a",
    date: "2026-05-23",
    hasClass: true,
    startTime: "16:00",
    endTime: "17:20",
    bookTitle: "e-future Discovery 4.1",
    progressTitle: "Unit 1 A Day at the Museum",
    progressMemo: "본문 듣기와 핵심 표현 shadowing 진행",
    nextPrep: "Unit 1 단어 복습",
    homeworkIds: ["calendar-hw-1"]
  }
];

const seedAssignments: CalendarAssignment[] = [
  {
    id: "calendar-hw-1",
    classId: "class-a",
    scheduleDayId: "schedule-class-a-2026-05-23",
    title: "Unit 1 본문 녹음 숙제",
    type: "listening_recording",
    description: "본문을 듣고 자연스럽게 녹음해서 제출하세요.",
    passageText: "I went to the museum with my family. We saw old paintings, shiny stones, and a big dinosaur.",
    audioFileName: "unit1_native.mp3",
    assignedDate: "2026-05-23",
    dueAt: "2026-05-25",
    status: "published"
  }
];

const seedAssignmentTargets: AssignmentTarget[] = [
  { id: "target-1", assignmentId: "calendar-hw-1", studentId: "student-1", status: "submitted", submittedAt: "2026-05-24T09:20:00.000Z", reviewed: false },
  { id: "target-2", assignmentId: "calendar-hw-1", studentId: "student-2", status: "submitted", submittedAt: "2026-05-24T10:10:00.000Z", reviewed: true, feedback: "속도와 억양이 안정적입니다." },
  { id: "target-3", assignmentId: "calendar-hw-1", studentId: "student-3", status: "assigned", reviewed: false }
];

export function homeworkTypeLabel(type: ClassHomeworkType) {
  if (type === "listening_recording") return "듣기/녹음";
  if (type === "writing") return "라이팅";
  if (type === "vocabulary") return "단어";
  return "일반";
}

function seedState(): ClassCalendarState {
  return {
    scheduleDays: seedScheduleDays,
    assignments: seedAssignments,
    assignmentTargets: seedAssignmentTargets
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readState(): ClassCalendarState {
  if (!canUseStorage()) return seedState();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(raw) as ClassCalendarState;
  } catch {
    const seeded = seedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeState(state: ClassCalendarState) {
  if (canUseStorage()) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const classCalendarRepository = {
  getInitialState() {
    return seedState();
  },
  loadState() {
    return readState();
  },
  saveState(state: ClassCalendarState) {
    writeState(state);
  },
  getScheduleDaysByClassId(classId: string, state = readState()) {
    return state.scheduleDays.filter((day) => day.classId === classId);
  },
  getAssignmentsByClassId(classId: string, state = readState()) {
    return state.assignments.filter((assignment) => assignment.classId === classId);
  },
  getAssignmentById(assignmentId: string, state = readState()) {
    return state.assignments.find((assignment) => assignment.id === assignmentId);
  },
  getTargetsByAssignmentId(assignmentId: string, state = readState()) {
    return state.assignmentTargets.filter((target) => target.assignmentId === assignmentId);
  },
  createHomeworkFromCalendar(input: CreateCalendarHomeworkInput, currentState = readState()) {
    const id = `calendar-hw-${Date.now()}`;
    const assignment: CalendarAssignment = {
      id,
      classId: input.classId,
      scheduleDayId: input.scheduleDayId,
      title: input.title,
      type: input.type,
      description: input.description,
      passageText: input.passageText,
      audioFileName: input.audioFileName,
      assignedDate: input.assignedDate,
      dueAt: input.dueAt,
      status: input.status
    };
    const targets: AssignmentTarget[] = input.studentIds.map((studentId) => ({
      id: `target-${id}-${studentId}`,
      assignmentId: id,
      studentId,
      status: "assigned",
      reviewed: false
    }));
    const scheduleDays = currentState.scheduleDays.map((day) =>
      day.id === input.scheduleDayId ? { ...day, homeworkIds: [...day.homeworkIds, id] } : day
    );
    const nextState = {
      scheduleDays,
      assignments: [assignment, ...currentState.assignments],
      assignmentTargets: [...targets, ...currentState.assignmentTargets]
    };
    writeState(nextState);
    return { state: nextState, assignment, targets };
  },
  getLearningHistoryForManagedStudent(input: { studentId: string; classIds: string[]; classNames: string[] }, state = readState()): StudentLearningHistory[] {
    return state.assignments
      .filter((assignment) => input.classIds.includes(assignment.classId))
      .map((assignment): StudentLearningHistory => {
        const classIndex = input.classIds.indexOf(assignment.classId);
        const target = state.assignmentTargets.find((item) => item.assignmentId === assignment.id && item.studentId === input.studentId);
        return {
          id: `calendar-history-${assignment.id}`,
          studentId: input.studentId,
          date: assignment.assignedDate,
          assignmentTitle: assignment.title,
          assignmentType: assignment.type,
          className: input.classNames[classIndex] ?? "소속 반",
          submitStatus: target?.status === "submitted" ? "submitted" : target?.status === "late" ? "late" : "not_submitted",
          score: null,
          reviewStatus: target?.reviewed ? "reviewed" : target?.status === "submitted" ? "pending" : "none",
          detailHref: `/teacher/classes/${assignment.classId}/assignments/${assignment.id}`
        };
      });
  },
  getClassHomeworkRows(classId: string, students: Student[], state = readState()) {
    return state.assignments
      .filter((assignment) => assignment.classId === classId)
      .map((assignment) => {
        const targets = state.assignmentTargets.filter((target) => target.assignmentId === assignment.id);
        const submittedCount = targets.filter((target) => target.status === "submitted").length;
        return {
          assignment,
          totalCount: targets.length || students.length,
          submittedCount
        };
      });
  }
};
