import { StudentLayout } from "@/components/layout/StudentLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDue } from "@/lib/format";
import { mockRepository } from "@/mocks/mockRepository";

export default function StudentHomePage() {
  const student = mockRepository.getStudentByAccessCode("JIWOO24");
  const assignments = mockRepository.getStudentAssignments(student.id);
  return (
    <StudentLayout title="숙제 목록">
      <h1 className="text-2xl font-bold">{student.name}의 숙제</h1>
      <div className="mt-5 grid gap-4">
        {assignments.map((assignment) => (
          <Card key={assignment.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{assignment.title}</h2>
                <p className="mt-2 text-slate-600">{assignment.description}</p>
              </div>
              <Badge tone="yellow">{formatDue(assignment.dueAt)}</Badge>
            </div>
            <Button href={`/student/assignments/${assignment.id}`} className="mt-4 w-full min-h-12 text-base">숙제 하기</Button>
          </Card>
        ))}
      </div>
    </StudentLayout>
  );
}
