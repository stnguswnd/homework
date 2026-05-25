# Supabase Migration Cleanup Report

점검일: 2026-05-25

## 발견한 문제

- 신규 Supabase DB용 `database/auth.sql`에 legacy patch가 섞여 있었습니다.
- `students.student_code` 컬럼, unique index, view alias, seed insert/update가 남아 있었습니다.
- `assignment_templates` 이전 로직과 `drop table`이 신규 schema에 섞여 있었습니다.
- `student_list_view`가 legacy alias를 노출했습니다.
- `updated_at` 컬럼은 많지만 자동 갱신 trigger가 없었습니다.
- signup 관련 legacy UI/action에 “학생 코드” 표현과 `studentCode` field name이 남아 있었습니다.

## student_code 제거 내역

신규 schema/API/UI/seed/type 기준으로 `student_code`, `studentCode`, “학생 코드”를 제거했습니다.

제거/변경:

- `students.student_code` 신규 schema 제거
- `students_teacher_student_code_unique` 신규 schema 제거
- `student_list_view`의 legacy alias 제거
- 학생 생성 API의 `student_code` insert 제거
- 학생 수정 API의 `student_code` update 제거
- seed의 `student_code` insert/update 제거
- signup form/action의 `studentCode` field를 `studentLoginId`로 변경
- UI 문구 “학생 코드”를 “학생 로그인 ID”로 변경

검증:

- 신규 코드/schema 검색 대상에서 `student_code`, `studentCode`, “학생 코드” 미검출
- 로컬 DB `students` 테이블에서 `%code%` 컬럼 0개 확인
- `student_list_view` 컬럼에 `student_login_id`만 존재 확인

## 수정한 DB 구조

`database/auth.sql`을 신규 Supabase DB용 최종 통합 schema로 재작성했습니다.

현재 `students` 핵심 구조:

- `id`
- `app_user_id`
- `teacher_id`
- `student_login_id`
- `password_hash`
- `name`
- `school_name`
- `grade`
- `avatar_key`
- `memo`
- `parent_id`
- `status`
- `created_at`
- `updated_at`
- `unique (teacher_id, student_login_id)`

추가:

- `set_updated_at()` function
- updated_at trigger 11개
- `student_learning_history_view`는 `assignment_targets` 기준 유지
- `assignment_templates`는 신규 schema에서 제외

## 생성/수정한 SQL 파일

- `database/auth.sql`
  - Supabase SQL Editor에 한 번에 붙여넣을 최종 통합본
  - legacy backfill/drop 없음

- `database/schema.sql`
  - 관리용 분리 schema

- `database/indexes.sql`
  - 관리용 분리 index

- `database/views.sql`
  - 관리용 분리 view

- `database/legacy-backfill.sql`
  - 기존 로컬/legacy DB 전환용
  - legacy login column backfill
  - `assignment_templates` 이전
  - `assignment_targets.class_id`, `submissions.assignment_target_id` 보정

- `database/drop-legacy.sql`
  - 기존 로컬/legacy DB 정리용
  - legacy student login column drop
  - legacy student index drop
  - `assignment_templates` drop

- `database/auth.legacy.sql`
  - 기존 누적 patch형 schema 보존본

## 수정한 코드 파일

- `src/app/api/teacher/students/route.ts`
- `src/app/api/teacher/students/[studentId]/route.ts`
- `scripts/seed-auth.mjs`
- `src/lib/auth/actions.ts`
- `src/app/signup/SignupForm.tsx`
- `DB_ERD_AND_MIGRATION_GUIDE.md`

이전 precheck에서 수정했던 관련 파일:

- `src/lib/supabase/storage.ts`
- `src/app/api/student/assignments/route.ts`
- `src/app/api/student/submissions/recording/route.ts`
- `src/app/api/teacher/assignments/[assignmentId]/submissions/route.ts`
- `src/app/api/teacher/students/[studentId]/history/route.ts`
- `src/features/assignments/repositories/studentAssignmentRepository.ts`

## 제거한 legacy 코드

신규 schema에서 제거:

