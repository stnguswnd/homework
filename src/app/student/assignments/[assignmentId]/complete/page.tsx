import { redirect } from "next/navigation";

import { StudentLayout } from "@/components/layout/StudentLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { studentAssignmentRepository } from "@/features/assignments/repositories/studentAssignmentRepository";
import { getStudentSession } from "@/server/auth/studentSession";

function Stepper() {
  const steps = ["과제 안내", "듣기", "녹음", "제출"];
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-4">
      {steps.map((step, index) => (
        <div key={step} className={index === 3 ? "rounded-full bg-action px-4 py-2 text-center text-sm font-bold text-white" : "rounded-full bg-green-50 px-4 py-2 text-center text-sm font-bold text-green-700"}>
          {index < 3 ? "✓ " : "4. "}{step}
        </div>
      ))}
    </div>
  );
}

export default async function CompletePage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const [{ assignmentId }, session] = await Promise.all([params, getStudentSession()]);
  if (!session) redirect("/login");

  const assignment = await studentAssignmentRepository.getAssignmentForStudent(session.studentId, assignmentId);
  const submittedAt = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date());

  return (
    <StudentLayout title="제출 완료">
      <Stepper />
      <Card className="text-center shadow-soft">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-green-50 text-4xl font-bold text-green-700">✓</div>
        <h1 className="mt-5 text-2xl font-bold">제출이 완료되었어요!</h1>
        <p className="mt-2 text-slate-600">{assignment?.title ?? "숙제"} 제출을 저장했습니다.</p>
        <p className="mt-5 rounded-lg bg-paper p-3 text-sm">제출 시간: {submittedAt}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button href="/student/home" variant="secondary" className="min-h-12">과제 목록으로</Button>
          <Button href={`/student/assignments/${assignmentId}/record`} className="min-h-12">내 녹음 다시 하기</Button>
        </div>
      </Card>
    </StudentLayout>
  );
}
