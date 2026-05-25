import { NextResponse } from "next/server";

import { query } from "@/lib/postgres";
import { requireTeacherSession } from "@/server/teacher/session";

export const runtime = "nodejs";

async function assertSchedule(teacherId: string, classId: string, scheduleDayId: string) {
  const result = await query(
    `
      select d.id
      from class_schedule_days d
      join classes c on c.id = d.class_id
      where d.id = $1 and d.class_id = $2 and c.teacher_id = $3
      limit 1
    `,
    [scheduleDayId, classId, teacherId],
  );
  return Boolean(result.rows[0]);
}

export async function PATCH(request: Request, context: { params: Promise<{ classId: string; scheduleDayId: string }> }) {
  const { teacherId } = await requireTeacherSession();
  const { classId, scheduleDayId } = await context.params;
  if (!(await assertSchedule(teacherId, classId, scheduleDayId))) {
    return NextResponse.json({ error: "수업 일정을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  await query(
    `
      update class_schedule_days
      set
        has_class = coalesce($3, has_class),
        start_time = coalesce($4, start_time),
        end_time = coalesce($5, end_time),
        book_title = coalesce($6, book_title),
        progress_title = coalesce($7, progress_title),
        progress_memo = coalesce($8, progress_memo),
        next_prep = coalesce($9, next_prep),
        updated_at = now()
      where id = $1 and class_id = $2
    `,
    [
      scheduleDayId,
      classId,
      body.hasClass,
      body.startTime || null,
      body.endTime || null,
      body.bookTitle || null,
      body.progressTitle || null,
      body.progressMemo || null,
      body.nextPrep || null,
    ],
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ classId: string; scheduleDayId: string }> }) {
  const { teacherId } = await requireTeacherSession();
  const { classId, scheduleDayId } = await context.params;
  if (!(await assertSchedule(teacherId, classId, scheduleDayId))) {
    return NextResponse.json({ error: "수업 일정을 찾을 수 없습니다." }, { status: 404 });
  }
  await query("delete from class_schedule_days where id = $1 and class_id = $2", [scheduleDayId, classId]);
  return NextResponse.json({ ok: true });
}
