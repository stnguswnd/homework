-- Views for a fresh Supabase database.
-- For a one-shot SQL Editor migration, use database/auth.sql instead.

create or replace view class_list_view as
select
  c.id,
  c.teacher_id,
  c.name,
  c.description,
  c.status,
  count(cm.student_id)::int as student_count,
  c.created_at,
  c.updated_at
from classes c
left join class_memberships cm on cm.class_id = c.id
group by c.id;

create or replace view student_list_view as
select
  s.id,
  s.teacher_id,
  s.student_login_id,
  s.name,
  s.school_name,
  s.grade,
  s.avatar_key,
  s.memo,
  s.parent_id,
  s.status,
  coalesce(array_remove(array_agg(c.id order by c.name), null), array[]::text[]) as class_ids,
  coalesce(array_remove(array_agg(c.name order by c.name), null), array[]::text[]) as class_names,
  s.created_at,
  s.updated_at
from students s
left join class_memberships cm on cm.student_id = s.id
left join classes c on c.id = cm.class_id
group by s.id;

create or replace view student_learning_history_view as
select
  concat('history-', at.assignment_id, '-', at.student_id) as id,
  at.student_id,
  coalesce(at.submitted_at, at.due_at, a.due_at, a.created_at)::date as date,
  a.title as assignment_title,
  a.assignment_type,
  c.name as class_name,
  case
    when sub.id is not null then 'submitted'
    when coalesce(at.due_at, a.due_at) is not null and coalesce(at.due_at, a.due_at) < now() then 'late'
    else 'not_submitted'
  end as submit_status,
  tf.score,
  case
    when tf.id is not null or sub.status = 'reviewed' or at.reviewed = true then 'reviewed'
    when sub.id is not null then 'pending'
    else 'none'
  end as review_status,
  case
    when sub.id is not null then concat('/teacher/submissions/', sub.id)
    else null
  end as detail_href
from assignment_targets at
join assignments a on a.id = at.assignment_id
left join classes c on c.id = at.class_id and c.teacher_id = a.teacher_id
left join submissions sub on sub.assignment_id = a.id and sub.student_id = at.student_id
left join teacher_feedback tf on tf.submission_id = sub.id;

create or replace view assignment_target_status_view as
select
  at.id as target_id,
  at.assignment_id,
  at.class_id,
  c.name as class_name,
  at.student_id,
  s.name as student_name,
  at.status as target_status,
  at.due_at,
  at.submitted_at as target_submitted_at,
  at.reviewed,
  at.feedback,
  at.cancelled_at,
  at.cancelled_by,
  sub.id as submission_id,
  sub.status as submission_status,
  sub.submitted_at,
  sub.reviewed_at,
  case
    when at.status = 'cancelled' then 'cancelled'
    when sub.id is not null and coalesce(sub.status, 'not_submitted') <> 'not_submitted' then 'submitted'
    when at.status in ('submitted', 'late') then 'submitted'
    else 'not_submitted'
  end as computed_submission_status,
  case
    when at.status = 'cancelled' then false
    when sub.id is not null and coalesce(sub.status, 'not_submitted') <> 'not_submitted' then false
    when at.status in ('submitted', 'late') then false
    else true
  end as cancellable
from assignment_targets at
join assignments a on a.id = at.assignment_id
join students s on s.id = at.student_id
left join classes c on c.id = at.class_id
left join submissions sub on sub.assignment_id = at.assignment_id and sub.student_id = at.student_id;