- `student_code`
- `students_teacher_student_code_unique`
- `student_list_view.student_code`
- `assignment_templates` migration block
- `drop table if exists assignment_templates`
- 누적 `alter table ... add column if not exists ...` 형태의 legacy patch

legacy 전용 파일에만 남김:

- `database/legacy-backfill.sql`
- `database/drop-legacy.sql`
- `database/auth.legacy.sql`

## 아직 남은 리스크

- teacher API는 여전히 `src/server/teacher/mockTeacher.ts`의 `mockTeacherId = "teacher-1"`를 사용합니다.
- teacher API 쿼리는 `teacher_id = mockTeacherId`로 필터링되지만, 운영 전에는 `requireTeacherSession()` 전환이 필요합니다.
- `app_users.role = 'parent'`, `app_users.linked_student_id`, `students.parent_id`는 signup/session 코드에서 아직 사용 중이라 유지했습니다. 부모 기능을 MVP에서 제외할지 별도 결정이 필요합니다.
- `assignment_targets`와 `submissions`는 여전히 `unique (assignment_id, student_id)` 정책입니다. 같은 학생에게 같은 과제 source를 반별로 중복 배정하는 구조는 지원하지 않습니다.
- `npm run lint`는 `next lint`가 `C:\Users\user\Desktop\homework\lint`를 project directory로 해석하여 실패합니다. 현재 Next.js 16 환경에 맞게 lint script를 별도로 정리해야 합니다.

## Supabase migration 실행 전 체크리스트

- Supabase SQL Editor에는 `database/auth.sql`만 사용
- 신규 Supabase DB에는 `legacy-backfill.sql`, `drop-legacy.sql` 실행하지 않음
- 기존 로컬/테스트 DB 전환 시에만 `legacy-backfill.sql` 후 `drop-legacy.sql` 실행
- 운영 seed 실행 시 `NODE_ENV=production` 설정
- demo seed가 필요할 때만 `ALLOW_DEMO_SEED=true`
- 운영 전 teacher session 전환 계획 확정

## 실행해야 할 명령어

로컬/테스트 DB legacy 전환 검증:

```bash
psql "$DATABASE_URL" -f database/legacy-backfill.sql
psql "$DATABASE_URL" -f database/drop-legacy.sql
psql "$DATABASE_URL" -f database/auth.sql
```

관리용 분리 파일 검증:

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/indexes.sql
psql "$DATABASE_URL" -f database/views.sql
```

앱 검증:

```bash
node --check scripts/seed-auth.mjs
npm run seed:auth
npm run build
```

Supabase 신규 DB 적용:

```text
database/auth.sql 내용을 Supabase SQL Editor에 붙여넣고 실행
```

## 검증 결과

- `database/legacy-backfill.sql`: 로컬 DB 실행 성공
- `database/drop-legacy.sql`: 로컬 DB 실행 성공
- `database/auth.sql`: 로컬 DB 실행 성공
- `database/schema.sql`: 로컬 DB 실행 성공
- `database/indexes.sql`: 로컬 DB 실행 성공
- `database/views.sql`: 로컬 DB 실행 성공
- `node --check scripts/seed-auth.mjs`: 통과
- `npm run seed:auth`: 통과
- `npm run build`: 통과
- `npm run lint`: 실패
  - 실패 원인: `next lint` CLI 호환 문제
  - 코드/타입 오류로 인한 실패는 아님

API smoke test:

- teacher login 정상
- student login 정상
- inactive student login 401 정상
- student assignments 정상, 원본 MP3 URL 포함
- teacher student create/update/inactive 정상
- teacher assignments list/detail 정상
- class detail 정상
- submission detail 정상
- review patch 정상
- dashboard 정상

## 다음에 결정해야 할 사항

- teacher auth를 `mockTeacherId`에서 `requireTeacherSession()`으로 전환할 시점
- parent role, linked student account, `students.parent_id`를 MVP에 유지할지 제거할지
- 같은 학생이 같은 과제 source를 여러 반에서 중복 배정받는 정책을 지원할지
- Next.js 16 기준 lint script 교체
