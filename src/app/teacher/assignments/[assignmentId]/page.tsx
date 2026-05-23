import { notFound } from "next/navigation";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { AudioPlayer } from "@/components/ui/AudioPlayer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDue } from "@/lib/format";
import { mockRepository } from "@/mocks/mockRepository";

export default async function AssignmentDetailPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const assignment = mockRepository.getAssignmentById(assignmentId);
  if (!assignment) notFound();
  const item = assignment.items[0];

  return (
    <TeacherLayout title="숙제 상세">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold">{assignment.title}</h2>
            <p className="mt-2 text-slate-600">{assignment.description}</p>
            <div className="mt-3 flex gap-2"><Badge>{assignment.status}</Badge><Badge tone="yellow">{formatDue(assignment.dueAt)}</Badge></div>
          </div>
          <Button href={`/teacher/assignments/${assignment.id}/submissions`}>제출 현황 보기</Button>
        </div>
        <div className="mt-6 grid gap-4">
          <h3 className="font-bold">{item.title}</h3>
          <p className="rounded-md bg-paper p-4 text-lg leading-8">{item.passageText}</p>
          <AudioPlayer src={item.audioUrl} />
        </div>
      </Card>
    </TeacherLayout>
  );
}
