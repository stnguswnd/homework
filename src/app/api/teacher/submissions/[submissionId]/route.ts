import { NextResponse } from "next/server";

import { query } from "@/lib/postgres";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { storageBuckets } from "@/lib/supabase/storage";
import { normalizeAssignmentType } from "@/lib/assignmentTypes";
import { requireTeacherSession } from "@/server/teacher/session";

export const runtime = "nodejs";

type Row = {
  submission_id: string;
  status: string;
  submitted_at: Date | null;
  reviewed_at: Date | null;
  due_at: Date | null;
  teacher_comment: string | null;
  student_id: string;
  student_name: string;
  school_name: string | null;
  grade: string | null;
  class_names: string[] | null;
  assignment_id: string;
  assignment_title: string;
  assignment_type: string;
  assignment_item_id: string;
  item_title: string | null;
  passage_text: string | null;
  writing_mode: string | null;
  writing_unit: string | null;
  writing_unit_count: number | null;
  prompt_text: string | null;
  audio_url: string | null;
  audio_storage_path: string | null;
  recording_url: string | null;
  recording_storage_path: string | null;
  recording_duration_sec: number | null;
  recording_file_name: string | null;
  original_answer_text: string | null;
  answer_text: string | null;
  ai_corrected_text: string | null;
  ai_feedback: string | null;
  ai_grammar_notes: string | null;
  ai_expression_notes: string | null;
};

async function signedUrl(bucket: string, path: string | null) {
  if (!path) return "";
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return error ? "" : data.signedUrl;
}

export async function GET(_request: Request, context: { params: Promise<{ submissionId: string }> }) {
  const { teacherId } = await requireTeacherSession();
  const { submissionId } = await context.params;
  const result = await query<Row>(
    `
      select
        sub.id as submission_id,
        sub.status,
        sub.submitted_at,
        sub.reviewed_at,
        coalesce(at.due_at, a.due_at) as due_at,
        coalesce(sub.teacher_comment, tf.comment) as teacher_comment,
        s.id as student_id,
        s.name as student_name,
        s.school_name,
        s.grade,
        coalesce(array_remove(array_agg(distinct c.name), null), array[]::text[]) as class_names,
        a.id as assignment_id,
        a.title as assignment_title,
        a.assignment_type,
        ai.id as assignment_item_id,
        ai.title as item_title,
        ai.passage_text,
        ai.writing_mode,
        ai.writing_unit,
        ai.writing_unit_count,
        ai.prompt_text,
        ai.audio_url,
        ai.audio_storage_path,
        si.recording_url,
        si.recording_storage_path,
        si.recording_duration_sec,
        si.recording_file_name,
        si.original_answer_text,
        si.answer_text,
        si.ai_corrected_text,
        si.ai_feedback,
        si.ai_grammar_notes,
        si.ai_expression_notes
      from submissions sub
      join students s on s.id = sub.student_id
      join assignments a on a.id = sub.assignment_id and a.teacher_id = $2
      left join assignment_targets at on at.id = sub.assignment_target_id or (at.assignment_id = sub.assignment_id and at.student_id = sub.student_id)
      left join submission_items si on si.submission_id = sub.id
      left join assignment_items ai on ai.id = si.assignment_item_id
      left join teacher_feedback tf on tf.submission_id = sub.id and tf.teacher_id = a.teacher_id
      left join class_memberships cm on cm.student_id = s.id
      left join classes c on c.id = cm.class_id and c.teacher_id = a.teacher_id
      where sub.id = $1
      group by sub.id, at.due_at, a.due_at, tf.comment, s.id, a.id, ai.id, si.id
      order by ai.order_index
    `,
    [submissionId, teacherId],
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
      classNames: first.class_names ?? [],
    },
    assignment: {
      id: first.assignment_id,
      title: first.assignment_title,
      assignmentType: normalizeAssignmentType(first.assignment_type),
    },
    items: await Promise.all(result.rows.map(async (row) => ({
      assignmentItemId: row.assignment_item_id,
      title: row.item_title ?? undefined,
      passageText: row.passage_text ?? undefined,
      writingMode: row.writing_mode ?? undefined,
      writingUnit: row.writing_unit ?? undefined,
      writingUnitCount: row.writing_unit_count ?? undefined,
      promptText: row.prompt_text ?? undefined,
      audioUrl: ((await signedUrl(storageBuckets.audio, row.audio_storage_path)) || row.audio_url) ?? undefined,
      recordingUrl: ((await signedUrl(storageBuckets.audio, row.recording_storage_path)) || row.recording_url) ?? undefined,
      recordingDurationSec: row.recording_duration_sec ?? undefined,
      recordingFileName: row.recording_file_name ?? undefined,
      originalAnswerText: row.original_answer_text ?? undefined,
      answerText: row.answer_text ?? undefined,
      aiCorrectedText: row.ai_corrected_text ?? undefined,
      aiFeedback: row.ai_feedback ?? undefined,
      aiGrammarNotes: row.ai_grammar_notes ?? undefined,
      aiExpressionNotes: row.ai_expression_notes ?? undefined,
    }))),
    status: first.status,
    submittedAt: first.submitted_at?.toISOString(),
    dueAt: first.due_at?.toISOString(),
    isLate: Boolean(first.submitted_at && first.due_at && first.submitted_at.getTime() > first.due_at.getTime()),
    reviewedAt: first.reviewed_at?.toISOString(),
    teacherComment: first.teacher_comment ?? undefined,
  });
}
