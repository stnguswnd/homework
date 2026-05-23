import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDue } from "@/lib/format";
import { mockRepository } from "@/mocks/mockRepository";

export default function AssignmentsPage() {
  return (
    <TeacherLayout title="숙제 목록">
      <div className="mb-4 flex justify-end"><Button href="/teacher/assignments/new">숙제 만들기</Button></div>
      <div className="grid gap-4">
        {mockRepository.getAssignments().map((assignment) => {
          const classItem = mockRepository.getClassById(assignment.classId);
          const submissions = mockRepository.getSubmissionsByAssignmentId(assignment.id);
          return (
            <Card key={assignment.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-bold">{assignment.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{assignment.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2"><Badge tone="blue">{classItem?.name}</Badge><Badge tone="yellow">{formatDue(assignment.dueAt)}</Badge><Badge>{assignment.status}</Badge></div>
                </div>
                <div className="flex gap-2">
                  <Button href={`/teacher/assignments/${assignment.id}`} variant="secondary">상세</Button>
                  <Button href={`/teacher/assignments/${assignment.id}/submissions`}>제출 현황 {submissions.length}</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </TeacherLayout>
  );
}
