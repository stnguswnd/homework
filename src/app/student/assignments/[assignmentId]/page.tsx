import { notFound, redirect } from "next/navigation";

import { StudentLayout } from "@/components/layout/StudentLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { studentAssignmentRepository } from "@/features/assignments/repositories/studentAssignmentRepository";
import { formatDue } from "@/lib/format";
import { getStudentSession } from "@/server/auth/studentSession";

function Stepper() {
  const steps = ["과제 안내", "듣기", "녹음", "제출"];
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-4">
      {steps.map((step, index) => (
        <div key={step} className={index === 0 ? "rounded-full bg-action px-4 py-2 text-center text-sm font-bold text-white" : "rounded-full bg-blue-50 px-4 py-2 text-center text-sm font-bold text-action"}>
          {index + 1}. {step}
        </div>
      ))}
    </div>
  );
}

function assignmentTypeLabel(type: string) {
  if (type === "listening_recording") return "Speaking";
  if (type === "sentence_shadowing") return "Shadowing";
  return "Homework";
}

export default async function StudentAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const [{ assignmentId }, session] = await Promise.all([params, getStudentSession()]);

  if (!session) redirect("/login");

  const assignment = await studentAssignmentRepository.getAssignmentForStudent(session.studentId, assignmentId);
  if (!assignment) notFound();
  const item = assignment.items[0];

  return (
    <StudentLayout title="과제 안내">
      <Stepper />
      <Card className="shadow-soft">
        <div className="flex flex-wrap gap-2">
          <Badge tone="blue">{assignmentTypeLabel(assignment.assignmentType)}</Badge>
          {assignment.dueAt && <Badge tone="yellow">마감 {formatDue(assignment.dueAt)}</Badge>}
        </div>
        <h1 className="mt-4 text-2xl font-bold">{assignment.title}</h1>
        <p className="mt-3 text-lg leading-8 text-slate-700">{assignment.description ?? "원본 음원을 듣고 같은 문장을 따라 말하며 녹음하는 숙제입니다."}</p>
        {assignment.imageUrl && (
          <div className="mt-5 overflow-hidden rounded-lg border border-line bg-slate-50">
            <img src={assignment.imageUrl} alt="" className="max-h-80 w-full object-contain" />
          </div>
        )}
        <div className="mt-5 rounded-lg bg-paper p-5">
          <p className="text-sm font-semibold text-slate-500">오늘 읽을 지문</p>
          <p className="mt-2 text-xl font-bold">{item.title ?? "Speaking Passage"}</p>
          <p className="mt-3 leading-8 text-slate-700">{item.passageText}</p>
        </div>
        <p className="mt-5 rounded-lg bg-blue-50 p-4 text-sm font-semibold leading-6 text-action">
          먼저 원본 음원을 듣고, 다음 단계에서 같은 문장을 따라 말하며 녹음해보세요.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button href="/student/home" variant="secondary" className="min-h-12 text-base">목록으로</Button>
          <Button href={`/student/assignments/${assignment.id}/listen`} className="min-h-12 text-base">시작하기</Button>
        </div>
      </Card>
    </StudentLayout>
  );
}
