# Supabase Migration Precheck Report

점검일: 2026-05-25

## 결론

Supabase migration은 아직 실행하지 않았습니다. 현재 로컬 PostgreSQL 기준으로 schema 재적용, Next.js build, 주요 API smoke test를 수행했고, migration 전에 깨질 가능성이 높은 불일치 지점은 수정했습니다.

## 수정한 문제

### 1. Storage bucket 기본값 불일치

문제:

- 실제 `.env`, `.env.local`은 `homework-image`, `homework-audio`
- 코드 기본값은 이미지 bucket을 `homework-images`로 사용
- env 누락 시 이미지 업로드/조회가 다른 bucket을 바라볼 수 있음

수정:

- `src/lib/supabase/storage.ts`
  - image 기본값을 `homework-image`로 변경
- `.env.example`
  - 현재 프로젝트 기준 env 추가

### 2. 학생 API의 teacher scope 강화

문제:

- 학생 과제 조회와 제출 검증이 `studentId` 중심으로 동작
- `students.id`가 PK라 실질 충돌 가능성은 낮지만, 요구사항은 student session의 `studentId`, `teacherId` 기준 필터링

수정:

- `src/app/api/student/assignments/route.ts`
- `src/app/api/student/submissions/recording/route.ts`
- `src/features/assignments/repositories/studentAssignmentRepository.ts`
- `src/app/student/home/page.tsx`
- `src/app/student/assignments/[assignmentId]/page.tsx`
- `src/app/student/assignments/[assignmentId]/complete/page.tsx`

변경:

- `assignments.teacher_id = session.teacherId` 조건 추가
- 서버 repository 호출부에 `teacherId` 전달

### 3. `student_learning_history_view` 기준 불일치

문제:

- 기존 view가 `assignments.class_id -> class_memberships` 기반
- 최신 구조는 `assignment_targets.student_id`, `assignment_targets.class_id`가 source of truth

수정:

- `database/auth.sql`
  - `student_learning_history_view`를 `assignment_targets` 기준으로 재작성

현재 기준:

- 학생 이력: `assignment_targets.student_id`
- 반 이름: `assignment_targets.class_id`
- 제출 상태: `submissions`
- 피드백/검토 상태: `teacher_feedback`, `submissions.status`, `assignment_targets.reviewed`

### 4. 강사 제출 목록의 반 기준과 recording URL

문제:

- `GET /api/teacher/assignments/:assignmentId/submissions`가 학생의 모든 class_memberships를 기준으로 classNames를 만들 수 있었음
- 녹음 URL은 public `recording_url`만 직접 사용

수정:

- `src/app/api/teacher/assignments/[assignmentId]/submissions/route.ts`
  - `assignment_targets.class_id` 기준 class name 반환
  - `submission_items.recording_storage_path` 기준 signed URL 생성
  - signed URL 실패 시 `recording_url` fallback

### 5. seed 재실행 위험

문제:

- `npm run seed:auth`가 schema/base data뿐 아니라 demo assignments, targets, submissions, recording metadata까지 upsert
- 이미 제출/리뷰가 있는 DB에서 실행하면 demo row가 덮일 수 있음

수정:

- `scripts/seed-auth.mjs`
  - production에서는 `ALLOW_DEMO_SEED=true`가 없으면 demo 과제/제출 seed를 건너뜀
  - demo seed 실행 시 warning 출력

남은 주의:

- development/default 환경에서는 기존처럼 demo seed가 실행됩니다.
- 운영 DB에서는 `NODE_ENV=production`으로 실행해야 guard가 동작합니다.

## Mock teacher ID 사용 위치

현재 teacher API는 아직 `src/server/teacher/mockTeacher.ts`의 `mockTeacherId = "teacher-1"`를 사용합니다. 한 곳에서 관리되고 있으며, 각 teacher API 쿼리는 `teacher_id = mockTeacherId` 조건을 포함합니다.

현재 mock teacher 사용 API:

- `src/app/api/teacher/assignments/route.ts`
- `src/app/api/teacher/assignments/[assignmentId]/submissions/route.ts`
- `src/app/api/teacher/classes/route.ts`
- `src/app/api/teacher/classes/overview/route.ts`
- `src/app/api/teacher/classes/[classId]/route.ts`
- `src/app/api/teacher/classes/[classId]/assignments/route.ts`
- `src/app/api/teacher/classes/[classId]/students/route.ts`
- `src/app/api/teacher/classes/[classId]/schedule/route.ts`
- `src/app/api/teacher/classes/[classId]/schedule/[scheduleDayId]/route.ts`
- `src/app/api/teacher/dashboard/route.ts`
- `src/app/api/teacher/students/route.ts`
- `src/app/api/teacher/students/[studentId]/route.ts`
- `src/app/api/teacher/students/[studentId]/history/route.ts`
- `src/app/api/teacher/submissions/[submissionId]/route.ts`
- `src/app/api/teacher/submissions/[submissionId]/review/route.ts`

Migration 전 리스크:

- Supabase에 여러 강사 데이터를 넣어도 teacher API는 전부 `teacher-1`만 조회/생성합니다.
- 운영 데이터 오염을 막으려면 Supabase 운영 전 `requireTeacherSession()`으로 전환해야 합니다.
- 현재 단계에서 mock을 유지한다면 Supabase에는 `teacher-1` 개발 데이터만 넣는 것을 권장합니다.

