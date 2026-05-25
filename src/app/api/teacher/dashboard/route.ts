import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/postgres";
import { requireTeacherSession } from "@/server/teacher/session";

export const runtime = "nodejs";

type ScheduleRow = {
  id: string;
  class_id: string;
  class_name: string;
  date: string | Date;
  start_time: string | null;
  end_time: string | null;
  book_title: string | null;
  progress_title: string | null;
  progress_memo: string | null;
  next_prep: string | null;
  homework_count: number;
};

type AssignmentSummaryRow = {
  total_assigned: number;
  submitted: number;
  missing: number;
  needs_review: number;
};

type ClassCardRow = {
  class_id: string;
  class_name: string;
  student_count: number;
  assigned_count: number;
  submitted_count: number;
  missing_count: number;
  needs_review_count: number;
};

function isoDate(value: Date | string) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return value.slice(0, 10);
}

function defaultWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  return monday.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const { teacherId } = await requireTeacherSession();
  const weekStart = request.nextUrl.searchParams.get("weekStart") ?? defaultWeekStart();
  const weekEnd = addDays(weekStart, 6);
  const today = isoDate(new Date());

  const [scheduleResult, summaryResult, classResult] = await Promise.all([
    query<ScheduleRow>(
      `
        select
          csd.id,
          c.id as class_id,
          c.name as class_name,
          csd.date,
          csd.start_time::text,
          csd.end_time::text,
          csd.book_title,
          csd.progress_title,
          csd.progress_memo,
          csd.next_prep,
          count(distinct a.id)::int as homework_count
        from class_schedule_days csd
        join classes c on c.id = csd.class_id and c.teacher_id = $1
        left join assignments a on a.schedule_day_id = csd.id and a.teacher_id = $1
        where csd.date between $2::date and $3::date
        group by csd.id, c.id
        order by csd.date, csd.start_time nulls last, c.name
      `,
      [teacherId, weekStart, weekEnd],
    ),
    query<AssignmentSummaryRow>(
      `
        select
          count(at.id)::int as total_assigned,
          count(at.id) filter (where at.status in ('submitted', 'late'))::int as submitted,
          count(at.id) filter (where at.status = 'assigned')::int as missing,
          count(at.id) filter (where sub.id is not null and sub.status <> 'reviewed')::int as needs_review
        from assignment_targets at
        join assignments a on a.id = at.assignment_id and a.teacher_id = $1
        left join submissions sub on sub.assignment_id = at.assignment_id and sub.student_id = at.student_id
        where coalesce(at.due_at, a.due_at, a.created_at) >= $2::date
          and coalesce(at.due_at, a.due_at, a.created_at) < ($3::date + interval '1 day')
      `,
      [teacherId, weekStart, weekEnd],
    ),
    query<ClassCardRow>(
      `
        with class_students as (
          select c.id as class_id, c.name as class_name, cm.student_id
          from classes c
          left join class_memberships cm on cm.class_id = c.id
          where c.teacher_id = $1 and c.status = 'active'
        ),
        class_targets as (
          select
            cs.class_id,
            at.id as target_id,
            at.status as target_status,
            sub.id as submission_id,
            sub.status as submission_status
          from class_students cs
          left join assignment_targets at on at.student_id = cs.student_id
          left join assignments a on a.id = at.assignment_id and a.teacher_id = $1
          left join submissions sub on sub.assignment_id = at.assignment_id and sub.student_id = at.student_id
          where a.id is null
             or (coalesce(at.due_at, a.due_at, a.created_at) >= $2::date
             and coalesce(at.due_at, a.due_at, a.created_at) < ($3::date + interval '1 day'))
        )
        select
          cs.class_id,
          cs.class_name,
          count(distinct cs.student_id)::int as student_count,
          count(distinct ct.target_id)::int as assigned_count,
          count(distinct ct.target_id) filter (where ct.target_status in ('submitted', 'late'))::int as submitted_count,
          count(distinct ct.target_id) filter (where ct.target_status = 'assigned')::int as missing_count,
          count(distinct ct.target_id) filter (where ct.submission_id is not null and ct.submission_status <> 'reviewed')::int as needs_review_count
        from class_students cs
        left join class_targets ct on ct.class_id = cs.class_id
        group by cs.class_id, cs.class_name
        order by cs.class_name
      `,
      [teacherId, weekStart, weekEnd],
    ),
  ]);

  const weeklySchedule = scheduleResult.rows.map((row) => ({
    id: row.id,
    classId: row.class_id,
    className: row.class_name,
    date: isoDate(row.date),
    startTime: row.start_time,
    endTime: row.end_time,
    bookTitle: row.book_title,
    progressTitle: row.progress_title,
    progressMemo: row.progress_memo,
    nextPrep: row.next_prep,
    homeworkCount: row.homework_count,
  }));

  return NextResponse.json({
    weekStart,
    weekEnd,
    todayClasses: weeklySchedule.filter((item) => item.date === today),
    weeklySchedule,
    assignmentSummary: {
      totalAssigned: summaryResult.rows[0]?.total_assigned ?? 0,
      submitted: summaryResult.rows[0]?.submitted ?? 0,
      missing: summaryResult.rows[0]?.missing ?? 0,
      needsReview: summaryResult.rows[0]?.needs_review ?? 0,
    },
    classCards: classResult.rows.map((row) => ({
      classId: row.class_id,
      className: row.class_name,
      studentCount: row.student_count,
      assignedCount: row.assigned_count,
      submittedCount: row.submitted_count,
      missingCount: row.missing_count,
      needsReviewCount: row.needs_review_count,
    })),
  });
}
