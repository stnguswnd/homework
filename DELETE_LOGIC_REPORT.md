# Delete Logic Report

이 문서는 현재 Homework Studio 코드와 DB FK 기준의 삭제/비활성/취소 동작을 정리한다.

## 용어

- 물리 삭제: `delete from ...`으로 row가 실제 삭제된다.
- soft delete: row는 남기고 `status` 컬럼만 변경한다.
- cascade 삭제: DB foreign key의 `on delete cascade` 때문에 부모 row 삭제 시 자식 row가 자동 삭제된다.
- set null: DB foreign key의 `on delete set null` 때문에 부모 row 삭제 시 참조 컬럼만 `null`로 바뀐다.

## 현재 결론

- 과제 자체 삭제 API는 현재 없다.
- 학생 삭제는 물리 삭제가 아니라 `students.status = 'inactive'`로 바꾸는 soft delete다.
- 반 삭제는 이력 유무에 따라 다르다.
- 이력 없는 반은 물리 삭제된다.
- 이력 있는 반은 `classes.status = 'archived'`로 비활성 처리된다.
- 과제 배정 취소는 `assignment_targets.status = 'cancelled'`로 바꾸는 soft cancel이다.

## 과제 관련

### 과제 자체 삭제

현재 코드에는 `DELETE /api/teacher/assignments/:assignmentId` 또는 `DELETE /api/teacher/assignments?id=...` 형태의 과제 삭제 API가 없다.

따라서 웹에서 과제를 삭제했을 때 연결된 반의 학생들이 바뀌는 로직은 현재 존재하지 않는다. 학생의 `students.status`, `class_memberships`, `classes`는 과제 삭제로 변경되지 않는다.

만약 DB에서 직접 `assignments` row를 물리 삭제하면 다음 FK가 작동한다.

- `assignment_items.assignment_id references assignments(id) on delete cascade`
  - 과제 문항 row 삭제
- `assignment_vocabulary_items.assignment_id references assignments(id) on delete cascade`
  - 단어 과제 단어 row 삭제
- `assignment_targets.assignment_id references assignments(id) on delete cascade`
  - 학생별 과제 배정 row 삭제
- `submissions.assignment_id references assignments(id) on delete cascade`
  - 제출 row 삭제
- `submissions`가 삭제되면 `submission_items.submission_id on delete cascade`
  - 제출 문항 row 삭제
- `submissions`가 삭제되면 `submission_vocabulary_items.submission_id on delete cascade`
  - 단어 제출 row 삭제
- `submissions`가 삭제되면 `teacher_feedback.submission_id on delete cascade`
  - 교사 피드백 row 삭제

즉 DB에서 과제를 물리 삭제하면 과제와 제출 이력까지 같이 사라진다. 하지만 현재 앱 UI/API는 이 동작을 제공하지 않는다.

### 과제 배정 취소

API: `PATCH /api/teacher/assignment-targets/cancel`

변경되는 테이블과 컬럼:

- `assignment_targets.status = 'cancelled'`
- `assignment_targets.cancelled_at = now()`
- `assignment_targets.cancelled_by = teacherId`
- `assignment_targets.updated_at = now()`

취소 가능한 조건:

- 제출이 없어야 한다.
- `assignment_targets.status`가 `submitted`, `late`, `cancelled`가 아니어야 한다.
- 연결된 `submissions.status`가 `not_submitted`이거나 제출 row가 없어야 한다.

취소 시 바뀌지 않는 것:

- `students` row는 유지된다.
- `classes` row는 유지된다.
- `class_memberships`는 유지된다.
- `assignments` row는 유지된다.
- 이미 제출된 과제는 취소 대상에서 제외된다.

### 과제 생성/수정 시 하위 데이터 교체

API: `POST /api/teacher/assignments`

이 API는 신규 생성과 기존 과제 수정/upsert를 같이 처리한다.

변경되는 주요 컬럼:

- `assignments.title`
- `assignments.description`
- `assignments.assignment_type`
- `assignments.assignment_subject`
- `assignments.image_url`
- `assignments.image_storage_path`
- `assignments.image_file_name`
- `assignments.due_at`
- `assignments.status`
- `assignments.class_id`
- `assignments.updated_at`

문항은 `assignment_items`에 `insert ... on conflict (assignment_id, order_index) do update` 방식으로 갱신된다.

단어 과제인 경우:

- `delete from assignment_vocabulary_items where assignment_id = $1`
- 이후 현재 입력된 단어 목록을 다시 insert

