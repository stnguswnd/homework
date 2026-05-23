import { notFound } from "next/navigation";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { mockRepository } from "@/mocks/mockRepository";

export default async function StudentAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const assignment = mockRepository.getAssignmentById(assignmentId);
  if (!assignment) notFound();
  const item = assignment.items[0];

  return (
    <StudentLayout title="숙제 안내">
      <Card>
        <h1 className="text-2xl font-bold">{assignment.title}</h1>
        <p className="mt-3 text-lg leading-8 text-slate-700">{assignment.description}</p>
        <div className="mt-5 rounded-md bg-paper p-4">
          <p className="text-sm font-semibold text-slate-500">오늘 읽을 지문</p>
          <p className="mt-2 text-xl font-bold">{item.title}</p>
        </div>
        <Button href={`/student/assignments/${assignment.id}/listen`} className="mt-6 w-full min-h-14 text-lg">START</Button>
      </Card>
    </StudentLayout>
  );
}
