"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { formatDateTime, formatDue } from "@/lib/format";
import {
  classCalendarRepository,
  homeworkTypeLabel
} from "@/features/class-calendar/repositories/classCalendarRepository";
import type { AssignmentTarget, CalendarAssignment, ClassCalendarState, ClassHomeworkType } from "@/features/class-calendar/types/classCalendar";
import type { Student } from "@/types/student";

function targetStatusLabel(status: AssignmentTarget["status"]) {
  if (status === "submitted") return "제출 완료";
  if (status === "late") return "지각";
  if (status === "excused") return "제외";
  return "미제출";
}

function targetStatusTone(status: AssignmentTarget["status"]) {
  if (status === "submitted") return "green";
  if (status === "late") return "yellow";
  if (status === "excused") return "gray";
  return "red";
}

function assignmentStatusLabel(status: CalendarAssignment["status"]) {
  if (status === "published") return "게시됨";
  if (status === "draft") return "나만 보기";
  return "종료";
}

function assignmentStatusTone(status: CalendarAssignment["status"]) {
  if (status === "published") return "green";
  if (status === "draft") return "gray";
  return "yellow";
}

function dueDateValue(value?: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

function dueTimeValue(value?: string) {
  if (!value) return "23:59";
  const match = value.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? "23:59";
}

function buildDueAt(date: string, time: string) {
  if (!date) return "";
  return `${date}T${time || "23:59"}:00`;
}

export function ClassAssignmentDetailClient({
  classId,
  assignmentId,
  students,
  initialState
}: {
  classId: string;
  assignmentId: string;
  students: Student[];
  initialState: ClassCalendarState;
}) {
  const [state, setState] = useState(initialState);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CalendarAssignment | null>(null);

  useEffect(() => {
    setState(classCalendarRepository.loadState());
  }, []);

  const assignment = useMemo(() => classCalendarRepository.getAssignmentById(assignmentId, state), [assignmentId, state]);
  const targets = useMemo(() => classCalendarRepository.getTargetsByAssignmentId(assignmentId, state), [assignmentId, state]);

  useEffect(() => {
    if (assignment && !isEditing) setDraft(assignment);
  }, [assignment, isEditing]);

  if (!assignment) {
    return (
      <Card>
        <p className="text-sm text-slate-500">숙제를 찾을 수 없습니다.</p>
        <Button href={`/teacher/classes/${classId}`} className="mt-4" variant="secondary">반 상세로</Button>
      </Card>
    );
  }

  function startEditing() {
    if (!assignment) return;
    setDraft(assignment);
    setIsEditing(true);
  }

  function previewImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = reader.result;
      if (typeof imageUrl === "string") setDraft((current) => current ? { ...current, imageUrl } : current);
    };
    reader.readAsDataURL(file);
  }

  function saveEdit() {
    if (!assignment || !draft?.title.trim()) return;
    const nextState = classCalendarRepository.updateHomework(assignment.id, draft, state);
    setState(nextState);
    setIsEditing(false);
  }

  function deleteAssignment() {
    if (!assignment) return;
    if (!window.confirm("이 숙제를 삭제하시겠습니까? 학생별 배정도 함께 삭제됩니다.")) return;
    classCalendarRepository.deleteHomework(assignment.id, state);
    window.location.href = `/teacher/classes/${classId}`;
  }

  return (
    <div className="grid gap-4">
      <Card>
        {isEditing && draft ? (
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">숙제 수정</h2>
              <Button variant="danger" onClick={deleteAssignment}>삭제</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">숙제 제목<Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
              <label className="grid gap-2 text-sm font-semibold">숙제 유형<Select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as ClassHomeworkType })}><option value="listening_recording">듣기/녹음</option><option value="writing">라이팅</option><option value="vocabulary">단어</option><option value="general">일반</option></Select></label>
              <label className="grid gap-2 text-sm font-semibold">공개 상태<Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as CalendarAssignment["status"] })}><option value="published">게시됨</option><option value="draft">나만 보기</option><option value="closed">종료</option></Select></label>
              <label className="grid gap-2 text-sm font-semibold">마감일<Input type="date" value={dueDateValue(draft.dueAt)} onChange={(event) => setDraft({ ...draft, dueAt: buildDueAt(event.target.value, dueTimeValue(draft.dueAt)) })} /></label>
              <label className="grid gap-2 text-sm font-semibold">마감 시간<Input type="time" value={dueTimeValue(draft.dueAt)} onChange={(event) => setDraft({ ...draft, dueAt: buildDueAt(dueDateValue(draft.dueAt), event.target.value) })} /></label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">설명<Textarea value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <label className="grid gap-2 text-sm font-semibold">숙제 이미지<Input type="file" accept="image/*" onChange={(event) => previewImage(event.target.files?.[0])} /></label>
              <div className="grid gap-2 text-sm font-semibold">
                이미지 미리보기
                <div className="overflow-hidden rounded-md border border-line bg-slate-50">
                  {draft.imageUrl ? <img src={draft.imageUrl} alt="숙제 이미지 미리보기" className="h-40 w-full object-contain" /> : <div className="grid h-40 place-items-center text-slate-500">이미지 없음</div>}
                </div>
              </div>
            </div>
            <label className="grid gap-2 text-sm font-semibold">지문<Textarea value={draft.passageText ?? ""} onChange={(event) => setDraft({ ...draft, passageText: event.target.value })} /></label>
            <label className="grid gap-2 text-sm font-semibold">MP3 파일명<Input value={draft.audioFileName ?? ""} onChange={(event) => setDraft({ ...draft, audioFileName: event.target.value })} /></label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsEditing(false)}>취소</Button>
              <Button onClick={saveEdit}>저장</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-bold">{assignment.title}</h2>
              <p className="mt-2 text-slate-600">{assignment.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="blue">{homeworkTypeLabel(assignment.type)}</Badge>
                <Badge tone={assignmentStatusTone(assignment.status)}>{assignmentStatusLabel(assignment.status)}</Badge>
                <Badge>{assignment.assignedDate}</Badge>
                <Badge tone="yellow">{formatDue(assignment.dueAt)}</Badge>
              </div>
              {assignment.imageUrl && (
                <div className="mt-4 overflow-hidden rounded-md border border-line bg-slate-50">
                  <img src={assignment.imageUrl} alt="숙제 이미지" className="max-h-72 w-full object-contain" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button href={`/teacher/classes/${classId}`} variant="secondary">반 상세로</Button>
            </div>
          </div>
        )}
      </Card>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-bold">숙제 관리</h3>
          {!isEditing && <Button onClick={startEditing}>숙제 수정하기</Button>}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-slate-500">
              <tr><th className="py-2">학생명</th><th>제출 상태</th><th>제출 시간</th><th>강사 확인</th></tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const target = targets.find((item) => item.studentId === student.id);
                return (
                  <tr key={student.id} className="border-t border-line">
                    <td className="py-3 font-semibold">{student.name}</td>
                    <td><Badge tone={targetStatusTone(target?.status ?? "assigned")}>{targetStatusLabel(target?.status ?? "assigned")}</Badge></td>
                    <td>{formatDateTime(target?.submittedAt)}</td>
                    <td>{target?.reviewed ? "확인 완료" : target?.status === "submitted" ? "확인 전" : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