따라서 단어 목록은 수정 시 기존 단어 row가 삭제되고 재생성된다. 이때 `submission_vocabulary_items.assignment_vocabulary_item_id`는 `on delete cascade`이므로, 이미 제출된 단어별 제출 row가 있는 운영 데이터에서 이 동작은 이력 손실 위험이 있다.

## 반 관련

### 반 삭제 정책

API: `DELETE /api/teacher/classes/:classId`

먼저 다음 테이블의 이력 count를 조회한다.

- `class_schedule_days`
- `class_calendar_events`
- `assignments`
- `assignment_targets`
- `tests`
- `test_results`
- `notice_targets`

`class_memberships`는 삭제 차단 조건이 아니다. 학생 배정만 있는 반은 hard delete 가능하다.

### 이력이 없는 반 삭제

조건:

- 위 이력 count가 모두 0
- `class_memberships`는 있어도 됨

실행 SQL:

```sql
delete from classes
where id = :classId
  and teacher_id = :teacherId;
```

DB FK로 자동 처리되는 것:

- `class_memberships.class_id references classes(id) on delete cascade`
  - 해당 반의 학생 배정 row 삭제

삭제 후 학생 상태:

- `students` row는 삭제되지 않는다.
- `students.status`는 바뀌지 않는다.
- 학생은 학생 목록에 남는다.
- 해당 반 membership이 사라졌기 때문에 활성 반이 없으면 “소속 반 없음/활성 반 없음” 상태가 된다.

삭제 후 반 관련 데이터:

- `classes` row 삭제
- 해당 `class_memberships` row 삭제

### 이력이 있는 반 삭제

조건:

- `class_schedule_days`, `class_calendar_events`, `assignments`, `assignment_targets`, `tests`, `test_results`, `notice_targets` 중 하나라도 count > 0

실행 SQL:

```sql
update classes
set status = 'archived',
    updated_at = now()
where id = :classId
  and teacher_id = :teacherId;
```

변경되는 컬럼:

- `classes.status: active -> archived`
- `classes.updated_at = now()`

삭제되지 않는 것:

- `classes` row는 유지된다.
- `class_memberships` row는 유지된다.
- `students` row는 유지된다.
- `assignments`, `assignment_targets`, `submissions`, `tests`, `test_results`, `notices`, `notice_targets`, `class_calendar_events`, `class_schedule_days`는 유지된다.

화면 정책:

- 기본 반 목록은 `classes.status = 'active'`만 보여준다.
- `archived`는 UI에서 “비활성 반”으로 표시한다.
- 비활성 반 탭에서 조회한다.

### 반 물리 삭제를 DB에서 직접 실행했을 때의 FK 영향

앱 API는 이력 있는 반을 hard delete하지 않지만, SQL Editor에서 직접 `delete from classes`를 실행하면 DB FK가 아래처럼 동작한다.

- `class_memberships.class_id on delete cascade`
  - 반 배정 삭제
- `class_schedule_days.class_id on delete cascade`
  - 수업 일정 삭제
- `class_calendar_events.class_id on delete cascade`
  - 캘린더 이벤트 삭제
- `assignment_targets.class_id on delete cascade`
  - 해당 반 기준 과제 배정 삭제
- `tests.class_id on delete cascade`
  - 테스트 삭제
- `notice_targets.class_id on delete cascade`
  - 공지 대상 연결 삭제
- `assignments.class_id on delete set null`
  - 과제 row는 남고 `assignments.class_id = null`
- `test_results.class_id on delete set null`
  - 시험 결과 row는 남고 `test_results.class_id = null`

운영 정책상 이력 있는 반은 직접 hard delete하면 안 된다. 앱 API의 비활성 처리 경로를 써야 한다.

## 학생 관련

### 학생 삭제

API: `DELETE /api/teacher/students/:studentId`

현재 학생 삭제는 물리 삭제가 아니다.

실행 SQL:

```sql
update students
set status = 'inactive',
    updated_at = now()
where id = :studentId
  and teacher_id = :teacherId;
```

변경되는 컬럼:

- `students.status: active -> inactive`
- `students.updated_at = now()`

삭제되지 않는 것:

- `students` row는 유지된다.
- `class_memberships`는 유지된다.
- `assignment_targets`는 유지된다.
- `submissions`는 유지된다.
- `submission_items`는 유지된다.
- `submission_vocabulary_items`는 유지된다.
- `teacher_feedback`는 유지된다.
- `test_results`는 유지된다.
- `certificates`는 유지된다.

