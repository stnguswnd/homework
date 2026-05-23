export type Assignment = {
  id: string;
  teacherId: string;
  classId: string;
  title: string;
  description?: string;
  assignmentType: "listening_recording" | "writing" | "quiz";
  dueAt?: string;
  status: "draft" | "published" | "closed" | "archived";
  items: AssignmentItem[];
  createdAt: string;
};

export type AssignmentItem = {
  id: string;
  assignmentId: string;
  itemType: "listening_recording" | "writing_prompt" | "quiz_question";
  title?: string;
  passageText: string;
  audioUrl?: string;
  audioFileName?: string;
  orderIndex: number;
  minRecordingSec: number;
  maxRecordingSec: number;
};
