import { NextResponse } from "next/server";

import { query } from "@/lib/postgres";
import { mockTeacherId } from "@/server/teacher/mockTeacher";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ classId: string }> }) {
  const { classId } = await context.params;
  const result = await query(
    `
      select
        a.id,
        a.title,
        a.assignment_type as "assignmentType",
        coalesce(min(at.due_at), a.due_at) as "dueAt",
        count(distinct at.student_id)::int as "targetCount",
        count(distinct at.student_id) filter (where at.status in ('submitted', 'late'))::int as "submittedCount",
        count(distinct at.student_id) filter (where at.status = 'assigned')::int as "missingCount",
        count(distinct at.student_id) filter (where at.status = 'submitted' and at.reviewed = false)::int as "needsReviewCount"
      from assignments a
      join assignment_targets at on at.assignment_id = a.id and at.class_id = $1
      join students s on s.id = at.student_id
      where a.teacher_id = $2
      group by a.id
      order by coalesce(min(at.due_at), a.due_at, a.created_at) desc
    `,
    [classId, mockTeacherId],
  );

  return NextResponse.json({ assignments: result.rows });
}
