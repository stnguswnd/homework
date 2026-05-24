import { NextResponse } from "next/server";

import { query } from "@/lib/postgres";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { storageBuckets } from "@/lib/supabase/storage";
import { mockTeacherId } from "@/server/teacher/mockTeacher";

export const runtime = "nodejs";

type Row = {
  submission_id: string;
  status: string;
  submitted_at: Date | null;
  reviewed_at: Date | null;
  teacher_comment: string | null;
  student_id: string;
  student_name: string;
  school_name: string | null;
  grade: string | null;
  assignment_id: string;
  assignment_title: string;
  assignment_type: string;
  assignment_item_id: string;
  item_title: string | null;
  passage_text: string | null;
  audio_url: string | null;
  audio_storage_path: string | null;
  recording_url: string | null;
  recording_storage_path: string | null;
  recording_duration_sec: number | null;
  recording_file_name: string | null;
};

async function signedUrl(bucket: string, path: string | null) {
  if (!path) return "";
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return error ? "" : data.signedUrl;
}

export async function GET(_request: Request, context: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await context.params;
  const result = await query<Row>(
    `
      select
        sub.id as submission_id,
        sub.status,
        sub.submitted_at,
        sub.reviewed_at,
        coalesce(sub.teacher_comment, tf.comment) as teacher_comment,
        s.id as student_id,
        s.name as student_name,
        s.school_name,
        s.grade,
        a.id as assignment_id,
        a.title as assignment_title,
        a.assignment_type,
        ai.id as assignment_item_id,
        ai.title as item_title,
        ai.passage_text,
        ai.audio_url,
        ai.audio_storage_path,
        si.recording_url,
        si.recording_storage_path,
        si.recording_duration_sec,
        si.recording_file_name
      from submissions sub
      join students s on s.id = sub.student_id
      join assignments a on a.id = sub.assignment_id and a.teacher_id = $2
      left join submission_items si on si.submission_id = sub.id
      left join assignment_items ai on ai.id = si.assignment_item_id
      left join teacher_feedback tf on tf.submission_id = sub.id and tf.teacher_id = a.teacher_id
      where sub.id = $1
      order by ai.order_index
    `,
    [submissionId, mockTeacherId],
  );

  if (!result.rows[0]) return NextResponse.json({ error: "제출을 찾을 수 없습니다." }, { status: 404 });
  const first = result.rows[0];

  return NextResponse.json({
    submissionId: first.submission_id,
    student: {
      id: first.student_id,
      name: first.student_name,
      schoolName: first.school_name ?? undefined,
      grade: first.grade ?? undefined,
    },
    assignment: {
      id: first.assignment_id,
      title: first.assignment_title,
      assignmentType: first.assignment_type,
    },
    items: await Promise.all(result.rows.map(async (row) => ({
      assignmentItemId: row.assignment_item_id,
      title: row.item_title ?? undefined,
      passageText: row.passage_text ?? undefined,
      audioUrl: ((await signedUrl(storageBuckets.audio, row.audio_storage_path)) || row.audio_url) ?? undefined,
      recordingUrl: ((await signedUrl(storageBuckets.audio, row.recording_storage_path)) || row.recording_url) ?? undefined,
      recordingDurationSec: row.recording_duration_sec ?? undefined,
      recordingFileName: row.recording_file_name ?? undefined,
    }))),
    status: first.status,
    submittedAt: first.submitted_at?.toISOString(),
    reviewedAt: first.reviewed_at?.toISOString(),
    teacherComment: first.teacher_comment ?? undefined,
  });
}
