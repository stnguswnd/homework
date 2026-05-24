"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";

import { StudentLayout } from "@/components/layout/StudentLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { listStudentAssignments } from "@/features/assignments/api/assignmentApi";
import { submitRecording } from "@/features/submissions/api/submissionApi";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import type { Assignment } from "@/types/assignment";

function Stepper() {
  const steps = ["과제 안내", "듣기", "녹음", "제출"];
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-4">
      {steps.map((step, index) => (
        <div key={step} className={index === 2 ? "rounded-full bg-action px-4 py-2 text-center text-sm font-bold text-white" : index < 2 ? "rounded-full bg-green-50 px-4 py-2 text-center text-sm font-bold text-green-700" : "rounded-full bg-slate-100 px-4 py-2 text-center text-sm font-bold text-slate-500"}>
          {index < 2 ? "✓ " : `${index + 1}. `}{step}
        </div>
      ))}
    </div>
  );
}

function timeLabel(value: number) {
  return `${Math.round(value || 0)}초`;
}

function recordingStatusLabel(state: string) {
  if (state === "recording") return "녹음 중";
  if (state === "recorded") return "녹음 완료";
  if (state === "requesting_permission") return "마이크 권한 요청 중";
  return "대기 중";
}

export default function RecordPage() {
  const params = useParams<{ assignmentId: string }>();
  const router = useRouter();
  const recorder = useAudioRecorder();
  const recordedAudioRef = useRef<HTMLAudioElement | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState("");
  const [recordedPlaying, setRecordedPlaying] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    listStudentAssignments()
      .then((items) => setAssignments(items))
      .catch((err) => setError(err instanceof Error ? err.message : "과제를 불러오지 못했습니다."));
  }, []);

  const assignment = useMemo(() => assignments.find((item) => item.id === params.assignmentId), [assignments, params.assignmentId]);
  const item = assignment?.items[0];
  const originalPlayer = useAudioPlayer(item?.audioUrl);
  const originalProgress = originalPlayer.duration ? Math.min((originalPlayer.currentTime / originalPlayer.duration) * 100, 100) : 0;
  const canSubmit = Boolean(recorder.recordingBlob && item) && recorder.durationSec >= (item?.minRecordingSec ?? 0);

  function pauseRecordedAudio() {
    recordedAudioRef.current?.pause();
    setRecordedPlaying(false);
  }

  async function playOriginalAudio() {
    pauseRecordedAudio();
    await originalPlayer.play();
  }

  function pauseOriginalAudio() {
    originalPlayer.pause();
  }

  async function restartOriginalAudio() {
    pauseRecordedAudio();
    await originalPlayer.replay();
  }

  async function startRecording() {
    pauseOriginalAudio();
    pauseRecordedAudio();
    await recorder.startRecording();
  }

  function stopRecording() {
    recorder.stopRecording();
  }

  async function playRecordedAudio() {
    if (!recordedAudioRef.current) return;
    pauseOriginalAudio();
    recordedAudioRef.current.currentTime = 0;
    await recordedAudioRef.current.play();
    setRecordedPlaying(true);
  }

  function resetRecording() {
    pauseRecordedAudio();
    recorder.resetRecording();
  }

  function submitHomework() {
    const recordingBlob = recorder.recordingBlob;
    if (!recordingBlob || !item || !canSubmit) return;
    setError("");
    startTransition(async () => {
      try {
        await submitRecording({
          assignmentId: params.assignmentId,
          assignmentItemId: item.id,
          durationSec: recorder.durationSec,
          file: recordingBlob,
          fileName: `recording-${Date.now()}.webm`,
        });
        router.push(`/student/assignments/${params.assignmentId}/complete`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "녹음 제출 중 오류가 발생했습니다.");
      }
    });
  }

  if (!assignment || !item) {
    return (
      <StudentLayout title="2 / 2 녹음">
        <Card>{error || "과제를 불러오는 중입니다."}</Card>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="2 / 2 녹음">
      <Stepper />
      <div className="grid gap-4">
        <Card>
          <p className="text-sm font-bold text-action">2 / 2 녹음</p>
          <h1 className="mt-2 text-2xl font-bold">{assignment.title}</h1>
        </Card>
        <Card>
          <h2 className="font-bold">읽을 문장</h2>
          <p className="mt-3 rounded-lg bg-paper p-4 text-lg leading-8">{item.passageText}</p>
        </Card>
        <Card>
          <h2 className="font-bold">원본 MP3 듣기</h2>
          <p className="mt-2 text-sm text-slate-500">녹음하기 전에 원본 음원을 다시 들어보세요.</p>
          <div className="mt-4 rounded-lg border border-line p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">재생 상태: {originalPlayer.state}</span>
              <span className="text-slate-500">{timeLabel(originalPlayer.currentTime)} / {timeLabel(originalPlayer.duration)}</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-action" style={{ width: `${originalProgress}%` }} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Button onClick={playOriginalAudio} className="min-h-12">원본 재생</Button>
              <Button onClick={pauseOriginalAudio} variant="secondary" className="min-h-12">일시정지</Button>
              <Button onClick={restartOriginalAudio} variant="secondary" className="min-h-12">처음부터 다시 듣기</Button>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="font-bold">내 녹음</h2>
          <div className="mt-4 rounded-lg border border-line p-4">
            <p className="font-semibold">녹음 상태: {recordingStatusLabel(recorder.state)}</p>
            <p className="mt-1 text-sm text-slate-500">녹음 시간: {recorder.durationSec}초 / 최소 {item.minRecordingSec}초</p>
            {recorder.state === "recording" && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">녹음 중입니다. 문장을 또박또박 읽어주세요.</p>}
            {recorder.recordingBlob && !canSubmit && <p className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm font-semibold text-yellow-800">최소 {item.minRecordingSec}초 이상 녹음해주세요.</p>}
            {recorder.errorMessage && <p className="mt-3 text-sm font-semibold text-danger">{recorder.errorMessage}</p>}
            {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
          </div>
          {recorder.previewUrl && (
            <audio
              ref={recordedAudioRef}
              className="mt-4 w-full"
              src={recorder.previewUrl}
              controls
              onPlay={() => {
                pauseOriginalAudio();
                setRecordedPlaying(true);
              }}
              onPause={() => setRecordedPlaying(false)}
              onEnded={() => setRecordedPlaying(false)}
            />
          )}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {recorder.state === "recording" ? (
              <Button onClick={stopRecording} variant="danger" className="min-h-14 text-lg">녹음 종료</Button>
            ) : (
              <Button onClick={startRecording} className="min-h-14 text-lg">녹음 시작</Button>
            )}
            <Button onClick={playRecordedAudio} disabled={!recorder.previewUrl || recordedPlaying} variant="secondary" className="min-h-14 text-lg">내 녹음 듣기</Button>
            <Button onClick={resetRecording} disabled={!recorder.previewUrl && recorder.state !== "recorded"} variant="secondary" className="min-h-14 text-lg">다시 녹음</Button>
            <Button onClick={submitHomework} disabled={!canSubmit || pending} className="min-h-14 text-lg">{pending ? "제출 중..." : "제출하기"}</Button>
          </div>
        </Card>
        <Button href={`/student/assignments/${assignment.id}/listen`} variant="secondary" className="min-h-12">이전: 다시 듣기</Button>
      </div>
    </StudentLayout>
  );
}
