export type Assignment = {
  id: string;
  teacherId: string;
  classId: string;
  title: string;
  description?: string;
  assignmentType: "listening_recording" | "image_speaking" | "sentence_shadowing" | "free_speaking" | "writing" | "quiz" | "vocabulary" | "general";
  imageUrl?: string;
  imageStoragePath?: string;
  dueAt?: string;
  status: "draft" | "published" | "closed" | "archived";
  targetStatus?: "assigned" | "submitted" | "late" | "excused" | string;
  items: AssignmentItem[];
  createdAt: string;
};

export type AssignmentItem = {
  id: string;
  assignmentId: string;
  itemType: "listening_recording" | "image_speaking" | "sentence_shadowing" | "free_speaking" | "writing_prompt" | "quiz_question";
  title?: string;
  passageText: string;
  audioUrl?: string;
  audioFileName?: string;
  orderIndex: number;
  minRecordingSec: number;
  maxRecordingSec: number;
};
