"use client";

import { useEffect, useState } from "react";
import { AudioPlayer } from "@/components/ui/AudioPlayer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { formatDateTime } from "@/lib/format";
import type { Assignment } from "@/types/assignment";
import type { Student } from "@/types/student";
import type { Submission } from "@/types/submission";

type ReviewStatus = "reviewed" | "returned";

function statusLabel(status: Submission["status"]) {
  switch (status) {
    case "reviewed":
      return "승인";
    case "returned":
      return "반려";
    case "submitted":
      return "검토 대기";
    default:
      return "미제출";
  }
}

function statusTone(status: Submission["status"]) {
  if (status === "reviewed") return "green";
  if (status === "returned") return "red";
  if (status === "submitted") return "blue";
  return "gray";
}

function assignmentTypeLabel(type: Assignment["assignmentType"]) {
  if (type === "listening_recording") return "듣기/녹음";
  if (type === "writing") return "라이팅";
  return "퀴즈";
}

export function SubmissionReviewPanel({
  submission: initialSubmission,
  student,
  assignment
}: {
  submission: Submission;
  student?: Student;
  assignment?: Assignment;
}) {
  const [submission, setSubmission] = useState(initialSubmission);
  const [comment, setComment] = useState(initialSubmission.teacherComment ?? "");
  const [toast, setToast] = useState<string | null>(null);
  const item = assignment?.items[0];
  const submissionItem = submission.items[0];

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  function review(status: ReviewStatus) {
    setSubmission((current) => ({
      ...current,
      status,
      teacherComment: comment.trim() || undefined,
      reviewedAt: new Date().toISOString()
    }));
    setToast(status === "reviewed" ? "제출물을 승인했습니다." : "제출물을 반려했습니다.");
  }

  return (
    <div className="relative grid gap-4">
      {toast && <div className="fixed right-4 top-4 z-50 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft">{toast}</div>}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold">{student?.name ?? "학생"} / {assignment?.title ?? "숙제"}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={statusTone(submission.status)}>{statusLabel(submission.status)}</Badge>
              <Badge tone="blue">{assignment ? assignmentTypeLabel(assignment.assignmentType) : "숙제"}</Badge>
              <Badge>{formatDateTime(submission.submittedAt)}</Badge>
            </div>
          </div>
          <Button href={`/teacher/assignments/${submission.assignmentId}/submissions`} variant="secondary">
            제출 현황으로
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold">제출물 확인</h3>
        {assignment?.assignmentType === "listening_recording" ? (
          <div className="mt-4 grid gap-4">
            {item?.passageText && <p className="rounded-md bg-paper p-4 text-lg leading-8">{item.passageText}</p>}
            <AudioPlayer src={submissionItem?.recordingUrl} />
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-slate-500">파일명</dt><dd className="font-semibold">{submissionItem?.recordingFileName ?? "-"}</dd></div>
              <div><dt className="text-slate-500">길이</dt><dd className="font-semibold">{submissionItem?.recordingDurationSec ?? "-"}초</dd></div>
              <div><dt className="text-slate-500">형식</dt><dd className="font-semibold">{submissionItem?.recordingMimeType ?? "-"}</dd></div>
            </dl>
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed border-line p-6 text-sm text-slate-500">
            {assignment?.assignmentType === "writing" ? "라이팅 제출물 상세 영역입니다. 추후 작성 답안과 첨삭 UI를 연결합니다." : "퀴즈 제출물 상세 영역입니다. 추후 문항별 결과 UI를 연결합니다."}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-bold">검토</h3>
        <label className="mt-4 grid gap-2 text-sm font-semibold">
          피드백 (선택)
          <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="필요할 때만 피드백을 남기세요." />
        </label>
        <div className="mt-4 grid gap-2 sm:flex sm:justify-end">
          <Button variant="secondary" onClick={() => review("returned")}>반려</Button>
          <Button onClick={() => review("reviewed")}>승인</Button>
        </div>
      </Card>
    </div>
  );
}
