"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { StudentLayout } from "@/components/layout/StudentLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { listStudentAssignments } from "@/features/assignments/api/assignmentApi";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import type { Assignment } from "@/types/assignment";

function Stepper() {
  const steps = ["과제 안내", "듣기", "녹음", "제출"];
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-4">
      {steps.map((step, index) => (
        <div key={step} className={index === 1 ? "rounded-full bg-action px-4 py-2 text-center text-sm font-bold text-white" : index < 1 ? "rounded-full bg-green-50 px-4 py-2 text-center text-sm font-bold text-green-700" : "rounded-full bg-slate-100 px-4 py-2 text-center text-sm font-bold text-slate-500"}>
          {index < 1 ? "✓ " : `${index + 1}. `}{step}
        </div>
      ))}
    </div>
  );
}

function timeLabel(value: number) {
  return `${Math.round(value || 0)}초`;
}

export default function ListenPage() {
  const params = useParams<{ assignmentId: string }>();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState("");
  const [heardOnce, setHeardOnce] = useState(false);

  useEffect(() => {
    listStudentAssignments()
      .then((items) => setAssignments(items))
      .catch((err) => setError(err instanceof Error ? err.message : "과제를 불러오지 못했습니다."));
  }, []);

  const assignment = useMemo(() => assignments.find((item) => item.id === params.assignmentId), [assignments, params.assignmentId]);
  const item = assignment?.items[0];
  const player = useAudioPlayer(item?.audioUrl);
  const progress = player.duration ? Math.min((player.currentTime / player.duration) * 100, 100) : 0;

  useEffect(() => {
    if (player.state === "ended") setHeardOnce(true);
  }, [player.state]);

  if (!assignment || !item) {
    return (
      <StudentLayout title="1 / 2 듣기">
        <Card>{error || "과제를 불러오는 중입니다."}</Card>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="1 / 2 듣기">
      <Stepper />
      <div className="grid gap-4">
        <Card>
          <p className="text-sm font-bold text-action">1 / 2 듣기</p>
          <h1 className="mt-2 text-2xl font-bold">{assignment.title}</h1>
        </Card>
        <Card>
          <h2 className="font-bold">읽을 문장</h2>
          <p className="mt-3 rounded-lg bg-paper p-4 text-lg leading-8">{item.passageText}</p>
        </Card>
        <Card>
          <h2 className="font-bold">원본 MP3 듣기</h2>
          <p className="mt-2 text-sm text-slate-500">원본 음원을 충분히 듣고 다음 단계로 넘어가세요.</p>
          <div className="mt-4 rounded-lg border border-line p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">재생 상태: {player.state}</span>
              <span className="text-slate-500">{timeLabel(player.currentTime)} / {timeLabel(player.duration)}</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-action" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Button onClick={player.play} className="min-h-12">재생</Button>
              <Button onClick={player.pause} variant="secondary" className="min-h-12">일시정지</Button>
              <Button onClick={player.replay} variant="secondary" className="min-h-12">처음부터 다시 듣기</Button>
            </div>
          </div>
        </Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button href={`/student/assignments/${assignment.id}`} variant="secondary" className="min-h-12">이전</Button>
          <Button onClick={player.replay} variant="secondary" className="min-h-12">다시 듣기</Button>
          {heardOnce || player.state === "ended" ? (
            <Button href={`/student/assignments/${assignment.id}/record`} className="min-h-12">다음: 녹음하기</Button>
          ) : (
            <Button disabled className="min-h-12">다음: 녹음하기</Button>
          )}
        </div>
        {!heardOnce && player.state !== "ended" && <p className="text-center text-sm font-semibold text-slate-500">원본 MP3를 한 번 끝까지 들으면 다음 단계로 넘어갈 수 있어요.</p>}
      </div>
    </StudentLayout>
  );
}
