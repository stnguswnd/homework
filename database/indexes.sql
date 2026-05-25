-- Indexes for a fresh Supabase database.
-- For a one-shot SQL Editor migration, use database/auth.sql instead.

create unique index if not exists classes_teacher_name_unique
  on classes(teacher_id, lower(name));

create index if not exists auth_sessions_user_id_idx on auth_sessions(user_id);
create index if not exists auth_sessions_expires_at_idx on auth_sessions(expires_at);
create index if not exists students_teacher_id_idx on students(teacher_id);
create index if not exists class_memberships_student_id_idx on class_memberships(student_id);
create index if not exists assignments_teacher_id_idx on assignments(teacher_id);
create index if not exists assignments_class_id_idx on assignments(class_id);
create index if not exists assignment_targets_student_id_idx on assignment_targets(student_id);
create index if not exists assignment_targets_class_id_idx on assignment_targets(class_id);
create index if not exists idx_assignment_targets_assignment_status on assignment_targets(assignment_id, status);
create index if not exists idx_assignment_targets_assignment_class_status on assignment_targets(assignment_id, class_id, status);
create index if not exists idx_assignment_targets_cancelled_at on assignment_targets(cancelled_at) where status = 'cancelled';
create index if not exists submissions_student_id_idx on submissions(student_id);
create index if not exists submissions_assignment_target_id_idx on submissions(assignment_target_id);
create index if not exists submission_items_submission_id_idx on submission_items(submission_id);
