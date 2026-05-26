import { randomUUID } from "crypto";
import type { PoolClient } from "pg";

import { query } from "@/lib/postgres";

export type NoticeStatus = "draft" | "published" | "hidden" | "archived";
export type NoticeTargetType = "all" | "class" | "student";
export type CalendarEventType = "assignment" | "test" | "cancelled" | "makeup" | "class" | "notice" | "etc";
export type TestStatus = "scheduled" | "completed" | "cancelled" | "hidden";
export type TestResultStatus = "PASS" | "NonPASS";

export type NoticeInput = {
  title?: string;
  content?: string;
  imageUrl?: string | null;
  status?: NoticeStatus;
};

export type CalendarEventInput = {
  eventType?: Exclude<CalendarEventType, "assignment">;
  title?: string;
  description?: string | null;
  eventDate?: string;
  startTime?: string | null;
  endTime?: string | null;
  status?: "active" | "cancelled" | "hidden";
};

export type TestInput = {
  classId?: string;
  title?: string;
  subject?: string;
  testDate?: string;
  startTime?: string | null;
  endTime?: string | null;
  scope?: string | null;
  description?: string | null;
  status?: TestStatus;
};

export type TestResultInput = {
  studentId: string;
  score?: number | null;
  maxScore?: number | null;
  result?: TestResultStatus;
  teacherMemo?: string | null;
  takenAt?: string | null;
};

export function normalizeNotice(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    content: String(row.content ?? ""),
    imageUrl: row.image_url ? String(row.image_url) : null,
    status: String(row.status ?? "published"),
    targetType: String(row.target_type ?? ""),
    classId: row.class_id ? String(row.class_id) : null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ""),
    publishedAt: row.published_at instanceof Date ? row.published_at.toISOString() : row.published_at ? String(row.published_at) : null,
  };
}

export async function getGlobalNotices(teacherId: string) {
  const result = await query(
    `
      select n.*, nt.target_type, nt.class_id
      from notices n
      join notice_targets nt on nt.notice_id = n.id
      where n.teacher_id = $1 and nt.target_type = 'all'
      order by n.published_at desc nulls last, n.created_at desc
      limit 20
    `,
    [teacherId],
  );
  return result.rows.map(normalizeNotice);
}

export async function getClassNotices(teacherId: string, classId: string) {
  const result = await query(
    `
      select n.*, nt.target_type, nt.class_id
      from notices n
      join notice_targets nt on nt.notice_id = n.id
      where n.teacher_id = $1 and nt.target_type = 'class' and nt.class_id = $2
      order by n.published_at desc nulls last, n.created_at desc
      limit 20
    `,
    [teacherId, classId],
  );
  return result.rows.map(normalizeNotice);
}

export async function createNotice(teacherId: string, input: NoticeInput, target: { type: NoticeTargetType; classId?: string | null; studentId?: string | null }) {
  const title = input.title?.trim();
  const content = input.content?.trim();
  if (!title || !content) throw new Error("공지 제목과 본문을 입력해주세요.");

  const id = `notice-${randomUUID()}`;
  const targetId = `notice-target-${randomUUID()}`;
  await query(
    `
      insert into notices (id, teacher_id, title, content, image_url, status, published_at)
      values ($1, $2, $3, $4, $5, $6, case when $6 = 'published' then now() else null end)
    `,
    [id, teacherId, title, content, input.imageUrl || null, input.status ?? "published"],
  );
  await query(
    `
      insert into notice_targets (id, notice_id, class_id, student_id, target_type)
      values ($1, $2, $3, $4, $5)
    `,
    [targetId, id, target.classId ?? null, target.studentId ?? null, target.type],
  );
  return id;
}

export async function updateNotice(teacherId: string, noticeId: string, input: NoticeInput) {
  await query(
    `
      update notices
      set
        title = coalesce($3, title),
        content = coalesce($4, content),
        image_url = $5,
        status = coalesce($6, status),
        published_at = case
          when coalesce($6, status) = 'published' and published_at is null then now()
          else published_at
        end,
        updated_at = now()
      where id = $1 and teacher_id = $2
    `,
    [noticeId, teacherId, input.title?.trim() || null, input.content?.trim() || null, input.imageUrl ?? null, input.status ?? null],
  );
}

export async function deleteNotice(teacherId: string, noticeId: string) {
  await query("delete from notices where id = $1 and teacher_id = $2", [noticeId, teacherId]);
}