즉 학생을 삭제해도 관련 과제가 다 사라지는 구조가 아니다. 학생은 비활성 처리되고, 이력은 남는다.

### 학생 비활성화 후 앱 동작

대부분의 신규 배정/조회 로직은 `students.status = 'active'` 조건을 사용한다.

예:

- 과제 생성/배정 시 active 학생만 대상
- bulk assign 시 active 학생만 대상
- 반 overview는 active 학생 중심

따라서 비활성 학생은 새 과제 배정 대상에서 빠진다. 기존 제출/이력 row는 DB에 유지된다.

### 학생을 DB에서 직접 물리 삭제했을 때의 FK 영향

앱 API는 학생을 물리 삭제하지 않는다. 하지만 SQL Editor에서 직접 `delete from students`를 실행하면 다음 FK가 작동한다.

- `class_memberships.student_id on delete cascade`
  - 반 배정 삭제
- `assignment_targets.student_id on delete cascade`
  - 과제 배정 삭제
- `submissions.student_id on delete cascade`
  - 제출 row 삭제
- `submissions` 삭제로 `submission_items` cascade 삭제
- `submissions` 삭제로 `submission_vocabulary_items` cascade 삭제
- `submissions` 삭제로 `teacher_feedback` cascade 삭제
- `test_results.student_id on delete cascade`
  - 시험 결과 삭제
- `notice_targets.student_id on delete cascade`
  - 학생 대상 공지 연결 삭제
- `certificates.student_id on delete cascade`
  - 수료증 삭제
- `app_users.linked_student_id on delete set null`
  - 연결된 앱 유저의 학생 연결만 null

따라서 학생을 DB에서 직접 물리 삭제하면 제출/과제배정/시험결과 같은 이력이 크게 사라진다. 운영에서는 앱의 soft delete를 사용해야 한다.

## 공지 / 일정 / 테스트 삭제

### 공지 삭제

API: `DELETE /api/teacher/notices/:noticeId`

실행 SQL:

```sql
delete from notices
where id = :noticeId
  and teacher_id = :teacherId;
```

DB FK 영향:

- `notice_targets.notice_id on delete cascade`
  - 공지 대상 연결 삭제

변경/삭제:

- `notices` row 삭제
- 관련 `notice_targets` row 삭제

### 캘린더 이벤트 삭제

API: `DELETE /api/teacher/classes/:classId/calendar-events/:eventId`

실행 SQL:

```sql
update class_calendar_events
set status = 'hidden',
    updated_at = now()
where id = :eventId
  and teacher_id = :teacherId
  and class_id = :classId;
```

변경되는 컬럼:

- `class_calendar_events.status: active/cancelled -> hidden`
- `class_calendar_events.updated_at = now()`

물리 삭제가 아니라 숨김 처리다.

### 수업 일정 삭제

API: `DELETE /api/teacher/classes/:classId/schedule/:scheduleDayId`

실행 SQL:

```sql
delete from class_schedule_days
where id = :scheduleDayId
  and class_id = :classId;
```

DB FK 영향:

- `assignments.schedule_day_id references class_schedule_days(id) on delete set null`
  - 연결된 과제가 있으면 `assignments.schedule_day_id = null`
- `class_calendar_events.schedule_day_id references class_schedule_days(id) on delete set null`
  - 연결된 이벤트가 있으면 `class_calendar_events.schedule_day_id = null`

수업 일정 row 자체는 물리 삭제된다.

### 테스트 삭제

API: `DELETE /api/teacher/tests/:testId`

실행 SQL:

```sql
update tests
set status = 'hidden',
    updated_at = now()
where id = :testId
  and teacher_id = :teacherId;
```

그리고 연결된 캘린더 이벤트가 있으면:

```sql
update class_calendar_events
set status = 'hidden',
    updated_at = now()
where id = :calendarEventId
  and teacher_id = :teacherId
  and class_id = :classId;
```

변경되는 컬럼:

- `tests.status: scheduled/completed/cancelled -> hidden`
- `tests.updated_at = now()`
- 연결 이벤트가 있으면 `class_calendar_events.status = 'hidden'`
- 연결 이벤트가 있으면 `class_calendar_events.updated_at = now()`

삭제되지 않는 것:

- `tests` row 유지
- `test_results` row 유지

## Teachers / app users 직접 삭제 시 참고

