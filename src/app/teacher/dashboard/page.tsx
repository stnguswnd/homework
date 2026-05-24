import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format";
import { mockRepository } from "@/mocks/mockRepository";

export default function TeacherDashboardPage() {
  const summary = mockRepository.getTeacherDashboardSummary();
  const classes = mockRepository.getClasses();

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
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">반별 학생</h2>
          <Button href="/teacher/students" variant="secondary">학생 관리로</Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {classes.map((classItem) => {
            const students = mockRepository.getStudentsByClassId(classItem.id);
            return (
              <Card key={classItem.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{classItem.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{classItem.description}</p>
                  </div>
                  <Badge tone={classItem.status === "active" ? "green" : "gray"}>{classItem.status === "active" ? "운영중" : "보관"}</Badge>
                </div>
                <div className="mt-4 grid gap-2">
                  {students.length === 0 ? (
                    <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-500">배정된 학생이 없습니다.</p>
                  ) : (
                    students.map((student) => (
                      <div key={student.id} className="flex items-center justify-between gap-3 rounded-md border border-line p-3">
                        <div>
                          <p className="font-semibold">{student.name}</p>
                          <p className="text-xs text-slate-500">{student.accessCode}</p>
                        </div>
                        <Badge tone={student.status === "active" ? "green" : "gray"}>{student.status === "active" ? "활성" : "비활성"}</Badge>
                      </div>
                    ))
                  )}
                </div>
                <Button href={`/teacher/classes/${classItem.id}`} className="mt-4 w-full" variant="secondary">반 상세 보기</Button>
              </Card>
            );
          })}
        </div>
      </div>
    </TeacherLayout>
  );
}