export async function createCalendarEvent(teacherId: string, classId: string, input: CalendarEventInput) {
  const title = input.title?.trim();
  const eventDate = input.eventDate;
  const eventType = input.eventType ?? "etc";
  if (!title || !eventDate) throw new Error("일정 제목과 날짜를 입력해주세요.");
  const id = `event-${randomUUID()}`;
  await query(
    `
      insert into class_calendar_events (id, teacher_id, class_id, event_type, title, description, event_date, start_time, end_time, status)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [id, teacherId, classId, eventType, title, input.description || null, eventDate, input.startTime || null, input.endTime || null, input.status ?? "active"],
  );
  if (eventType === "cancelled" || eventType === "makeup" || eventType === "class") {
    await query(
      `
        insert into class_schedule_days (id, class_id, date, has_class, start_time, end_time, progress_title, progress_memo)
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        on conflict (class_id, date)
        do update set
          has_class = excluded.has_class,
          start_time = coalesce(excluded.start_time, class_schedule_days.start_time),
          end_time = coalesce(excluded.end_time, class_schedule_days.end_time),
          progress_title = coalesce(excluded.progress_title, class_schedule_days.progress_title),
          progress_memo = coalesce(excluded.progress_memo, class_schedule_days.progress_memo),
          updated_at = now()
      `,
      [`schedule-${randomUUID()}`, classId, eventDate, eventType !== "cancelled", input.startTime || null, input.endTime || null, title, input.description || null],
    );
  }
  return id;
}

export async function getClassCalendarEvents(teacherId: string, classId: string, start?: string, end?: string) {
  const result = await query(
    `
      select e.*, c.name as class_name
      from class_calendar_events e
      join classes c on c.id = e.class_id and c.teacher_id = e.teacher_id
      where e.teacher_id = $1
        and e.class_id = $2
        and ($3::date is null or e.event_date >= $3::date)
        and ($4::date is null or e.event_date <= $4::date)
      order by e.event_date asc, e.start_time asc nulls last
    `,
    [teacherId, classId, start ?? null, end ?? null],
  );
  return result.rows.map((row) => ({
    id: row.id,
    classId: row.class_id,
    className: row.class_name,
    eventType: row.event_type,
    title: row.title,
    description: row.description,
    eventDate: row.event_date instanceof Date ? row.event_date.toISOString().slice(0, 10) : row.event_date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
  }));
}

export async function updateCalendarEvent(teacherId: string, classId: string, eventId: string, input: CalendarEventInput) {
  await query(
    `
      update class_calendar_events
      set
        event_type = coalesce($4, event_type),
        title = coalesce($5, title),
        description = $6,
        event_date = coalesce($7::date, event_date),
        start_time = $8,
        end_time = $9,
        status = coalesce($10, status),
        updated_at = now()
      where id = $1 and teacher_id = $2 and class_id = $3
    `,
    [eventId, teacherId, classId, input.eventType ?? null, input.title?.trim() || null, input.description ?? null, input.eventDate ?? null, input.startTime ?? null, input.endTime ?? null, input.status ?? null],
  );
}

export async function deleteCalendarEvent(teacherId: string, classId: string, eventId: string) {
  await query("update class_calendar_events set status = 'hidden', updated_at = now() where id = $1 and teacher_id = $2 and class_id = $3", [eventId, teacherId, classId]);
}

export async function createTest(teacherId: string, input: TestInput) {
  if (!input.classId || !input.title?.trim() || !input.subject?.trim() || !input.testDate) throw new Error("시험명, 과목, 날짜를 입력해주세요.");
  const eventId = await createCalendarEvent(teacherId, input.classId, {
    eventType: "test",
    title: input.title,
    description: input.scope || input.description || null,
    eventDate: input.testDate,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    status: input.status === "hidden" || input.status === "cancelled" ? "hidden" : "active",
  });
  const testId = `test-${randomUUID()}`;
  await query(
    `
      insert into tests (id, teacher_id, class_id, calendar_event_id, title, subject, test_date, start_time, end_time, scope, description, status)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [testId, teacherId, input.classId, eventId, input.title.trim(), input.subject.trim(), input.testDate, input.startTime || null, input.endTime || null, input.scope || null, input.description || null, input.status ?? "scheduled"],
  );
  return testId;
}

