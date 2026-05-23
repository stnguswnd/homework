export type StudentStatus = "active" | "inactive";

export type ManagedStudent = {
  id: string;
  studentId: string;
  password?: string;
  name: string;
  schoolName?: string;
  grade?: string;
  classIds: string[];
  classNames: string[];
  avatarKey: string;
  memo?: string;
  parentId?: string;
  parentPassword?: string;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
};

export type StudentLearningHistory = {
  id: string;
  studentId: string;
  date: string;
  assignmentTitle: string;
  assignmentType: "listening_recording" | "writing" | "quiz" | "vocabulary" | "general";
  className?: string;
  submitStatus: "submitted" | "not_submitted" | "late";
  score?: number | null;
  reviewStatus: "pending" | "reviewed" | "none";
  detailHref?: string;
};

export type StudentFeedbackHistory = {
  id: string;
  studentId: string;
  feedbackType: "RFB" | "AFB";
  date: string;
  assignmentTitle: string;
  itemTitle?: string;
  comment: string;
  score?: number | null;
  authorName?: string;
};

export type CertificateHistory = {
  id: string;
  studentId: string;
  courseTitle: string;
  completedAt: string;
  issueStatus: "not_issued" | "issued";
  certificateUrl?: string;
};

export type StudentManagementTab = "detail" | "learning" | "rfb" | "afb" | "certificate";

export type CreateManagedStudentInput = {
  studentId?: string;
  password?: string;
  name: string;
  schoolName?: string;
  grade?: string;
  className?: string;
  avatarKey?: string;
  memo?: string;
  parentId?: string;
  parentPassword?: string;
};

export type UpdateManagedStudentInput = Partial<
  Pick<ManagedStudent, "name" | "schoolName" | "grade" | "avatarKey" | "memo" | "parentId" | "parentPassword" | "status">
>;
