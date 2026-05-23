import { notFound } from "next/navigation";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { mockRepository } from "@/mocks/mockRepository";
import { SubmissionReviewPanel } from "./SubmissionReviewPanel";

export default async function SubmissionDetailPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const submission = mockRepository.getSubmissionById(submissionId);
  if (!submission) notFound();
  const student = mockRepository.getStudentById(submission.studentId);
  const assignment = mockRepository.getAssignmentById(submission.assignmentId);

  return (
    <TeacherLayout title="제출 상세">
      <SubmissionReviewPanel submission={submission} student={student} assignment={assignment} />
    </TeacherLayout>
  );
}
