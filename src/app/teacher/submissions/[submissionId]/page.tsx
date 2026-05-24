import { notFound } from "next/navigation";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { SubmissionReviewPanel } from "./SubmissionReviewPanel";

export default async function SubmissionDetailPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000"}/api/teacher/submissions/${submissionId}`, { cache: "no-store" });
  if (response.status === 404) notFound();
  const detail = await response.json();

  return (
    <TeacherLayout title="제출 상세">
      <SubmissionReviewPanel detail={detail} />
    </TeacherLayout>
  );
}
