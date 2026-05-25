# Calendar, Notice, Test DB Schema Plan

작성일: 2026-05-25

## 목적

학생 홈과 반 상세 캘린더에서 아래 정보를 DB 기반으로 보여주기 위한 스키마 확장 방향을 정리한다.

- 캘린더에서 날짜별 숙제 개수
- 시험 일정
- 휴강 일정
- 보강 일정
- 공지사항
- 시험 결과 / 시험 히스토리

현재 운영 구조는 `teacher_id = teacher-1` mock 기반이지만, 모든 신규 테이블은 강사별 데이터 분리를 전제로 `teacher_id`를 필수로 둔다.

## 현재 DB 구조 요약

### 사용자 / 반 / 학생

- `teachers`
  - 강사 계정 기준 테이블
  - 모든 강사용 데이터는 `teacher_id`로 필터링해야 한다.

- `students`
  - 학생 로그인과 학생 프로필
  - `teacher_id`, `student_login_id`, `password_hash`, `name`, `school_name`, `grade`, `status`

- `classes`
  - 반/팀 테이블
  - `teacher_id`, `name`, `description`, `status`

- `class_memberships`
  - 학생과 반의 N:M 관계
  - 학생이 여러 반에 들어갈 수 있다.

### 수업 캘린더

- `class_schedule_days`
  - 현재 수업 캘린더의 기준 테이블
  - 주요 컬럼:
    - `class_id`
    - `date`
    - `has_class`
    - `start_time`
    - `end_time`
    - `book_title`
    - `progress_title`
    - `progress_memo`
    - `next_prep`
  - 현재 용도:
    - 반별 수업일
    - 수업 시간
    - 진도 기록
    - 다음 준비
  - `unique (class_id, date)`가 있어서 한 반은 하루에 수업일 레코드 하나만 가진다.

### 숙제

- `assignments`
  - 숙제 source/template 성격의 테이블
  - 여러 반/학생에게 배정될 수 있다.
  - 주요 컬럼:
    - `teacher_id`
    - `class_id` nullable
    - `schedule_day_id` nullable
    - `title`
    - `description`
    - `assignment_type`
    - `assignment_subject`
    - `image_storage_path`
    - `due_at`
    - `status`

- `assignment_items`
  - 숙제 문항/지문/원본 음원
  - 원본 MP3는 `audio_storage_path`
  - 이미지 문항은 `image_storage_path`

- `assignment_targets`
  - 실제 학생별 배정 테이블
  - 캘린더에서 “숙제 몇 개 냈는지”를 계산할 때 가장 중요한 테이블
  - 주요 컬럼:
    - `assignment_id`
    - `class_id`
    - `student_id`
    - `status`
    - `due_at`
    - `submitted_at`
  - 현재 제약:
    - `unique (assignment_id, student_id)`
    - 같은 학생에게 같은 숙제 source는 한 번만 배정 가능

### 제출 / 피드백

- `submissions`
  - 학생 제출 단위
  - 승인/반려는 `submissions.status`에 저장한다.
  - `status`: `not_submitted`, `submitted`, `reviewed`, `returned`

- `submission_items`
  - 학생 녹음 파일 메타데이터
  - 실제 파일은 Supabase Storage

- `teacher_feedback`
  - 제출별 강사 피드백
  - 현재는 숙제 제출 피드백 중심
  - 시험 결과 피드백까지 섞기보다는 시험 전용 결과 테이블을 따로 두는 편이 낫다.

## 현재 구조로 가능한 것

### 캘린더에서 숙제 개수 표시

이미 가능하다.

반 기준 날짜별 숙제 개수는 `assignment_targets` 기준으로 계산하는 것이 가장 정확하다.

권장 기준:

```sql
select
  at.class_id,
  coalesce(at.due_at, a.due_at)::date as date,
  count(distinct at.assignment_id) as assignment_count
from assignment_targets at
join assignments a on a.id = at.assignment_id
where a.teacher_id = $1
  and at.class_id = $2
  and coalesce(at.due_at, a.due_at)::date between $3 and $4
group by at.class_id, coalesce(at.due_at, a.due_at)::date;
```

주의:

