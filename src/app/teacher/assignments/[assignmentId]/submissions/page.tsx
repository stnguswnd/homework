import { notFound } from "next/navigation";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Card } from "@/components/ui/Card";
import { mockRepository } from "@/mocks/mockRepository";
import { SubmissionOverviewTable } from "./SubmissionOverviewTable";

export default async function SubmissionsPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const assignment = mockRepository.getAssignmentById(assignmentId);
  if (!assignment) notFound();
  const classStudents = mockRepository.getStudentsByClassId(assignment.classId);
  const submissions = mockRepository.getSubmissionsByAssignmentId(assignment.id);
  const submittedCount = submissions.filter((item) => item.status !== "not_submitted").length;

  return (
    <TeacherLayout title="제출 현황">
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-slate-500">제출률</p><p className="mt-2 text-3xl font-bold">{Math.round((submittedCount / classStudents.length) * 100)}%</p></Card>
        <Card><p className="text-sm text-slate-500">제출</p><p className="mt-2 text-3xl font-bold">{submittedCount}</p></Card>
        <Card><p className="text-sm text-slate-500">미제출</p><p className="mt-2 text-3xl font-bold">{classStudents.length - submittedCount}</p></Card>
      </div>
      <Card className="mt-4">
        <h2 className="text-lg font-bold">{assignment.title}</h2>
        <p className="mt-2 text-sm text-slate-500">학생별 제출과 검토 상태를 한눈에 확인하고, 상세보기에서 제출물을 검토합니다.</p>
        <SubmissionOverviewTable students={classStudents} submissions={submissions} />
      </Card>
    </TeacherLayout>
  );
}
