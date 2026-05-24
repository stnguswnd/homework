export type RecordingSubmissionInput = {
  assignmentId: string;
  assignmentItemId: string;
  durationSec: number;
  file: Blob;
  fileName?: string;
};

export type TeacherSubmissionStatus = {
  studentId: string;
  studentName: string;
  classNames: string[];
  targetStatus: string;
  submittedAt: string | null;
  reviewed: boolean;
  submissionId: string | null;
  recordingUrl: string | null;
  teacherComment: string | null;
};

export async function submitRecording(input: RecordingSubmissionInput) {
  const formData = new FormData();
  formData.set("assignmentId", input.assignmentId);
  formData.set("assignmentItemId", input.assignmentItemId);
  formData.set("durationSec", String(input.durationSec));
  formData.set("file", input.file, input.fileName ?? "recording.webm");

  const response = await fetch("/api/student/submissions/recording", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "녹음 제출 중 오류가 발생했습니다.");
  }

  return data as { submissionId: string; recordingStoragePath: string; recordingUrl: string };
}

export async function listTeacherAssignmentSubmissions(assignmentId: string) {
  const response = await fetch(`/api/teacher/assignments/${assignmentId}/submissions`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("제출 현황을 불러오지 못했습니다.");
  }
  return response.json() as Promise<TeacherSubmissionStatus[]>;
}
