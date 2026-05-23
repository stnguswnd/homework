"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDateTime, formatDue } from "@/lib/format";
import {
  classCalendarRepository,
  homeworkTypeLabel
} from "@/features/class-calendar/repositories/classCalendarRepository";
import type { AssignmentTarget, ClassCalendarState } from "@/features/class-calendar/types/classCalendar";
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

  useEffect(() => {
    setState(classCalendarRepository.loadState());
  }, []);

  const assignment = useMemo(() => classCalendarRepository.getAssignmentById(assignmentId, state), [assignmentId, state]);
  const targets = useMemo(() => classCalendarRepository.getTargetsByAssignmentId(assignmentId, state), [assignmentId, state]);

  if (!assignment) {
    return (
      <Card>
        <p className="text-sm text-slate-500">숙제를 찾을 수 없습니다.</p>
        <Button href={`/teacher/classes/${classId}`} className="mt-4" variant="secondary">반 상세로</Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold">{assignment.title}</h2>
            <p className="mt-2 text-slate-600">{assignment.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="blue">{homeworkTypeLabel(assignment.type)}</Badge>
              <Badge tone={assignment.status === "published" ? "green" : "gray"}>{assignment.status === "published" ? "게시됨" : assignment.status}</Badge>
              <Badge>{assignment.assignedDate}</Badge>
              <Badge tone="yellow">{formatDue(assignment.dueAt)}</Badge>
            </div>
          </div>
          <Button href={`/teacher/classes/${classId}`} variant="secondary">반 상세로</Button>
        </div>
      </Card>
      <Card>
        <h3 className="text-lg font-bold">학생별 숙제 관리</h3>
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