- `assignments.schedule_day_id`도 있지만, 실제 배정과 마감은 `assignment_targets.due_at`에 있으므로 학생에게 보이는 숙제 수는 `assignment_targets` 기준이 맞다.
- `assignments.schedule_day_id`는 “이 수업일에 만든/연결된 숙제” 표현에는 쓸 수 있지만, 학생별 배정 현황에는 부족하다.

### 수업 여부 / 휴강 비슷한 표현

`class_schedule_days.has_class = false`로 단순 휴강 표시를 할 수는 있다.

하지만 현재 테이블에는 `휴강`, `보강`, `시험`, `기타 일정` 같은 event type이 없다.

따라서 캘린더 이벤트를 제대로 운영하려면 별도 테이블이 필요하다.

## 현재 구조의 부족한 점

### 공지사항 테이블 없음

현재 `notices`, `announcements`, `boards`에 해당하는 테이블이 없다.

학생 홈의 공지사항 캐러셀은 현재 목업 데이터로만 가능하다.

필요한 기능:

- 강사가 공지 작성
- 이미지 첨부
- 전체 공개 또는 특정 반 공개
- 학생은 자신이 속한 반/강사의 공지만 조회
- 게시/숨김 상태

### 시험 일정 테이블 없음

현재 시험 일정은 `class_schedule_days.progress_memo` 같은 텍스트에 섞어 넣을 수밖에 없다.

하지만 캘린더에서 시험만 필터링하거나, 다가오는 시험을 뽑거나, 시험 범위를 표시하려면 별도 테이블이 필요하다.

### 시험 결과 테이블 없음

현재 학생 학습 이력은 숙제/제출 중심이다.

시험 결과의 `PASS / NonPASS`, 점수, 선생님 메모, 시험 범위는 별도 구조가 필요하다.

## 권장 확장 구조

최소 구현 기준으로 아래 3개 테이블을 추가하는 것을 권장한다.

1. `class_calendar_events`
2. `notices`
3. `notice_targets`
4. `tests`
5. `test_results`

공지 대상까지 세분화하면 총 5개다.

## 1. class_calendar_events

수업 캘린더에서 시험 일정, 휴강, 보강, 기타 일정을 표현하는 범용 이벤트 테이블.

```sql
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

create index if not exists class_calendar_events_teacher_date_idx
  on class_calendar_events(teacher_id, event_date);

create index if not exists class_calendar_events_class_date_idx
  on class_calendar_events(class_id, event_date);
```

용도:

- `event_type = 'test'`: 시험 일정
- `event_type = 'cancelled'`: 휴강
- `event_type = 'makeup'`: 보강
- `event_type = 'etc'`: 기타 일정

`class_schedule_days`와의 관계:

- `class_schedule_days`: 수업일/진도 기준
- `class_calendar_events`: 수업일 위에 표시되는 이벤트

휴강 처리 방식:

- 단순히 수업 없음만 필요하면 `class_schedule_days.has_class = false`
- 학생 캘린더에 “AL 휴강” 이벤트로 보여줘야 하면 `class_calendar_events`에 `event_type = 'cancelled'`도 함께 생성

보강 처리 방식:

- 보강 날짜에 `class_schedule_days`를 만들고 `has_class = true`
- 동시에 `class_calendar_events.event_type = 'makeup'` 생성

## 2. tests

시험 일정과 시험 정의를 저장하는 테이블.

```sql
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

create index if not exists tests_teacher_date_idx
  on tests(teacher_id, test_date);

create index if not exists tests_class_date_idx
  on tests(class_id, test_date);
```

권장 흐름:

1. 강사가 시험 일정을 만든다.
2. `tests`에 시험 정의 저장
3. 같은 날짜 캘린더 표시를 위해 `class_calendar_events`에도 `event_type = 'test'` 저장
4. `tests.calendar_event_id`로 연결

장점:

- 캘린더에는 이벤트로 표시
- 시험 결과/히스토리는 `tests` 기준으로 안정적으로 join

## 3. test_results

학생별 시험 결과.

```sql
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

create index if not exists test_results_student_id_idx
  on test_results(student_id);

create index if not exists test_results_teacher_class_idx
  on test_results(teacher_id, class_id);
```

학생 홈 시험 히스토리 조회 기준:

```sql
select
  tr.id,
  t.title,
  t.subject,
  coalesce(tr.taken_at, t.test_date) as date,
  tr.score,
  tr.max_score,
  tr.result,
  tr.teacher_memo
from test_results tr
join tests t on t.id = tr.test_id
where tr.student_id = $1
  and tr.teacher_id = $2
order by coalesce(tr.taken_at, t.test_date) desc;
```

