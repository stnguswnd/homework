import { redirect } from "next/navigation";

import { StudentLayout } from "@/components/layout/StudentLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { studentAssignmentRepository } from "@/features/assignments/repositories/studentAssignmentRepository";
import { formatDue } from "@/lib/format";
import { getStudentSession } from "@/server/auth/studentSession";

type AssignmentWithTarget = Awaited<ReturnType<typeof studentAssignmentRepository.getAssignmentsForStudent>>[number] & {
  targetStatus?: string;
};

function assignmentTypeLabel(type: string) {
  if (type === "listening_recording") return "Speaking";
  if (type === "sentence_shadowing") return "Shadowing";
  if (type === "image_speaking") return "Image Speaking";
  if (type === "writing") return "Writing";
  return "Homework";
}

function targetStatusLabel(status?: string) {
  if (status === "submitted" || status === "late") return "제출 완료";
  if (status === "assigned") return "미제출";
  return "진행 중";
}

function targetStatusTone(status?: string) {
  if (status === "submitted" || status === "late") return "green";
  if (status === "assigned") return "red";
  return "yellow";
}

export default async function StudentHomePage() {
  const session = await getStudentSession();

  if (!session) {
    redirect("/login");
  }

  const assignments = await studentAssignmentRepository.getAssignmentsForStudent(session.studentId) as AssignmentWithTarget[];

  return (
    <StudentLayout title="과제 목록">
      <div className="mb-5">
        <h1 className="text-3xl font-bold">오늘의 과제</h1>
        <p className="mt-2 text-slate-600">아래 과제를 완료하고 제출해주세요.</p>
      </div>
      <div className="grid gap-4">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="border-l-4 border-l-action">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="blue">{assignmentTypeLabel(assignment.assignmentType)}</Badge>
                  <Badge tone={targetStatusTone(assignment.targetStatus)}>{targetStatusLabel(assignment.targetStatus)}</Badge>
                  {assignment.dueAt && <Badge tone="yellow">마감 {formatDue(assignment.dueAt)}</Badge>}
                </div>
                <h2 className="mt-3 text-xl font-bold">{assignment.title}</h2>
                <p className="mt-2 leading-7 text-slate-600">{assignment.description ?? "원본 음원을 듣고 같은 문장을 따라 말하며 녹음해보세요."}</p>
              </div>
              <Button href={`/student/assignments/${assignment.id}`} className="min-h-12 shrink-0 text-base">
                {assignment.targetStatus === "submitted" || assignment.targetStatus === "late" ? "제출 내용 보기" : "과제 하기"}
              </Button>
            </div>
          </Card>
        ))}
        {assignments.length === 0 && <Card><p className="text-center text-slate-500">오늘 할 과제가 없습니다.</p></Card>}
      </div>
    </StudentLayout>
  );
}
