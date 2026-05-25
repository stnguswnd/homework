import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { query } from "@/lib/postgres";
import { assignmentSubjectLabel, assignmentTypeLabel, normalizeAssignmentType } from "@/lib/assignmentTypes";
import { requireTeacherSession } from "@/server/teacher/session";

export const runtime = "nodejs";

type TargetRow = {
  assignment_id: string;
  assignment_title: string;
  assignment_type: string;
  assignment_subject: string | null;
  assignment_status: string;
  default_due_at: Date | null;
  target_id: string;
  target_status: string;
  target_due_at: Date | null;
  class_id: string | null;
  class_name: string | null;
  student_id: string;
  student_name: string;
  submitted_at: Date | null;
  submission_status: string | null;
};

function toIso(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function GET(_request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { teacherId } = await requireTeacherSession();
  const { assignmentId } = await params;

  const result = await query<TargetRow>(
    `
      select
        a.id as assignment_id,
        a.title as assignment_title,
        a.assignment_type,
        a.assignment_subject,
        a.status as assignment_status,
        a.due_at as default_due_at,
        at.id as target_id,
        at.status as target_status,
        at.due_at as target_due_at,
        at.class_id,
        coalesce(c.name, '미지정 반') as class_name,
        s.id as student_id,
        s.name as student_name,
        sub.submitted_at,
        sub.status as submission_status
      from assignments a
      left join assignment_targets at on at.assignment_id = a.id
      left join students s on s.id = at.student_id and s.teacher_id = a.teacher_id
      left join classes c on c.id = at.class_id and c.teacher_id = a.teacher_id
      left join submissions sub on sub.assignment_id = a.id and sub.student_id = at.student_id
      where a.id = $1
        and a.teacher_id = $2
      order by c.name nulls last, s.name
    `,
    [assignmentId, teacherId],
  );

  const first = result.rows[0];
  if (!first) {
    return NextResponse.json({ error: "숙제를 찾을 수 없습니다." }, { status: 404 });
  }

  const groups = new Map<string, {
    classId: string;
    className: string;
    students: Array<{
      studentId: string;
      studentName: string;
      targetId: string;
      dueAt: string | null;
      submissionStatus: "submitted" | "not_submitted";
      submittedAt: string | null;
    }>;
  }>();

  for (const row of result.rows) {
    if (!row.target_id || !row.student_id) continue;
    if (row.target_status === "cancelled") continue;
    const classId = row.class_id ?? "unassigned";
    const group = groups.get(classId) ?? {
      classId,
      className: row.class_name ?? "미지정 반",
      students: [],
    };
    const submitted = Boolean(row.submitted_at || (row.submission_status && row.submission_status !== "not_submitted") || ["submitted", "late"].includes(row.target_status));
    group.students.push({
      studentId: row.student_id,
      studentName: row.student_name,
      targetId: row.target_id,
      dueAt: toIso(row.target_due_at),
      submissionStatus: submitted ? "submitted" : "not_submitted",
      submittedAt: toIso(row.submitted_at),
    });
    groups.set(classId, group);
  }

  const grouped = Array.from(groups.values()).map((group) => ({
    ...group,
    assignedCount: group.students.length,
    submittedCount: group.students.filter((student) => student.submissionStatus === "submitted").length,
    notSubmittedCount: group.students.filter((student) => student.submissionStatus !== "submitted").length,
  }));
  const activeStudents = grouped.flatMap((group) => group.students);
  const normalizedType = normalizeAssignmentType(first.assignment_type);
  const submittedCount = activeStudents.filter((student) => student.submissionStatus === "submitted").length;

  return NextResponse.json({
    assignment: {
      id: first.assignment_id,
      title: first.assignment_title,
      subject: first.assignment_subject || assignmentSubjectLabel(normalizedType),
      type: normalizedType,
      typeLabel: assignmentTypeLabel(normalizedType),
      status: first.assignment_status,
      defaultDueAt: toIso(first.default_due_at),
    },
    summary: {
      classCount: grouped.filter((group) => group.assignedCount > 0).length,
      assignedStudentCount: activeStudents.length,
      submittedCount,
      notSubmittedCount: Math.max(activeStudents.length - submittedCount, 0),
    },
    groups: grouped,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { teacherId } = await requireTeacherSession();
  const { assignmentId } = await params;
  const body = await request.json().catch(() => null) as { studentIds?: string[]; classId?: string; dueAt?: string | null } | null;
  const studentIds = Array.from(new Set((body?.studentIds ?? []).filter(Boolean)));

  if (studentIds.length === 0) {
    return NextResponse.json({ error: "추가 배정할 학생을 선택해주세요." }, { status: 400 });
  }

  const assignment = await query<{ id: string; due_at: Date | null }>(
    "select id, due_at from assignments where id = $1 and teacher_id = $2 limit 1",
    [assignmentId, teacherId],
  );
  if (!assignment.rows[0]) {
    return NextResponse.json({ error: "숙제를 찾을 수 없습니다." }, { status: 404 });
  }

  if (body?.classId) {
    const classResult = await query("select id from classes where id = $1 and teacher_id = $2 limit 1", [body.classId, teacherId]);
    if (!classResult.rows[0]) {
      return NextResponse.json({ error: "반을 찾을 수 없습니다." }, { status: 400 });
    }
  }

  const students = await query<{ id: string }>(
    `
      select distinct s.id
      from students s
      ${body?.classId ? "join class_memberships cm on cm.student_id = s.id and cm.class_id = $3" : ""}
      where s.teacher_id = $1
        and s.id = any($2::text[])
        and s.status = 'active'
    `,
    body?.classId ? [teacherId, studentIds, body.classId] : [teacherId, studentIds],
  );

  if (students.rows.length !== studentIds.length) {
    return NextResponse.json({ error: "일부 학생을 찾을 수 없거나 해당 반 소속이 아닙니다." }, { status: 400 });
  }

  const dueAt = body?.dueAt ? new Date(body.dueAt) : assignment.rows[0].due_at;
  for (const student of students.rows) {
    await query(
      `
        insert into assignment_targets (id, assignment_id, class_id, student_id, status, due_at)
        values ($1, $2, $3, $4, 'assigned', $5)
        on conflict (assignment_id, student_id)
        do update set
          class_id = excluded.class_id,
          due_at = excluded.due_at,
          status = case
            when assignment_targets.status in ('submitted', 'late') then assignment_targets.status
            else 'assigned'
          end,
          cancelled_at = null,
          cancelled_by = null,
          updated_at = now()
      `,
      [`target-${randomUUID()}`, assignmentId, body?.classId ?? null, student.id, dueAt],
    );
  }

  return NextResponse.json({ ok: true, assignedCount: students.rows.length });
}