앱에 강사 삭제 API는 현재 없다. DB에서 직접 삭제할 경우 FK 영향이 크다.

`teachers.id`를 삭제하면:

- `students.teacher_id on delete cascade`
  - 학생 row 삭제
- `classes.teacher_id on delete cascade`
  - 반 row 삭제
- `assignments.teacher_id on delete cascade`
  - 과제 row 삭제
- `teacher_feedback.teacher_id on delete cascade`
  - 교사 피드백 삭제
- `class_calendar_events.teacher_id on delete cascade`
  - 캘린더 이벤트 삭제
- `notices.teacher_id on delete cascade`
  - 공지 삭제
- `tests.teacher_id on delete cascade`
  - 테스트 삭제
- `test_results.teacher_id on delete cascade`
  - 테스트 결과 삭제

따라서 teacher row 직접 삭제는 전체 운영 데이터 삭제에 가깝다.

`app_users.id`를 삭제하면:

- `auth_sessions.user_id on delete cascade`
  - 세션 삭제
- `teachers.app_user_id on delete set null`
  - 강사 row는 남고 로그인 유저 연결만 끊김
- `students.app_user_id on delete set null`
  - 학생 row는 남고 로그인 유저 연결만 끊김

## 요약 표

| 대상 | 앱 API 동작 | 실제 변경 | 관련 이력 |
| --- | --- | --- | --- |
| 과제 자체 | 현재 삭제 API 없음 | 없음 | 없음 |
| 과제 배정 취소 | soft cancel | `assignment_targets.status='cancelled'` | 제출된 배정은 유지 |
| 학생 삭제 | soft delete | `students.status='inactive'` | 과제/제출/시험 이력 유지 |
| 이력 없는 반 삭제 | hard delete | `classes` 삭제, `class_memberships` cascade 삭제 | 학생 유지 |
| 이력 있는 반 삭제 | 비활성 처리 | `classes.status='archived'` | 모든 이력 유지 |
| 공지 삭제 | hard delete | `notices`, `notice_targets` 삭제 | 공지 이력 삭제 |
| 캘린더 이벤트 삭제 | soft hide | `class_calendar_events.status='hidden'` | row 유지 |
| 수업 일정 삭제 | hard delete | `class_schedule_days` 삭제 | 연결 FK는 set null |
| 테스트 삭제 | soft hide | `tests.status='hidden'`, 연결 이벤트 hidden | 테스트 결과 유지 |

## 운영상 권장

- 학생은 물리 삭제하지 말고 비활성 처리한다.
- 이력 있는 반은 물리 삭제하지 말고 비활성 처리한다.
- 과제 자체 삭제 기능을 추가할 경우, 제출 이력 보존 정책을 먼저 정해야 한다.
- DB SQL Editor에서 직접 `delete from students`, `delete from classes`, `delete from assignments`를 실행하면 앱 정책보다 훨씬 강한 cascade가 발생할 수 있다.

## 학생 화면 기준 노출 변화

이 섹션은 학생이 로그인해서 보는 `/student/home`, `/student/assignments/:assignmentId`, `/api/student/home`, `/api/student/assignments` 기준이다.

### 학생 홈에서 반 이름이 보이는 기준

학생 홈의 “내 반” 영역은 현재 다음 관계를 본다.

```sql
students
left join class_memberships on class_memberships.student_id = students.id
left join classes on classes.id = class_memberships.class_id
```

현재 코드 기준으로는 `classes.status = 'active'` 조건이 붙어 있지 않다.

따라서 현재 동작은 다음과 같다.

- 학생이 활성 반에 배정되어 있으면 그 반 이름이 보인다.
- 반이 hard delete되어 `class_memberships`가 cascade 삭제되면 반 이름이 사라진다.
- 반이 비활성 처리되어 `classes.status = 'archived'`가 되어도 `class_memberships`가 남아 있으면 현재 학생 홈에는 반 이름이 계속 보일 수 있다.

정책상 “비활성 반은 학생 홈의 내 반에서 숨김”을 원하면 학생 홈 profile 쿼리에도 아래 조건이 필요하다.

```sql
left join classes c
  on c.id = cm.class_id
 and c.teacher_id = s.teacher_id
 and c.status = 'active'
```

이 조건을 넣으면 비활성 반만 남은 학생은 학생 홈에서 `배정된 반 없음`으로 보인다.

### 과제 배정 취소 시 학생에게 보이는 것

과제 목록 API와 학생 과제 repository는 다음 조건을 사용한다.