export async function getTeacherTests(teacherId: string, classId?: string) {
  const result = await query(
    `
      select
        t.*,
        c.name as class_name,
        count(tr.id)::int as result_count,
        count(tr.id) filter (where tr.result = 'PASS')::int as pass_count,
        count(tr.id) filter (where tr.result = 'NonPASS')::int as nonpass_count
      from tests t
      left join classes c on c.id = t.class_id
      left join test_results tr on tr.test_id = t.id
      where t.teacher_id = $1 and ($2::text is null or t.class_id = $2)
      group by t.id, c.name
      order by t.test_date asc
    `,
    [teacherId, classId ?? null],
  );
  return result.rows.map((row) => ({
    id: row.id,
    classId: row.class_id,
    className: row.class_name,
    title: row.title,
    subject: row.subject,
    testDate: row.test_date instanceof Date ? row.test_date.toISOString().slice(0, 10) : row.test_date,
    startTime: row.start_time,
    endTime: row.end_time,
    scope: row.scope,
    description: row.description,
    status: row.status,
    resultCount: row.result_count,
    passCount: row.pass_count,
    nonpassCount: row.nonpass_count,
  }));
}

export async function updateTest(teacherId: string, testId: string, input: TestInput) {
  const result = await query<{ calendar_event_id: string | null; class_id: string | null }>("select calendar_event_id, class_id from tests where id = $1 and teacher_id = $2", [testId, teacherId]);
  const existing = result.rows[0];
  await query(
    `
      update tests
      set title = coalesce($3, title), subject = coalesce($4, subject), test_date = coalesce($5::date, test_date),
          start_time = $6, end_time = $7, scope = $8, description = $9, status = coalesce($10, status), updated_at = now()
      where id = $1 and teacher_id = $2
    `,
    [testId, teacherId, input.title?.trim() || null, input.subject?.trim() || null, input.testDate ?? null, input.startTime ?? null, input.endTime ?? null, input.scope ?? null, input.description ?? null, input.status ?? null],
  );
  if (existing?.calendar_event_id && existing.class_id) {
    await updateCalendarEvent(teacherId, existing.class_id, existing.calendar_event_id, {
      eventType: "test",
      title: input.title,
      description: input.scope ?? input.description ?? null,
      eventDate: input.testDate,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      status: input.status === "hidden" || input.status === "cancelled" ? "hidden" : "active",
    });
  }
}

export async function deleteTest(teacherId: string, testId: string) {
  const result = await query<{ calendar_event_id: string | null; class_id: string | null }>("select calendar_event_id, class_id from tests where id = $1 and teacher_id = $2", [testId, teacherId]);
  await query("update tests set status = 'hidden', updated_at = now() where id = $1 and teacher_id = $2", [testId, teacherId]);
  if (result.rows[0]?.calendar_event_id && result.rows[0].class_id) {
    await deleteCalendarEvent(teacherId, result.rows[0].class_id, result.rows[0].calendar_event_id);
  }
}

export async function getTestResults(teacherId: string, testId: string) {
  const result = await query(
    `
      select s.id as student_id, s.name, tr.score, tr.max_score, tr.result, tr.teacher_memo, tr.taken_at
      from tests t
      join class_memberships cm on cm.class_id = t.class_id
      join students s on s.id = cm.student_id and s.teacher_id = t.teacher_id and s.status = 'active'
      left join test_results tr on tr.test_id = t.id and tr.student_id = s.id
      where t.id = $1 and t.teacher_id = $2
      order by s.name asc
    `,
    [testId, teacherId],
  );
  return result.rows.map((row) => ({
    studentId: row.student_id,
    studentName: row.name,
    score: row.score === null ? null : Number(row.score),
    maxScore: row.max_score === null ? 100 : Number(row.max_score),
    result: row.result ?? "PASS",
    teacherMemo: row.teacher_memo ?? "",
    takenAt: row.taken_at instanceof Date ? row.taken_at.toISOString().slice(0, 10) : row.taken_at,
  }));
}

export async function upsertTestResults(teacherId: string, testId: string, results: TestResultInput[]) {
  const test = await query<{ class_id: string }>("select class_id from tests where id = $1 and teacher_id = $2", [testId, teacherId]);
  const classId = test.rows[0]?.class_id;
  if (!classId) throw new Error("테스트를 찾을 수 없습니다.");
  for (const item of results) {
    await query(
      `
        insert into test_results (id, test_id, teacher_id, class_id, student_id, score, max_score, result, teacher_memo, taken_at)
        values ($1, $2, $3, $4, $5, $6, coalesce($7, 100), $8, $9, $10)
        on conflict (test_id, student_id)
        do update set score = excluded.score, max_score = excluded.max_score, result = excluded.result,
          teacher_memo = excluded.teacher_memo, taken_at = excluded.taken_at, updated_at = now()
      `,
      [`test-result-${randomUUID()}`, testId, teacherId, classId, item.studentId, item.score ?? null, item.maxScore ?? 100, item.result ?? "PASS", item.teacherMemo || null, item.takenAt || null],
    );
  }
}

