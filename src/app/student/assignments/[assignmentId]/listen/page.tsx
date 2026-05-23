"use client";

import { notFound, useParams } from "next/navigation";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { mockRepository } from "@/mocks/mockRepository";

export default function ListenPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignment = mockRepository.getAssignmentById(params.assignmentId);
  if (!assignment) notFound();
  const currentAssignment = assignment;
  const item = currentAssignment.items[0];
  const player = useAudioPlayer(item.audioUrl);

  return (
    <StudentLayout title="1 / 2 듣기">
      <Card>
        <p className="text-sm font-bold text-action">1 / 2 듣기</p>
        <h1 className="mt-2 text-2xl font-bold">{currentAssignment.title}</h1>
        <p className="mt-5 rounded-md bg-paper p-4 text-lg leading-8">{item.passageText}</p>
        <div className="mt-5 rounded-md border border-line p-4">
          <p className="font-semibold">재생 상태: {player.state}</p>
          <p className="text-sm text-slate-500">{Math.round(player.currentTime)}초 / {Math.round(player.duration || 0)}초</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Button onClick={player.play} className="min-h-14 text-lg">START</Button>
          <Button onClick={player.replay} variant="secondary" className="min-h-14 text-lg">다시 듣기</Button>
          <Button href={`/student/assignments/${currentAssignment.id}/record`} className="min-h-14 text-lg">다음</Button>
        </div>
      </Card>
    </StudentLayout>
  );
}
