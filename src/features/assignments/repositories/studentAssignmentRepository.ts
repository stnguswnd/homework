import "server-only";

import { query } from "@/lib/postgres";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { storageBuckets } from "@/lib/supabase/storage";
import type { Assignment } from "@/types/assignment";

type ItemRow = {
  id: string;
  assignment_id: string;
  item_type: Assignment["items"][number]["itemType"];
  title: string | null;
  passage_text: string;
  audio_url: string | null;
  audio_storage_path: string | null;
  audio_file_name: string | null;
  order_index: number;
  min_recording_sec: number;
  max_recording_sec: number;
};

type AssignmentRow = {
  id: string;
  teacher_id: string;
  class_id: string | null;
  title: string;
  description: string | null;
  assignment_type: Assignment["assignmentType"];
  image_url: string | null;
  image_storage_path: string | null;
  due_at: Date | null;
  status: Assignment["status"];
  target_status?: string;
  created_at: Date;
  items: ItemRow[] | null;
};

async function signedUrl(bucket: string, path: string | null) {
  if (!path) return "";
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return error ? "" : data.signedUrl;
}

async function mapAssignmentWithSignedUrls(row: AssignmentRow): Promise<Assignment> {
  const items = await Promise.all((row.items ?? []).map(async (item) => ({
    id: item.id,
    assignmentId: item.assignment_id,
    itemType: item.item_type,
    title: item.title ?? undefined,
    passageText: item.passage_text,
    audioUrl: ((await signedUrl(storageBuckets.audio, item.audio_storage_path)) || item.audio_url) ?? undefined,
    audioFileName: item.audio_file_name ?? undefined,
    orderIndex: item.order_index,
    minRecordingSec: item.min_recording_sec,
    maxRecordingSec: item.max_recording_sec,
  })));

  return {
    id: row.id,
    teacherId: row.teacher_id,
    classId: row.class_id ?? "",
    title: row.title,
    description: row.description ?? undefined,
    assignmentType: row.assignment_type,
    imageUrl: ((await signedUrl(storageBuckets.images, row.image_storage_path)) || row.image_url) ?? undefined,
    imageStoragePath: row.image_storage_path ?? undefined,
    dueAt: row.due_at?.toISOString(),
    status: row.status,
    targetStatus: row.target_status,
    createdAt: row.created_at.toISOString(),
    items,
  };
}

export const studentAssignmentRepository = {
  async getAssignmentsForStudent(studentId: string) {
    const result = await query<AssignmentRow>(
      `
        select
          a.id, a.teacher_id, a.class_id, a.title, a.description, a.assignment_type, a.image_url, a.image_storage_path,
          coalesce(at.due_at, a.due_at) as due_at, a.status, at.status as target_status, a.created_at,
          coalesce(
            json_agg(
              json_build_object(
                'id', ai.id,
                'assignment_id', ai.assignment_id,
                'item_type', ai.item_type,
                'title', ai.title,
                'passage_text', ai.passage_text,
                'audio_url', ai.audio_url,
                'audio_storage_path', ai.audio_storage_path,
                'audio_file_name', ai.audio_file_name,
                'order_index', ai.order_index,
                'min_recording_sec', ai.min_recording_sec,
                'max_recording_sec', ai.max_recording_sec
              )
              order by ai.order_index
            ) filter (where ai.id is not null),
            '[]'::json
          ) as items
        from assignment_targets at
        join assignments a on a.id = at.assignment_id
        left join assignment_items ai on ai.assignment_id = a.id
        where at.student_id = $1
        group by a.id, at.due_at, at.status
        order by coalesce(at.due_at, a.due_at, a.created_at) asc
      `,
      [studentId],
    );

    return Promise.all(result.rows.map(mapAssignmentWithSignedUrls));
  },

  async getAssignmentForStudent(studentId: string, assignmentId: string) {
    const assignments = await this.getAssignmentsForStudent(studentId);
    return assignments.find((assignment) => assignment.id === assignmentId);
  },
};
