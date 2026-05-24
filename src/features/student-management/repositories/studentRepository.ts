import type {
  CreateManagedStudentInput,
  ManagedStudent,
  StudentLearningHistory,
  UpdateManagedStudentInput
} from "@/features/student-management/types/studentManagement";
import { classCalendarRepository } from "@/features/class-calendar/repositories/classCalendarRepository";

const now = "2026-05-23T12:42:45.000Z";

const mockManagedStudents: ManagedStudent[] = [
  {
    id: "student-1",
    studentId: "JIWOO24",
    password: "password123",
    name: "이지우",
    schoolName: "연세초",
    grade: "초4",
    classIds: ["class-a"],
    classNames: ["월수 Basic Speaking"],
    avatarKey: "girl-brown",
    memo: "발음 과제는 잘 따라오지만, 녹음 제출을 자주 잊음.",
    parentId: "jiwoo-parent",
    parentPassword: "parent123",
    status: "active",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "student-2",
    studentId: "SEOJUN7",
    name: "박서준",
    schoolName: "서울초",
    grade: "초3",
    classIds: ["class-a"],
    classNames: ["월수 Basic Speaking"],
    avatarKey: "boy-dark",
    memo: "라이팅 과제에서 문장 첫 글자 대문자 확인 필요.",
    parentId: "seojun-parent",
    status: "active",
    createdAt: "2026-05-21T08:10:00.000Z",
    updatedAt: "2026-05-21T08:10:00.000Z"
  },
  {
    id: "student-3",
    studentId: "HAYUN9",
    name: "최하윤",
    schoolName: "하늘초",
    grade: "초5",
    classIds: ["class-a", "class-b"],
    classNames: ["월수 Basic Speaking", "화목 Reading Plus"],
    avatarKey: "girl-red",
    status: "active",
    createdAt: "2026-05-18T09:20:00.000Z",
    updatedAt: "2026-05-18T09:20:00.000Z"
  },
  {
    id: "student-4",
    studentId: "DOYUN1",
    name: "정도윤",
    schoolName: "서강초",
    grade: "초4",
    classIds: ["class-b"],
    classNames: ["화목 Reading Plus"],
    avatarKey: "robot",
    status: "inactive",
    createdAt: "2026-05-14T10:00:00.000Z",
    updatedAt: "2026-05-20T10:00:00.000Z"
  },
  {
    id: "student-5",
    studentId: "ARIN55",
    name: "한아린",
    schoolName: "하늘초",
    grade: "초5",
    classIds: ["class-b"],
    classNames: ["화목 Reading Plus"],
    avatarKey: "girl-black",
    status: "active",
    createdAt: "2026-05-18T09:20:00.000Z",
    updatedAt: "2026-05-18T09:20:00.000Z"
  }
];

const mockLearningHistory: StudentLearningHistory[] = [
  {
    id: "history-001",
    studentId: "student-1",
    date: "2026-05-23",
    assignmentTitle: "Discovery 4.1 Unit 1 Speaking",
    assignmentType: "listening_recording",
    className: "월수 Basic Speaking",
    submitStatus: "submitted",
    score: null,
    reviewStatus: "pending",
    detailHref: "/teacher/submissions/submission-1"
  },
  {
    id: "history-002",
    studentId: "student-1",
    date: "2026-05-20",
    assignmentTitle: "Writing Practice 01",
    assignmentType: "writing",
    className: "월수 Basic Speaking",
    submitStatus: "not_submitted",
    score: null,
    reviewStatus: "none"
  },
  {
    id: "history-003",
    studentId: "student-2",
    date: "2026-05-22",
    assignmentTitle: "Reading Plus Shadowing 03",
    assignmentType: "listening_recording",
    className: "월수 Basic Speaking",
    submitStatus: "late",
    score: 86,
    reviewStatus: "reviewed"
  }
];

function createStudentId(input?: string) {
  return input?.trim() || `student_${Date.now()}`;
}

export const studentRepository = {
  async getStudents() {
    return mockManagedStudents;
  },
  async getStudentById(studentId: string) {
    return mockManagedStudents.find((student) => student.id === studentId);
  },
  async createStudent(input: CreateManagedStudentInput) {
    const createdAt = new Date().toISOString();
    const student: ManagedStudent = {
      id: `student-${Date.now()}`,
      studentId: createStudentId(input.studentId),
      password: input.password,
      name: input.name,
      schoolName: input.schoolName,
      grade: input.grade,
      classIds: input.classId ? [input.classId] : [],
      classNames: input.className ? [input.className] : [],
      avatarKey: input.avatarKey ?? "robot",
      memo: input.memo,
      parentId: input.parentId,
      parentPassword: input.parentPassword,
      status: "active",
      createdAt,
      updatedAt: createdAt
    };
    return student;
  },
  async updateStudent(studentId: string, input: UpdateManagedStudentInput, students: ManagedStudent[]) {
    return students.map((student) =>
      student.id === studentId ? { ...student, ...input, updatedAt: new Date().toISOString() } : student
    );
  },
  async deleteStudent(studentId: string, students: ManagedStudent[]) {
    return students.map((student) =>
      student.id === studentId ? { ...student, status: "inactive" as const, updatedAt: new Date().toISOString() } : student
    );
  },
  async getLearningHistory(studentId: string) {
    const student = mockManagedStudents.find((item) => item.id === studentId);
    const baseHistory = mockLearningHistory.filter((item) => item.studentId === studentId);
    if (!student) return baseHistory;
    const calendarHistory = classCalendarRepository
      .getLearningHistoryForManagedStudent({ studentId, classIds: student.classIds, classNames: student.classNames })
      .map((item) => ({ ...item, studentId }));
    const existingIds = new Set(baseHistory.map((item) => item.assignmentTitle));
    return [...calendarHistory.filter((item) => !existingIds.has(item.assignmentTitle)), ...baseHistory];
  }
};

export const studentAvatars = ["robot", "boy-blonde", "girl-brown", "boy-dark", "girl-black", "boy-orange", "girl-red"];
export const gradeOptions = ["미취학", "초1", "초2", "초3", "초4", "초5", "초6", "중1", "중2", "중3", "기타"];
