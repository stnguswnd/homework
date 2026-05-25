-- Homework Studio performance indexes.
-- Run after database/auth.sql and database/calendar_notice_test.sql.
-- This file is safe to re-run because every index uses IF NOT EXISTS.

create index if not exists idx_assignment_targets_student_due
  on assignment_targets(student_id, due_at);

create index if not exists idx_assignment_targets_assignment_student
  on assignment_targets(assignment_id, student_id);

create index if not exists idx_submissions_assignment_student
  on submissions(assignment_id, student_id);

create index if not exists idx_submissions_student_created
  on submissions(student_id, created_at);

-- The current schema has target_type + class_id/student_id, not a generic target_id.
create index if not exists idx_notice_targets_type_class_student
  on notice_targets(target_type, class_id, student_id);

-- The current calendar schema uses event_date, not start_at.
create index if not exists idx_class_calendar_events_class_date
  on class_calendar_events(class_id, event_date);
