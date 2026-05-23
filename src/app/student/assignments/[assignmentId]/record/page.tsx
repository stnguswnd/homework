"use client";

import { useParams, notFound } from "next/navigation";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { mockRepository } from "@/mocks/mockRepository";

export default function RecordPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignment = mockRepository.getAssignmentById(params.assignmentId);
  const recorder = useAudioRecorder();
  if (!assignment) notFound();
  const currentAssignment = assignment;
  const item = currentAssignment.items[0];
  const canSubmit = Boolean(recorder.recordingBlob) && recorder.durationSec >= item.minRecordingSec;

  function submit() {
    if (!recorder.recordingBlob || !canSubmit) return;
    window.alert("제출 테스트 완료: 녹음 Blob이 생성되었고 미리듣기가 가능합니다. Supabase 전송은 아직 실행하지 않습니다.");
  }

  return (
    <StudentLayout title="2 / 2 녹음">
      <Card>
        <p className="text-sm font-bold text-action">2 / 2 녹음</p>
        <h1 className="mt-2 text-2xl font-bold">{currentAssignment.title}</h1>
        <p className="mt-5 rounded-md bg-paper p-4 text-lg leading-8">{item.passageText}</p>
        <div className="mt-5 rounded-md border border-line p-4">
          <p className="font-semibold">녹음 상태: {recorder.state}</p>
          <p className="text-sm text-slate-500">녹음 시간 {recorder.durationSec}초 / 최소 {item.minRecordingSec}초</p>
          {recorder.errorMessage && <p className="mt-2 text-sm font-semibold text-danger">{recorder.errorMessage}</p>}
        </div>
        {recorder.previewUrl && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold">내 녹음 듣기</p>
            <audio className="w-full" src={recorder.previewUrl} controls />
          </div>
        )}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {recorder.state === "recording" ? (
            <Button onClick={recorder.stopRecording} variant="danger" className="min-h-14 text-lg">녹음 종료</Button>
          ) : (
            <Button onClick={recorder.startRecording} className="min-h-14 text-lg">녹음 시작</Button>
          )}
          <Button onClick={recorder.resetRecording} variant="secondary" className="min-h-14 text-lg">다시 녹음</Button>
          <Button onClick={submit} disabled={!canSubmit} className="min-h-14 text-lg sm:col-span-2">
            제출하기
          </Button>
        </div>
      </Card>
    </StudentLayout>
  );
}