## Storage 점검

현재 설정:

- image bucket: `homework-image`
- audio bucket: `homework-audio`

확인 결과:

- `/api/health/storage`에서 두 bucket 모두 존재 확인
- Client Component에서 `supabase.from(...)` 또는 `storage.upload(...)` 직접 호출 없음
- `SUPABASE_SERVICE_ROLE_KEY`는 `src/lib/supabase/server.ts`에서만 사용
- 학생 과제 조회와 강사 제출 상세/목록은 storage path 기준 signed URL 생성
- 학생 녹음 제출은 `homework-audio/submissions/{submissionId}/{assignmentItemId}/{fileName}`에 업로드

## Unique 제약 점검

현재 유지 정책:

- 같은 학생에게 같은 assignment source는 한 번만 배정 가능
- 반별 중복 배정은 아직 지원하지 않음

현재 제약:

- `assignment_targets`: `unique (assignment_id, student_id)`
- `submissions`: `unique (assignment_id, student_id)`

코드 확인:

- 과제 재배정 API의 upsert conflict target은 `(assignment_id, student_id)`로 DB 제약과 일치
- 같은 학생이 여러 반에 있어도 같은 assignment source는 한 target row로 유지
- 재배정 시 `assignment_targets.class_id`가 마지막 배정 반으로 갱신될 수 있음

남은 리스크:

- 같은 학생이 여러 반에서 같은 과제 source를 각각 받아야 하는 정책으로 바뀌면 현재 제약과 충돌합니다.
- 이 경우 `assignment_targets`, `submissions` unique 정책을 함께 재설계해야 합니다.

## 검증 결과

실행한 검증:

```bash
npm run build
```

결과:

- 통과

```bash
psql "$DATABASE_URL" -f database/auth.sql
```

결과:

- 로컬 `localhost/homework` DB에서 끝까지 실행 성공

```bash
node --check scripts/seed-auth.mjs
```

결과:

- 통과

API smoke test:

- `GET /api/health/db`: 정상
- `GET /api/health/storage`: 정상, bucket 존재 확인
- `POST /api/auth/teacher-login`: 정상
- `POST /api/auth/student-login`: active 학생 정상
- `POST /api/auth/student-login`: inactive 학생 401 정상
- `GET /api/student/assignments`: student session 기준 정상, 원본 MP3 URL 포함
- `GET /api/teacher/classes`: 정상
- `GET /api/teacher/assignments`: 정상, `classSummaries` 포함
- `GET /api/teacher/classes/overview`: 정상
- `GET /api/teacher/classes/class-a/assignments`: 정상
- `GET /api/teacher/assignments/assignment-1/submissions`: 정상, recording signed URL 반환
- `GET /api/teacher/dashboard?weekStart=2026-05-25`: 정상

## 아직 남은 리스크

- teacher auth는 아직 `teacher-1` mock입니다.
- 일부 UI 파일에는 오래된 mock/static fallback과 깨진 한국어 문구가 남아 있습니다.
- `scripts/seed-auth.mjs`는 development/default에서는 demo data를 계속 upsert합니다. 운영 실행 시 반드시 `NODE_ENV=production`을 설정해야 합니다.
- Supabase SQL Editor에 넣기 전에는 가능하면 빈 테스트 DB에서 `database/auth.sql`을 한 번 더 실행하는 것이 좋습니다.
- 현재 DB에는 이전 테스트 과정에서 생성된 제출/피드백 데이터가 섞여 있을 수 있습니다.

## Supabase SQL Editor에 넣을 최종 SQL

```text
database/auth.sql
```

## Migration 전 권장 명령 순서

로컬 검증:

```bash
npm run build
psql "$DATABASE_URL" -f database/auth.sql
node --check scripts/seed-auth.mjs
```

운영/Supabase 적용 전:

```bash
NODE_ENV=production npm run build
```

Supabase SQL Editor:

```text
database/auth.sql 내용을 붙여넣고 실행
```

운영 seed가 필요할 때:

```bash
NODE_ENV=production npm run seed:auth
```

demo data까지 의도적으로 넣을 때만:

```bash
NODE_ENV=production ALLOW_DEMO_SEED=true npm run seed:auth
```

## Migration 후 테스트할 API

- `GET /api/health/db`
- `GET /api/health/storage`
- `POST /api/auth/teacher-login`
- `POST /api/auth/student-login`
- `GET /api/teacher/classes`
- `POST /api/teacher/classes`
- `GET /api/teacher/students`
- `POST /api/teacher/students`
- `PATCH /api/teacher/students/:studentId`
- `DELETE /api/teacher/students/:studentId`
- `GET /api/teacher/assignments`
- `GET /api/teacher/assignments?id=:assignmentId`
- `POST /api/teacher/assignments`
- `GET /api/teacher/classes/:classId`
- `GET /api/teacher/classes/:classId/assignments`
- `GET /api/teacher/classes/:classId/schedule`
- `GET /api/teacher/assignments/:assignmentId/submissions`
- `GET /api/teacher/submissions/:submissionId`
- `PATCH /api/teacher/submissions/:submissionId/review`
- `GET /api/teacher/dashboard?weekStart=YYYY-MM-DD`
- `GET /api/student/assignments`
- `POST /api/student/submissions/recording`
