import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { query } from "@/lib/postgres";
import { requireTeacherSession } from "@/server/teacher/session";

export const runtime = "nodejs";

type ScheduleRow = {
  id: string;
  class_id: string;
  date: string;
  has_class: boolean;
  start_time: string | null;
  end_time: string | null;
  book_title: string | null;
  progress_title: string | null;
  progress_memo: string | null;
  next_prep: string | null;
  homework_ids: string[] | null;
};

function mapRow(row: ScheduleRow) {
  return {
    id: row.id,
    classId: row.class_id,
    date: row.date,
    hasClass: row.has_class,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    bookTitle: row.book_title ?? undefined,
    progressTitle: row.progress_title ?? undefined,
    progressMemo: row.progress_memo ?? undefined,
    nextPrep: row.next_prep ?? undefined,
    homeworkIds: row.homework_ids ?? [],
  };
}

async function assertClass(teacherId: string, classId: string) {
  const result = await query("select id from classes where id = $1 and teacher_id = $2 limit 1", [classId, teacherId]);
  return Boolean(result.rows[0]);
}

export async function GET(request: Request, context: { params: Promise<{ classId: string }> }) {
  const { teacherId } = await requireTeacherSession();
  const { classId } = await context.params;
  if (!(await assertClass(teacherId, classId))) {
    return NextResponse.json({ error: "반을 찾을 수 없습니다." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") ?? "1900-01-01";
  const end = searchParams.get("end") ?? "2999-12-31";

  const result = await query<ScheduleRow>(
    `
      select
        d.id, d.class_id, d.date::text, d.has_class, d.start_time::text, d.end_time::text,
        d.book_title, d.progress_title, d.progress_memo, d.next_prep,
        coalesce(array_remove(array_agg(a.id order by a.created_at), null), array[]::text[]) as homework_ids
      from class_schedule_days d
      left join assignments a on a.schedule_day_id = d.id and a.teacher_id = $2
      where d.class_id = $1 and d.date between $3::date and $4::date
      group by d.id
      order by d.date asc
    `,
    [classId, teacherId, start, end],
  );

  return NextResponse.json({ scheduleDays: result.rows.map(mapRow) });
}

export async function POST(request: Request, context: { params: Promise<{ classId: string }> }) {
  const { teacherId } = await requireTeacherSession();
  const { classId } = await context.params;
  if (!(await assertClass(teacherId, classId))) {
    return NextResponse.json({ error: "반을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const id = `schedule-${randomUUID()}`;
  const date = String(body.date ?? "").trim();
  if (!date) return NextResponse.json({ error: "수업일이 필요합니다." }, { status: 400 });

  const result = await query<ScheduleRow>(
    `
      insert into class_schedule_days (
        id, class_id, date, has_class, start_time, end_time, book_title, progress_title, progress_memo, next_prep
      )
      values ($1, $2, $3, coalesce($4, true), $5, $6, $7, $8, $9, $10)
      on conflict (class_id, date)
      do update set
        has_class = excluded.has_class,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        book_title = excluded.book_title,
        progress_title = excluded.progress_title,
        progress_memo = excluded.progress_memo,
        next_prep = excluded.next_prep,
        updated_at = now()
      returning id, class_id, date::text, has_class, start_time::text, end_time::text, book_title, progress_title, progress_memo, next_prep, array[]::text[] as homework_ids
    `,
    [
      id,
      classId,
      date,
      body.hasClass,
      body.startTime || null,
      body.endTime || null,
      body.bookTitle || null,
      body.progressTitle || null,
      body.progressMemo || null,
      body.nextPrep || null,
    ],
  );

  return NextResponse.json({ scheduleDay: mapRow(result.rows[0]) });
}