export async function assertClass(teacherId: string, classId: string) {
  const result = await query("select id from classes where id = $1 and teacher_id = $2 limit 1", [classId, teacherId]);
  return Boolean(result.rows[0]);
}

export async function getStudentVisibleNotices(studentId: string, teacherId: string) {
  const result = await query(
    `
      select distinct n.*, nt.target_type, nt.class_id
      from notices n
      join notice_targets nt on nt.notice_id = n.id
      left join class_memberships cm on cm.class_id = nt.class_id
      left join classes c on c.id = nt.class_id and c.teacher_id = n.teacher_id and c.status = 'active'
      where n.teacher_id = $2
        and n.status = 'published'
        and (
          nt.target_type = 'all'
          or (nt.target_type = 'class' and cm.student_id = $1 and c.id is not null)
          or (nt.target_type = 'student' and nt.student_id = $1)
        )
      order by n.published_at desc nulls last, n.created_at desc
      limit 10
    `,
    [studentId, teacherId],
  );
  return result.rows.map(normalizeNotice);
}

export async function getStudentCalendarEvents(studentId: string, teacherId: string, start: string, end: string) {
  const homework = await query(
    `
      select
        coalesce(at.due_at, a.due_at)::date as date,
        count(distinct at.assignment_id)::int as count
      from assignment_targets at
      join assignments a on a.id = at.assignment_id
      left join classes c on c.id = coalesce(at.class_id, a.class_id) and c.teacher_id = a.teacher_id
      where at.student_id = $1
        and a.teacher_id = $2
        and (
          coalesce(at.class_id, a.class_id) is null
          or c.status = 'active'
        )
        and coalesce(at.due_at, a.due_at)::date between $3::date and $4::date
      group by coalesce(at.due_at, a.due_at)::date
    `,
    [studentId, teacherId, start, end],
  );

  const events = await query(
    `
      select distinct
        e.id,
        e.event_date,
        e.event_type,
        e.title,
        e.class_id,
        c.name as class_name
      from class_calendar_events e
      join classes c on c.id = e.class_id and c.status = 'active'
      join class_memberships cm on cm.class_id = e.class_id
      where cm.student_id = $1
        and e.teacher_id = $2
        and e.status = 'active'
        and e.event_date between $3::date and $4::date
      order by e.event_date asc
    `,
    [studentId, teacherId, start, end],
  );

  return [
    ...homework.rows.map((row) => ({
      id: `assignment-${row.date}`,
      date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date),
      type: "assignment",
      title: `숙제 ${row.count}개`,
      count: row.count,
    })),
    ...events.rows.map((row) => ({
      id: row.id,
      date: row.event_date instanceof Date ? row.event_date.toISOString().slice(0, 10) : String(row.event_date),
      type: row.event_type,
      title: row.title,
      classId: row.class_id,
      className: row.class_name,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getStudentUpcomingTests(studentId: string, teacherId: string) {
  const result = await query(
    `
      select distinct t.*
      from tests t
      join class_memberships cm on cm.class_id = t.class_id
      join classes c on c.id = t.class_id and c.teacher_id = t.teacher_id and c.status = 'active'
      where cm.student_id = $1
        and t.teacher_id = $2
        and t.status = 'scheduled'
        and t.test_date >= current_date
      order by t.test_date asc
      limit 3
    `,
    [studentId, teacherId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    date: row.test_date instanceof Date ? row.test_date.toISOString().slice(0, 10) : row.test_date,
    scope: row.scope,
  }));
}

export async function getStudentTestResults(studentId: string, teacherId: string) {
  const result = await query(
    `
      select tr.*, t.title, t.subject, t.test_date
      from test_results tr
      join tests t on t.id = tr.test_id
      join classes c on c.id = tr.class_id and c.teacher_id = tr.teacher_id and c.status = 'active'
      where tr.student_id = $1 and tr.teacher_id = $2
      order by coalesce(tr.taken_at, t.test_date) desc
      limit 10
    `,
    [studentId, teacherId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    date: row.taken_at instanceof Date ? row.taken_at.toISOString().slice(0, 10) : row.taken_at ? String(row.taken_at) : row.test_date instanceof Date ? row.test_date.toISOString().slice(0, 10) : String(row.test_date),
    score: row.score === null ? null : Number(row.score),
    result: row.result,
    teacherMemo: row.teacher_memo,
  }));
}
