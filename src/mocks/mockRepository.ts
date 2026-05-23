import { mockAssignments, mockClasses, mockStudents, mockSubmissions } from "@/mocks/mockData";

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
    return mockClasses;
  },
  getClassById(classId: string) {
    return mockClasses.find((classItem) => classItem.id === classId);
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
