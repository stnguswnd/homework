"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TeacherLayout } from "@/components/layout/TeacherLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDue } from "@/lib/format";

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const [classItem, setClassItem] = useState<{ name: string; description?: string } | null>(null);
  const [students, setStudents] = useState<Array<{ id: string; name: string; studentLoginId: string; status: string }>>([]);
  const [assignments, setAssignments] = useState<Array<{ id: string; title: string; assignmentType: string; dueAt: string | null; targetCount: number; submittedCount: number; missingCount: number; needsReviewCount: number }>>([]);
  const [scheduleDays, setScheduleDays] = useState<Array<{ id: string; date: string; startTime?: string; endTime?: string; bookTitle?: string; progressTitle?: string }>>([]);

  useEffect(() => {
    fetch(`/api/teacher/classes/${classId}`).then((response) => response.json()).then((data) => setClassItem(data.class ?? null));
    fetch(`/api/teacher/classes/${classId}/students`).then((response) => response.json()).then((data) => setStudents(data.students ?? []));
    fetch(`/api/teacher/classes/${classId}/assignments`).then((response) => response.json()).then((data) => setAssignments(data.assignments ?? []));
    fetch(`/api/teacher/classes/${classId}/schedule`).then((response) => response.json()).then((data) => setScheduleDays(data.scheduleDays ?? []));
  }, [classId]);

  return (
    <TeacherLayout title={classItem?.name ?? "반 상세"}>
      <div className="grid gap-4">
        <Card>
          <h2 className="text-lg font-bold">{classItem?.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{classItem?.description}</p>
        </Card>

        <Card>
          <h3 className="font-bold">학생</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <div key={student.id} className="rounded-md border border-line p-3 text-sm">
                <p className="font-bold">{student.name}</p>
                <p className="text-slate-500">{student.studentLoginId}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-bold">과제/제출 상태</h3>
          <div className="mt-3 grid gap-2">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-md border border-line p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{assignment.title}</p>
                    <p className="mt-1 text-slate-500">마감 {assignment.dueAt ? formatDue(assignment.dueAt) : "-"}</p>
                  </div>
                  <Button href={`/teacher/assignments/${assignment.id}/submissions`} variant="secondary">제출 현황</Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>대상 {assignment.targetCount}</Badge>
                  <Badge tone="green">제출 {assignment.submittedCount}</Badge>
                  <Badge tone="red">미제출 {assignment.missingCount}</Badge>
                  <Badge tone="yellow">검토 {assignment.needsReviewCount}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-bold">수업 일정</h3>
          <div className="mt-3 grid gap-2">
            {scheduleDays.map((day) => (
              <div key={day.id} className="rounded-md border border-line p-3 text-sm">
                <p className="font-bold">{day.date} {day.startTime ?? ""}-{day.endTime ?? ""}</p>
                <p className="mt-1 text-slate-500">{day.bookTitle} / {day.progressTitle}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </TeacherLayout>
  );
}
