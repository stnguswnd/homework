import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { studentRepository } from "@/features/student-management/repositories/studentRepository";
import type { StudentLearningHistory } from "@/features/student-management/types/studentManagement";
import { assignmentTypeLabel as formatAssignmentTypeLabel } from "@/lib/assignmentTypes";

function assignmentTypeLabel(type: string) {
  return formatAssignmentTypeLabel(type);
}

function submitStatusLabel(status: StudentLearningHistory["submitStatus"]) {
  if (status === "submitted") return "제출 완료";
  if (status === "late") return "지각 제출";
  return "미제출";
}

function reviewStatusLabel(status: StudentLearningHistory["reviewStatus"]) {
  if (status === "pending") return "검토 필요";
  if (status === "reviewed") return "검토 완료";
  return "미작성";
}

function submitTone(status: StudentLearningHistory["submitStatus"]) {
  if (status === "submitted") return "green";
  if (status === "late") return "yellow";
  return "red";
}

function reviewTone(status: StudentLearningHistory["reviewStatus"]) {
  if (status === "pending") return "yellow";
  if (status === "reviewed") return "green";
  return "gray";
}

export default async function StudentLearningHistoryPage({
  params
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const student = await studentRepository.getStudentById(studentId);
  if (!student) notFound();
  const history = await studentRepository.getLearningHistory(studentId);

  const submittedCount = history.filter((item) => item.submitStatus === "submitted" || item.submitStatus === "late").length;
  const missingCount = history.filter((item) => item.submitStatus === "not_submitted").length;
  const pendingCount = history.filter((item) => item.reviewStatus === "pending").length;

  return (
    <TeacherLayout title={`${student.name} 학습 이력`}>
      <div className="grid gap-5">
        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-action">{student.classNames.length > 0 ? student.classNames.join(", ") : "미배정"}</p>
              <h2 className="mt-1 text-2xl font-bold">{student.name}</h2>
              <p className="mt-2 text-sm text-slate-500">{student.schoolName ?? "-"} / {student.grade ?? "-"}</p>
            </div>
            <Button href="/teacher/classes" variant="secondary">팀 관리로</Button>
          </div>
        </Card>

        <div className="grid gap-3 md:grid-cols-4">
          <Card><p className="text-sm text-slate-500">전체 과제</p><p className="mt-2 text-2xl font-bold">{history.length}개</p></Card>
          <Card><p className="text-sm text-slate-500">제출 완료</p><p className="mt-2 text-2xl font-bold">{submittedCount}개</p></Card>
          <Card><p className="text-sm text-slate-500">미제출</p><p className="mt-2 text-2xl font-bold">{missingCount}개</p></Card>
          <Card><p className="text-sm text-slate-500">검토 필요</p><p className="mt-2 text-2xl font-bold">{pendingCount}개</p></Card>
        </div>

        <Card>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold">학습 이력</h3>
            <p className="text-sm text-slate-500">학생별 과제 제출 상태와 피드백 현황을 확인합니다.</p>
          </div>
          <div className="mt-4 grid gap-3">
            {history.length === 0 ? (
              <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-slate-500">아직 학습 이력이 없습니다.</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-md border border-line p-4 lg:grid-cols-[120px_1fr_170px_140px_120px_140px] lg:items-center">
                  <p className="text-sm font-bold text-slate-500">{item.date}</p>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{item.assignmentTitle}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.className ?? "-"}</p>
                  </div>
                  <Badge>{assignmentTypeLabel(item.assignmentType)}</Badge>
                  <Badge tone={submitTone(item.submitStatus)}>{submitStatusLabel(item.submitStatus)}</Badge>
                  <Badge tone={reviewTone(item.reviewStatus)}>{reviewStatusLabel(item.reviewStatus)}</Badge>
                  {item.detailHref ? (
                    <Button href={item.detailHref} variant={item.reviewStatus === "pending" ? "primary" : "secondary"}>
                      {item.reviewStatus === "pending" ? "피드백하기" : "상세"}
                    </Button>
                  ) : (
                    <Button disabled variant="secondary">피드백 없음</Button>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </TeacherLayout>
  );
}