다가오는 시험 조회 기준:

학생이 속한 반의 시험 중 아직 지나지 않은 시험을 조회한다.

```sql
select
  t.id,
  t.title,
  t.subject,
  t.test_date,
  t.scope
from tests t
join class_memberships cm on cm.class_id = t.class_id
where cm.student_id = $1
  and t.teacher_id = $2
  and t.status = 'scheduled'
  and t.test_date >= current_date
order by t.test_date asc
limit 1;
```

## 4. notices

공지사항 본문 테이블.

```sql
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

create index if not exists notices_teacher_status_idx
  on notices(teacher_id, status, published_at desc);
```

이미지 저장:

- Supabase Storage bucket은 기존 `homework-image` 사용 가능
- path 예시:
  - `notices/{noticeId}/{fileName}`
- DB source of truth:
  - `image_storage_path`
  - `image_file_name`
- API 응답 시 signed URL 생성

## 5. notice_targets

공지사항 공개 대상을 저장한다.

```sql
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

create index if not exists notice_targets_notice_id_idx
  on notice_targets(notice_id);

create index if not exists notice_targets_class_id_idx
  on notice_targets(class_id);

create index if not exists notice_targets_student_id_idx
  on notice_targets(student_id);
```

학생 공지 조회 기준:

```sql
select distinct n.*
from notices n
left join notice_targets nt on nt.notice_id = n.id
left join class_memberships cm on cm.class_id = nt.class_id
where n.teacher_id = $2
  and n.status = 'published'
  and (
    nt.target_type = 'all'
    or nt.student_id = $1
    or cm.student_id = $1
  )
order by n.published_at desc nulls last, n.created_at desc;
```

## 캘린더 통합 조회 설계

학생 캘린더는 한 API에서 아래 데이터를 합쳐 내려주는 방식이 좋다.

권장 API:

```text
GET /api/student/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
```

반환 예시:

```ts
{
  events: Array<{
    id: string;
    date: string;
    type: "assignment" | "test" | "cancelled" | "makeup" | "class" | "etc";
    title: string;
    count?: number;
    classId?: string;
    className?: string;
  }>;
}
```

이 API에서 합칠 데이터:

1. 숙제 개수
   - `assignment_targets`
   - `assignments`
   - 현재 학생 또는 학생이 속한 반 기준

2. 시험/휴강/보강/기타 일정
   - `class_calendar_events`
   - `class_memberships`

3. 시험 상세
   - 필요하면 `tests` join

숙제 이벤트 예시:

```sql
select
  coalesce(at.due_at, a.due_at)::date as date,
  'assignment' as type,
  concat('숙제 ', count(distinct at.assignment_id), '개') as title,
  count(distinct at.assignment_id) as count
from assignment_targets at
join assignments a on a.id = at.assignment_id
where at.student_id = $1
  and a.teacher_id = $2
  and coalesce(at.due_at, a.due_at)::date between $3 and $4
group by coalesce(at.due_at, a.due_at)::date;
```

이벤트 조회 예시:

```sql
select
  e.id,
  e.event_date as date,
  e.event_type as type,
  e.title,
  e.class_id,
  c.name as class_name
from class_calendar_events e
join classes c on c.id = e.class_id
join class_memberships cm on cm.class_id = e.class_id
where cm.student_id = $1
  and e.teacher_id = $2
  and e.status = 'active'
  and e.event_date between $3 and $4
order by e.event_date asc;
```

## 강사 API 권장 구조

### 공지사항

```text
GET    /api/teacher/notices
POST   /api/teacher/notices
PATCH  /api/teacher/notices/:noticeId
DELETE /api/teacher/notices/:noticeId
```

주의:

- 이미지 업로드는 Route Handler 내부에서만 Supabase Storage 접근
- Client Component에서 `supabase.storage.upload()` 금지
- 강사 API는 `teacher_id` 필터 필수

### 시험

```text
GET   /api/teacher/tests
POST  /api/teacher/tests
PATCH /api/teacher/tests/:testId
POST  /api/teacher/tests/:testId/results
```

`POST /api/teacher/tests` 처리:

- `tests` insert
- 동시에 `class_calendar_events(event_type = 'test')` insert
- `tests.calendar_event_id` 업데이트

