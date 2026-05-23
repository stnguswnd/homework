import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format";
import { mockRepository } from "@/mocks/mockRepository";

export default function TeacherDashboardPage() {
  const summary = mockRepository.getTeacherDashboardSummary();

  const metrics = [
    ["총 반 수", summary.classCount],
    ["총 학생 수", summary.studentCount],
    ["진행 중 숙제", summary.activeAssignmentCount],
    ["오늘 마감", summary.dueTodayCount],
    ["미제출 학생", summary.missingStudentCount]
  ];

  return (
    <TeacherLayout title="대시보드">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_280px]">
        <Card>
          <h2 className="text-lg font-bold">최근 제출</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-slate-500">
                <tr><th className="py-2">학생</th><th>숙제</th><th>제출 시간</th><th>상태</th></tr>
              </thead>
              <tbody>
                {summary.recentSubmissions.map((submission) => {
                  const student = mockRepository.getStudentById(submission.studentId);
                  const assignment = mockRepository.getAssignmentById(submission.assignmentId);
                  return (
                    <tr key={submission.id} className="border-t border-line">
                      <td className="py-3 font-semibold">{student?.name}</td>
                      <td>{assignment?.title}</td>
                      <td>{formatDateTime(submission.submittedAt)}</td>
                      <td><Badge tone={submission.status === "reviewed" ? "green" : "blue"}>{submission.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-bold">빠른 이동</h2>
          <div className="mt-4 grid gap-2">
            <Button href="/teacher/classes">반 관리</Button>
            <Button href="/teacher/students" variant="secondary">학생 관리</Button>
            <Button href="/teacher/assignments/new" variant="secondary">숙제 만들기</Button>
            <Button href="/teacher/assignments/assignment-1/submissions" variant="secondary">제출 현황 보기</Button>
          </div>
        </Card>
      </div>
    </TeacherLayout>
  );
}
