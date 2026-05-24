"use client";

import { useState } from "react";
import { AudioPlayer } from "@/components/ui/AudioPlayer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { formatDateTime } from "@/lib/format";

type SubmissionDetail = {
  submissionId: string;
  student: { id: string; name: string; schoolName?: string; grade?: string };
  assignment: { id: string; title: string; assignmentType: string };
  items: Array<{
    assignmentItemId: string;
    title?: string;
    passageText?: string;
    audioUrl?: string;
    recordingUrl?: string;
    recordingDurationSec?: number;
    recordingFileName?: string;
  }>;
  status: string;
  submittedAt?: string;
  reviewedAt?: string;
  teacherComment?: string;
};

function statusLabel(status: string) {
  if (status === "reviewed") return "승인";
  if (status === "returned") return "반려";
  if (status === "submitted") return "검토 대기";
  return status;
}

export function SubmissionReviewPanel({ detail }: { detail: SubmissionDetail }) {
  const [comment, setComment] = useState(detail.teacherComment ?? "");
  const [status, setStatus] = useState(detail.status);
  const [message, setMessage] = useState("");

  async function review(nextStatus: "reviewed" | "returned") {
    const response = await fetch(`/api/teacher/submissions/${detail.submissionId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, teacherComment: comment }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(data?.error ?? "피드백 저장에 실패했습니다.");
      return;
    }
    setStatus(nextStatus);
    setMessage(nextStatus === "reviewed" ? "승인 피드백을 저장했습니다." : "반려 피드백을 저장했습니다.");
  }

  return (
    <div className="grid gap-4">
      {message && <p className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-action">{message}</p>}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold">{detail.student.name} / {detail.assignment.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={status === "reviewed" ? "green" : status === "returned" ? "red" : "blue"}>{statusLabel(status)}</Badge>
              <Badge tone="blue">{detail.assignment.assignmentType}</Badge>
              <Badge>{formatDateTime(detail.submittedAt)}</Badge>
            </div>
          </div>
          <Button href="/teacher/assignments" variant="secondary">숙제 관리로</Button>
        </div>
      </Card>

      {detail.items.map((item) => (
        <Card key={item.assignmentItemId}>
          <h3 className="text-lg font-bold">{item.title ?? "제출 항목"}</h3>
          {item.passageText && <p className="mt-4 rounded-md bg-paper p-4 text-lg leading-8">{item.passageText}</p>}
          {item.audioUrl && <div className="mt-4"><p className="mb-2 text-sm font-semibold">원본 음원</p><AudioPlayer src={item.audioUrl} /></div>}
          {item.recordingUrl && <div className="mt-4"><p className="mb-2 text-sm font-semibold">학생 녹음</p><AudioPlayer src={item.recordingUrl} /></div>}
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">파일명</dt><dd className="font-semibold">{item.recordingFileName ?? "-"}</dd></div>
            <div><dt className="text-slate-500">길이</dt><dd className="font-semibold">{item.recordingDurationSec ?? "-"}초</dd></div>
          </dl>
        </Card>
      ))}

      <Card>
        <h3 className="text-lg font-bold">피드백</h3>
        <label className="mt-4 grid gap-2 text-sm font-semibold">
          강사 코멘트
          <Textarea value={comment} onChange={(event) => setComment(event.target.value)} />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => review("returned")}>반려</Button>
          <Button onClick={() => review("reviewed")}>승인</Button>
        </div>
      </Card>
    </div>
  );
}