```sql
where at.student_id = :studentId
  and at.status <> 'cancelled'
```

따라서 `assignment_targets.status = 'cancelled'`가 되면:

- 학생 홈 “이번주 숙제” 목록에서 사라진다.
- `/api/student/assignments` 응답에서 사라진다.
- `/student/assignments/:assignmentId` 직접 접근 시 해당 학생에게 과제가 조회되지 않아 404 또는 홈 redirect 흐름을 탄다.
- 기존 `assignment_targets` row는 DB에 남지만 학생에게는 보이지 않는다.
- `assignments` row 자체는 남는다.
- `submissions`가 없던 미제출 배정만 취소 대상이므로 제출 이력은 보통 없다.

### 과제 자체가 DB에서 물리 삭제된 경우

현재 앱에는 과제 삭제 API가 없다. 하지만 DB에서 직접 `assignments` row를 삭제하면 FK cascade로 다음이 삭제될 수 있다.

- `assignment_items`
- `assignment_vocabulary_items`
- `assignment_targets`
- `submissions`
- `submission_items`
- `submission_vocabulary_items`
- `teacher_feedback`

학생 화면에서는:

- 해당 과제가 숙제 목록에서 사라진다.
- 제출 완료 페이지도 더 이상 해당 과제를 찾을 수 없다.
- `/student/assignments/:assignmentId` 접근 시 조회 실패가 난다.
- 제출 이력과 선생님 피드백도 같이 사라질 수 있다.

즉 과제 물리 삭제는 학생 관점에서 “과제와 제출 기록이 통째로 사라짐”에 가깝다.

### 이력 없는 반 hard delete 시 학생에게 보이는 것

이력 없는 반 삭제는 다음 SQL을 실행한다.

```sql
delete from classes
where id = :classId
  and teacher_id = :teacherId;
```

DB FK로 해당 반의 `class_memberships`가 cascade 삭제된다.

학생 화면에서는:

- 학생 row는 유지된다.
- 학생 로그인 가능 여부는 변하지 않는다.
- 학생 홈의 “내 반”에서 해당 반 이름은 사라진다.
- 해당 학생에게 다른 반 배정이 없으면 “배정된 반 없음”으로 보인다.
- 과제 이력이 없는 반만 hard delete되므로 보통 이 반 때문에 보이던 숙제/시험/공지/일정도 없다.

### 이력 있는 반 비활성 처리 시 학생에게 보이는 것

이력 있는 반 삭제 요청은 다음 상태 변경만 한다.

```sql
update classes
set status = 'archived',
    updated_at = now()
where id = :classId
  and teacher_id = :teacherId;
```

삭제되지 않는 것:

- `classes`
- `class_memberships`
- `assignment_targets`
- `assignments`
- `submissions`
- `class_calendar_events`
- `tests`
- `test_results`
- `notice_targets`

학생 화면에서 현재 코드 기준 영향:

- 과제는 계속 보일 수 있다.
  - 학생 과제 조회는 `assignment_targets` 기준이고 `classes.status`를 필터링하지 않는다.
  - `assignment_targets.status <> 'cancelled'`이면 계속 보인다.
- 제출 완료 페이지도 계속 접근 가능하다.
- 시험 결과도 계속 보인다.
  - `getStudentTestResults`는 `test_results`와 `tests`를 기준으로 조회하고 `classes.status`를 보지 않는다.
- 예정 테스트는 계속 보일 수 있다.
  - `getStudentUpcomingTests`는 `tests.status = 'scheduled'`를 보고, `classes.status`를 보지 않는다.
- 공지는 계속 보일 수 있다.
  - `getStudentVisibleNotices`는 `notice_targets`와 `class_memberships`를 보고, `classes.status`를 보지 않는다.
- 반 캘린더 이벤트는 계속 보일 수 있다.
  - `getStudentCalendarEvents`는 `class_calendar_events.status = 'active'`와 membership을 보고, `classes.status`를 보지 않는다.
- “내 반” 이름도 현재는 계속 보일 수 있다.

정책상 비활성 반의 신규 운영 노출을 줄이고 싶다면 각 학생 조회 쿼리에 `classes.status = 'active'` 조건을 추가해야 한다. 다만 이 경우 과거 숙제/제출 이력까지 숨길지, 내 반/예정 일정만 숨길지 정책을 분리해야 한다.

추천 정책:

