-- Calendar, notice, and test extension schema.
-- Safe to run on an existing local PostgreSQL database. Does not drop existing tables.

create table if not exists class_calendar_events (
  id text primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  class_id text not null references classes(id) on delete cascade,
  schedule_day_id text references class_schedule_days(id) on delete set null,
  event_type text not null check (event_type in ('test', 'cancelled', 'makeup', 'notice', 'class', 'etc')),
  title text not null,
  description text,
  event_date date not null,
  start_time time,
  end_time time,
  status text not null default 'active' check (status in ('active', 'cancelled', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notices (
  id text primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  title text not null,
  content text not null,
  image_url text,
  image_storage_path text,
  image_file_name text,
  status text not null default 'published' check (status in ('draft', 'published', 'hidden', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notice_targets (
  id text primary key,
  notice_id text not null references notices(id) on delete cascade,
  class_id text references classes(id) on delete cascade,
  student_id text references students(id) on delete cascade,
  target_type text not null check (target_type in ('all', 'class', 'student')),
  created_at timestamptz not null default now(),
  check (
    (target_type = 'all' and class_id is null and student_id is null)
    or (target_type = 'class' and class_id is not null and student_id is null)
    or (target_type = 'student' and student_id is not null)
  )
);

create table if not exists tests (
  id text primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  class_id text references classes(id) on delete cascade,
  calendar_event_id text references class_calendar_events(id) on delete set null,
  title text not null,
  subject text not null,
  test_date date not null,
  start_time time,
  end_time time,
  scope text,
  description text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists test_results (
  id text primary key,
  test_id text not null references tests(id) on delete cascade,
  teacher_id text not null references teachers(id) on delete cascade,
  class_id text references classes(id) on delete set null,
  student_id text not null references students(id) on delete cascade,
  score numeric(5,2),
  max_score numeric(5,2) not null default 100,
  result text not null check (result in ('PASS', 'NonPASS')),
  teacher_memo text,
  taken_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_id, student_id)
);

create index if not exists class_calendar_events_teacher_date_idx on class_calendar_events(teacher_id, event_date);
create index if not exists class_calendar_events_class_date_idx on class_calendar_events(class_id, event_date);
create index if not exists notices_teacher_status_idx on notices(teacher_id, status, published_at desc);
create index if not exists notice_targets_notice_id_idx on notice_targets(notice_id);
create index if not exists notice_targets_class_id_idx on notice_targets(class_id);
create index if not exists notice_targets_student_id_idx on notice_targets(student_id);
create index if not exists tests_teacher_date_idx on tests(teacher_id, test_date);
create index if not exists tests_class_date_idx on tests(class_id, test_date);
create index if not exists test_results_student_id_idx on test_results(student_id);
create index if not exists test_results_teacher_class_idx on test_results(teacher_id, class_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists class_calendar_events_set_updated_at on class_calendar_events;
create trigger class_calendar_events_set_updated_at before update on class_calendar_events for each row execute function set_updated_at();

drop trigger if exists notices_set_updated_at on notices;
create trigger notices_set_updated_at before update on notices for each row execute function set_updated_at();

drop trigger if exists tests_set_updated_at on tests;
create trigger tests_set_updated_at before update on tests for each row execute function set_updated_at();

drop trigger if exists test_results_set_updated_at on test_results;
create trigger test_results_set_updated_at before update on test_results for each row execute function set_updated_at();

insert into notices (id, teacher_id, title, content, status, published_at)
values
  ('notice-global-weekly', 'teacher-1', '이번 주 학원 전체 안내', '이번 주 금요일은 정상 수업입니다.', 'published', '2026-05-25T09:00:00+09:00'),
  ('notice-global-summer', 'teacher-1', '여름방학 특강 안내', '여름방학 특강 신청이 시작되었습니다.', 'published', '2026-05-24T09:00:00+09:00')
on conflict (id) do nothing;

insert into notice_targets (id, notice_id, target_type)
values
  ('notice-target-global-weekly', 'notice-global-weekly', 'all'),
  ('notice-target-global-summer', 'notice-global-summer', 'all')
on conflict (id) do nothing;

insert into notices (id, teacher_id, title, content, status, published_at)
select 'notice-class-speaking-homework', c.teacher_id, '필수 Basic Speaking 숙제 안내', '이번 주 녹음 숙제를 꼭 제출해주세요.', 'published', '2026-05-25T10:00:00+09:00'
from classes c
where c.teacher_id = 'teacher-1' and c.name ilike '%Basic Speaking%'
limit 1
on conflict (id) do nothing;

insert into notice_targets (id, notice_id, class_id, target_type)
select 'notice-target-class-speaking-homework', 'notice-class-speaking-homework', c.id, 'class'
from classes c
where c.teacher_id = 'teacher-1' and c.name ilike '%Basic Speaking%'
limit 1
on conflict (id) do nothing;

insert into class_calendar_events (id, teacher_id, class_id, event_type, title, description, event_date, status)
select 'event-sr-vocab-test', c.teacher_id, c.id, 'test', 'SR Vocabulary Test', 'Unit 3 ~ Unit 4', '2026-05-27', 'active'
from classes c
where c.teacher_id = 'teacher-1'
order by c.created_at asc
limit 1
on conflict (id) do nothing;

insert into class_calendar_events (id, teacher_id, class_id, event_type, title, description, event_date, status)
select 'event-friday-cancelled', c.teacher_id, c.id, 'cancelled', '금요일 휴강', '이번 주 금요일 수업은 휴강입니다.', '2026-05-29', 'active'
from classes c
where c.teacher_id = 'teacher-1'
order by c.created_at asc
limit 1
on conflict (id) do nothing;

insert into class_calendar_events (id, teacher_id, class_id, event_type, title, description, event_date, status)
select 'event-ar-makeup', c.teacher_id, c.id, 'makeup', 'AR 보강', 'AR 보강 수업입니다.', '2026-06-01', 'active'
from classes c
where c.teacher_id = 'teacher-1'
order by c.created_at asc
limit 1
on conflict (id) do nothing;

insert into tests (id, teacher_id, class_id, calendar_event_id, title, subject, test_date, scope, status)
select 'test-sr-vocab', c.teacher_id, c.id, 'event-sr-vocab-test', 'SR Vocabulary Test', 'SR', '2026-05-27', 'Unit 3 ~ Unit 4', 'scheduled'
from classes c
where c.teacher_id = 'teacher-1'
order by c.created_at asc
limit 1
on conflict (id) do nothing;

insert into test_results (id, test_id, teacher_id, class_id, student_id, score, result, teacher_memo, taken_at)
select concat('test-result-sr-', s.id), 'test-sr-vocab', s.teacher_id, cm.class_id, s.id,
  case when s.name in ('Hayun', '하윤') then 64 else 92 end,
  case when s.name in ('Hayun', '하윤') then 'NonPASS' else 'PASS' end,
  case when s.name in ('Hayun', '하윤') then '복습이 더 필요합니다.' else '잘했습니다.' end,
  '2026-05-20'
from students s
join class_memberships cm on cm.student_id = s.id
join tests t on t.id = 'test-sr-vocab' and t.class_id = cm.class_id
where s.teacher_id = 'teacher-1'
  and s.name in ('유재영', 'Yoo Jaeyoung', 'Hayun')
on conflict (test_id, student_id) do nothing;