### 캘린더 이벤트

```text
GET    /api/teacher/classes/:classId/calendar-events?start=YYYY-MM-DD&end=YYYY-MM-DD
POST   /api/teacher/classes/:classId/calendar-events
PATCH  /api/teacher/classes/:classId/calendar-events/:eventId
DELETE /api/teacher/classes/:classId/calendar-events/:eventId
```

휴강 생성:

- `class_calendar_events.event_type = 'cancelled'`
- 해당 날짜 `class_schedule_days.has_class = false`로 맞추는 것을 권장

보강 생성:

- `class_calendar_events.event_type = 'makeup'`
- 해당 날짜 `class_schedule_days.has_class = true`

## 학생 API 권장 구조

학생은 반드시 student session 기준으로만 조회한다.

```text
GET /api/student/home
GET /api/student/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
GET /api/student/notices
GET /api/student/tests/upcoming
GET /api/student/tests/results
```

`GET /api/student/home`에서 한 번에 내려줘도 된다.

```ts
{
  notices: Notice[];
  profile: {
    studentId: string;
    name: string;
    classNames: string[];
  };
  weeklyHomework: Assignment[];
  calendarEvents: CalendarEvent[];
  upcomingTests: UpcomingTest[];
  testResults: TestResult[];
}
```

## 기존 테이블을 수정할지 여부

### class_schedule_days

현재 테이블은 유지한다.

추가해도 좋은 컬럼:

```sql
alter table class_schedule_days
  add column if not exists schedule_type text not null default 'regular'
  check (schedule_type in ('regular', 'makeup', 'cancelled'));
```

하지만 이벤트가 늘어날 가능성이 크므로 `class_calendar_events`를 별도로 두는 편이 더 확장성이 좋다.

권장:

- `class_schedule_days`는 수업/진도 전용
- `class_calendar_events`는 학생/강사용 캘린더 이벤트 전용

### assignments

현재 구조 유지.

숙제 개수는 `assignment_targets`로 계산.

`assignments.schedule_day_id`는 계속 optional로 두고, 수업일과 숙제를 명시적으로 연결하고 싶을 때만 사용.

## 권장 Supabase Storage 구조

현재 bucket:

- `homework-image`
- `homework-audio`

공지 이미지는 `homework-image` 사용 권장.

Path:

```text
notices/{noticeId}/{fileName}
tests/{testId}/attachments/{fileName} -- 나중에 시험지 이미지/파일이 필요할 경우
```

DB에는 파일 바이너리를 저장하지 않는다.

공지 이미지 DB 컬럼:

- `image_storage_path`
- `image_file_name`
- `image_url`은 개발 fallback 또는 legacy 용도

## 구현 우선순위

1. `class_calendar_events` 추가
2. 학생/강사 캘린더 API에서 숙제 개수 + 이벤트 통합 조회
3. `notices`, `notice_targets` 추가
4. 학생 홈 공지사항을 DB 조회로 변경
5. `tests`, `test_results` 추가
6. 시험 생성 시 `class_calendar_events`와 연결
7. 학생 홈 다가오는 시험/시험 히스토리를 DB 조회로 변경

## migration SQL 반영 위치

신규 Supabase DB용 통합본:

- `database/auth.sql`

분리 관리 파일:

- `database/schema.sql`
- `database/indexes.sql`
- 필요 시 `database/views.sql`

이번 확장 테이블들은 legacy 보정이 아니므로 신규 schema에 들어가도 된다.

다만 실제 Supabase에 적용하기 전에는 아래 순서로 테스트 DB에서 먼저 검증해야 한다.

```bash
psql "$DATABASE_URL" -f database/auth.sql
npm run build
```

## 주의할 점

- 학생 캘린더는 반드시 `student session`의 `studentId`, `teacherId` 기준으로 조회해야 한다.
- 강사 API는 반드시 `teacher_id` 기준으로 필터링해야 한다.
- 공지 이미지 업로드는 Route Handler에서만 처리한다.
- Client Component에서 Supabase SDK 직접 호출 금지.
- 시험 결과는 학생별 민감 데이터이므로 다른 학생 결과가 보이면 안 된다.
- 공지사항이 전체 공지인지, 반 공지인지, 학생 개별 공지인지 target 구조를 명확히 유지해야 한다.