- 학생 홈의 “내 반”: active 반만 표시
- 예정 일정/예정 테스트/공지: active 반만 표시
- 기존 과제/제출 이력: 반이 비활성이라도 유지 표시
- 시험 결과: 반이 비활성이라도 유지 표시

### 학생 soft delete 시 학생 본인에게 보이는 것

학생 삭제 API는 다음만 변경한다.

```sql
update students
set status = 'inactive',
    updated_at = now()
where id = :studentId
  and teacher_id = :teacherId;
```

현재 학생 세션/학생 홈 조회는 학생의 `students.status = 'active'`를 명시적으로 확인하지 않는 경로가 있다.

따라서 이미 로그인 세션이 살아 있는 비활성 학생은 일부 학생 화면에 계속 접근할 가능성이 있다.

학생 비활성 처리 후 기대 정책이 “학생 로그인/접근 차단”이라면 다음 보강이 필요하다.

- 학생 로그인 시 `students.status = 'active'` 조건 확인
- 학생 세션 복원 시에도 `students.status = 'active'` 조건 확인
- 비활성 학생이면 세션 삭제 후 로그인으로 이동

현재 DB 데이터 관점:

- 비활성 학생의 기존 과제/제출/시험 결과는 DB에 남는다.
- 학생 row가 물리 삭제되지 않으므로 이력은 유지된다.
- 신규 과제 배정 로직은 대체로 `s.status = 'active'`만 대상으로 삼기 때문에 새 과제 배정에서는 빠진다.

### 공지 삭제 시 학생에게 보이는 것

공지 삭제는 물리 삭제다.

```sql
delete from notices
where id = :noticeId
  and teacher_id = :teacherId;
```

FK로 `notice_targets`도 cascade 삭제된다.

학생 화면에서는:

- 공지 캐러셀/공지 목록에서 즉시 사라진다.
- 해당 공지의 target 정보도 사라진다.
- 학생에게 과제/반/시험 데이터 변화는 없다.

### 캘린더 이벤트 삭제 시 학생에게 보이는 것

캘린더 이벤트 삭제는 물리 삭제가 아니라 숨김 처리다.

```sql
update class_calendar_events
set status = 'hidden',
    updated_at = now()
where id = :eventId
  and teacher_id = :teacherId
  and class_id = :classId;
```

학생 캘린더 조회는 다음 조건을 사용한다.

```sql
e.status = 'active'
```

따라서:

- `hidden`이 된 이벤트는 학생 캘린더에서 사라진다.
- row는 DB에 남는다.
- 같은 반의 다른 숙제/시험/공지에는 영향이 없다.

### 수업 일정 삭제 시 학생에게 보이는 것

수업 일정 삭제는 `class_schedule_days` 물리 삭제다.

```sql
delete from class_schedule_days
where id = :scheduleDayId
  and class_id = :classId;
```

FK 영향:

- 연결된 `assignments.schedule_day_id`는 `null`이 된다.
- 연결된 `class_calendar_events.schedule_day_id`는 `null`이 된다.

학생 화면에서는:

- 현재 학생 홈 캘린더는 `class_schedule_days`를 직접 조회하지 않고, 숙제 마감과 `class_calendar_events`를 보여준다.
- 따라서 단순 수업 일정 row 삭제만으로 학생 캘린더에서 바로 사라지는 항목은 제한적이다.
- 연결된 calendar event가 별도로 active 상태로 남아 있으면 이벤트는 계속 보일 수 있다.
- 과제 자체는 삭제되지 않으므로 숙제는 계속 보인다.

### 테스트 삭제 시 학생에게 보이는 것

테스트 삭제는 `tests.status = 'hidden'` 처리다.

```sql
update tests
set status = 'hidden',
    updated_at = now()
where id = :testId
  and teacher_id = :teacherId;
```

연결된 calendar event도 있으면 `class_calendar_events.status = 'hidden'`으로 바뀐다.

학생 화면에서는:

- 예정 테스트 영역에서 사라진다.
  - 예정 테스트 조회는 `tests.status = 'scheduled'`만 보여준다.
- 연결 캘린더 이벤트도 hidden 처리되므로 학생 캘린더에서 사라진다.
- `test_results`는 삭제되지 않는다.
- 다만 현재 `getStudentTestResults`는 `tests.status`를 필터링하지 않으므로, 이미 입력된 시험 결과는 계속 보일 수 있다.

정책상 숨긴 테스트의 결과도 학생에게 숨기려면 `getStudentTestResults`에 `t.status <> 'hidden'` 또는 별도 정책 조건이 필요하다.
