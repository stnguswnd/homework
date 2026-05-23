export type ClassHomeworkType = "listening_recording" | "writing" | "vocabulary" | "general";

export type ClassScheduleDay = {
  id: string;
  classId: string;
  date: string;
  hasClass: boolean;
  startTime?: string;
  endTime?: string;
  bookTitle?: string;
  progressTitle?: string;
  progressMemo?: string;
  nextPrep?: string;
  homeworkIds: string[];
};

export type CalendarAssignment = {
  id: string;
  classId: string;
  scheduleDayId?: string;
  title: string;
  type: ClassHomeworkType;
  description?: string;
  passageText?: string;
  audioFileName?: string;
  assignedDate: string;
  dueAt?: string;
  status: "draft" | "published" | "closed";
};

export type AssignmentTarget = {
  id: string;
  assignmentId: string;
  studentId: string;
  status: "assigned" | "submitted" | "late" | "excused";
  submittedAt?: string;
  reviewed?: boolean;
  feedback?: string;
};

export type CreateCalendarHomeworkInput = {
  classId: string;
  scheduleDayId: string;
  assignedDate: string;
  studentIds: string[];
  title: string;
  type: ClassHomeworkType;
  description?: string;
  dueAt?: string;
  passageText?: string;
  audioFileName?: string;
  status: "draft" | "published";
};

export type ClassCalendarState = {
  scheduleDays: ClassScheduleDay[];
  assignments: CalendarAssignment[];
  assignmentTargets: AssignmentTarget[];
};
