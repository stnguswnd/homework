import { mockAssignments, mockClasses, mockStudents, mockSubmissions } from "@/mocks/mockData";
import type { Class } from "@/types/class";

const CLASS_STORAGE_KEY = "homework-studio.classes.v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStoredClasses() {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(CLASS_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Class[];
  } catch {
    window.localStorage.removeItem(CLASS_STORAGE_KEY);
    return [];
  }
}

function writeStoredClasses(classes: Class[]) {
  if (canUseStorage()) window.localStorage.setItem(CLASS_STORAGE_KEY, JSON.stringify(classes));
}

function getAllClasses() {
  const storedClasses = readStoredClasses();
  const classIds = new Set(mockClasses.map((classItem) => classItem.id));
  return [...mockClasses, ...storedClasses.filter((classItem) => !classIds.has(classItem.id))];
}

export const mockRepository = {
  getTeacherDashboardSummary() {
    const submitted = mockSubmissions.filter((submission) => submission.status !== "not_submitted");
    return {
      classCount: mockClasses.length,
      studentCount: mockStudents.length,
      activeAssignmentCount: mockAssignments.filter((assignment) => assignment.status === "published").length,
      dueTodayCount: 1,
      missingStudentCount: Math.max(0, mockStudents.length - submitted.length),
      recentSubmissions: submitted.slice(0, 5)
    };
  },
  getClasses() {
    return getAllClasses();
  },
  getClassById(classId: string) {
    return getAllClasses().find((classItem) => classItem.id === classId);
  },
  createClass(input: { name: string; description?: string }) {
    const classItem: Class = {
      id: `class-${Date.now()}`,
      teacherId: "teacher-1",
      name: input.name,
      description: input.description,
      status: "active",
      studentCount: 0,
      activeAssignmentCount: 0,
      createdAt: new Date().toISOString()
    };
    writeStoredClasses([classItem, ...readStoredClasses()]);
    return classItem;
  },
  getStudents() {
    return mockStudents;
  },
  getStudentsByClassId(classId: string) {
    return mockStudents.filter((student) => student.classIds.includes(classId));
  },
  getAssignments() {
    return mockAssignments;
  },
  getAssignmentsByClassId(classId: string) {
    return mockAssignments.filter((assignment) => assignment.classId === classId);
  },
  getAssignmentById(assignmentId: string) {
    return mockAssignments.find((assignment) => assignment.id === assignmentId);
  },
  getSubmissionsByAssignmentId(assignmentId: string) {
    return mockSubmissions.filter((submission) => submission.assignmentId === assignmentId);
  },
  getSubmissionById(submissionId: string) {
    return mockSubmissions.find((submission) => submission.id === submissionId);
  },
  getStudentById(studentId: string) {
    return mockStudents.find((student) => student.id === studentId);
  },
  getStudentByAccessCode(accessCode: string) {
    return mockStudents.find((student) => student.accessCode === accessCode.toUpperCase()) ?? mockStudents[0];
  },
  getStudentAssignments(studentId: string) {
    const student = mockStudents.find((item) => item.id === studentId) ?? mockStudents[0];
    return mockAssignments.filter((assignment) => student.classIds.includes(assignment.classId));
  },
  async mockSubmitRecording(input: {
    assignmentId: string;
    itemId: string;
    studentId: string;
    blob: Blob;
    durationSec: number;
  }): Promise<{ submissionId: string }> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { submissionId: `mock-${input.assignmentId}-${Date.now()}` };
  }
};
