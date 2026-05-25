# Supabase RDB Migration Runbook

작성일: 2026-05-26

이 문서는 현재 로컬 PostgreSQL 기반 Homework Studio DB 구조를 Supabase PostgreSQL(RDB)로 옮기기 위한 실행 가이드입니다.

목표는 다음과 같습니다.

- 현재 로컬 PostgreSQL schema를 Supabase PostgreSQL에 최대한 동일하게 반영
- Supabase Storage bucket은 기존 프로젝트 이름 유지
- Supabase Auth는 아직 사용하지 않음
- 강사/학생 로그인은 현재 자체 로그인 + httpOnly cookie 구조 유지
- seed data는 가능하면 넣되, 필수는 아님
- 운영 DB에는 바로 적용하지 않고, 빈 Supabase 테스트 프로젝트에서 먼저 검증

## 1. 현재 아키텍처 기준

| 영역 | 현재 구조 | Supabase 전환 후 |
|---|---|---|
| App | Next.js App Router | 동일 |
| DB | 로컬 PostgreSQL | Supabase PostgreSQL |
| File Storage | Supabase Storage | 동일 |
| Auth | 자체 로그인 + cookie session | 동일, Supabase Auth 미사용 |
| Teacher session | mock `teacher-1` | 운영 전 실제 teacher session 전환 필요 |
| Student session | 자체 student session cookie | 동일 |
| DB 접근 | Route Handler / server repository | 동일 |
| Client Supabase SDK | 사용 금지 | 계속 금지 |

중요 원칙:

- Client Component에서 `supabase.from(...)` 호출 금지
- Client Component에서 `supabase.storage.upload(...)` 호출 금지
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 코드에서만 사용
- DB에는 파일 바이너리를 저장하지 않음
- DB에는 `*_storage_path`, file name, mime type, size, duration 같은 metadata만 저장
- 학생 API는 student session 기준 필터링
- 강사 API는 teacher session 또는 현재 mock `teacher-1` 기준 필터링

## 2. Supabase에 만들 리소스

### 2.1 Supabase project

Supabase dashboard에서 새 프로젝트를 만듭니다.

권장:

- 먼저 운영 프로젝트가 아니라 빈 테스트 프로젝트를 만듭니다.
- 테스트 프로젝트에서 schema, seed, API smoke test를 통과한 뒤 운영 프로젝트로 옮깁니다.

### 2.2 Storage buckets

현재 코드 기준 bucket 이름:

```text
homework-image
homework-audio
```

용도:

| Bucket | 용도 |
|---|---|
| `homework-image` | 과제 이미지, 공지 이미지 |
| `homework-audio` | 과제 원본 음원, 발음 가이드 음원, 학생 녹음 |

권장 설정:

- private bucket 권장
- API Route에서 signed URL 생성
- 개발 중 public bucket을 사용하더라도 DB source of truth는 `*_storage_path`

Storage path 정책:

```text
assignments/{assignmentId}/images/{fileName}
assignments/{assignmentId}/audio/{fileName}
submissions/{submissionId}/{assignmentItemId}/{fileName}
notices/{noticeId}/{fileName}
```

단어장 녹음 숙제:

```text
submissions/{submissionId}/{assignmentItemId}/{fileName}
```

단어장 녹음은 단어별 녹음이 아니라 학생 녹음 파일 1개만 저장합니다.

## 3. 환경변수

Supabase 테스트 프로젝트 기준 `.env.local` 또는 배포 환경에 아래 값을 설정합니다.

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="[service-role-key]"
NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET="homework-image"
NEXT_PUBLIC_SUPABASE_AUDIO_BUCKET="homework-audio"
OPENAI_API_KEY="[openai-api-key]"
OPENAI_WRITING_MODEL="gpt-4.1-mini"
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 `NEXT_PUBLIC_` prefix를 붙이면 안 됩니다.
- `OPENAI_API_KEY`도 client에 노출되면 안 됩니다.
- Next.js 서버 재시작 후 env가 반영됩니다.

## 4. 현재 DB schema 구성

현재 핵심 통합 schema:

```text
database/auth.sql
```

보강 migration:

```text
database/calendar_notice_schema.sql
database/finalize_assignment_types_and_writing.sql
database/vocabulary_assignments.sql
database/performance_indexes.sql
```

기존 DB 보정용 legacy SQL:

```text
database/legacy-backfill.sql
database/drop-legacy.sql
```

신규 Supabase 빈 DB에는 legacy SQL을 기본 실행하지 않습니다.

## 5. 테이블 그룹

### 5.1 Auth / account

```text
app_users
auth_sessions
teachers
students
```

현재 학생 로그인은 `students.student_login_id + password_hash` 기준입니다.

`student_code`는 신규 schema에서 사용하지 않습니다.

### 5.2 Class / membership

```text
classes
class_memberships
class_schedule_days
```

학생과 반은 N:M 관계입니다.

학생 생성/수정 시 반 텍스트를 직접 저장하지 않고, `class_memberships`에 저장합니다.

### 5.3 Calendar / notice / test

```text
class_calendar_events
notices
notice_targets
tests
test_results
```

역할:

- `class_schedule_days`: 수업일, 수업 시간, 진도 기록
- `class_calendar_events`: 시험, 휴강, 보강, 기타 캘린더 이벤트
- `notices`: 공지 본문
- `notice_targets`: 전체/반/학생 공지 대상
- `tests`: 시험 정의
- `test_results`: 학생별 시험 결과

### 5.4 Assignment

```text
assignments
assignment_items
assignment_targets
assignment_vocabulary_items
```

운영 assignment type:

```text
listening_recording
listening
writing
vocabulary_example
vocabulary_recording
```

운영 item type:

```text
listening_recording
listening
writing_prompt
vocabulary_example
vocabulary_recording
```

과목 subject:

```text
Phonics
AL
AR
SL
RBJ
SG
ST
SR
JT
Boost
BRT
BLT
```

단어장 숙제:

- 단어 목록은 `assignment_vocabulary_items`
- 단어장 재사용 테이블은 없음
- `vocabulary_recording`은 기존 녹음 제출 구조 재사용

### 5.5 Submission / review

```text
submissions
submission_items
submission_vocabulary_items
teacher_feedback
```

역할:

- `submissions`: 학생 제출 단위
- `submission_items`: 녹음, writing 답안, AI 첨삭 metadata
- `submission_vocabulary_items`: 단어장 예문 단어별 답안/AI 첨삭/다시 쓴 글
- `teacher_feedback`: 강사 피드백 보조 테이블

## 6. 신규 Supabase 빈 DB 적용 순서

가장 단순한 방식:

1. Supabase SQL Editor 열기
2. `database/auth.sql` 전체 실행
3. 누락 확장 migration 확인
4. 필요 시 보강 migration 실행
5. seed 선택 실행

권장 순서:

```text
1. database/auth.sql
2. database/calendar_notice_schema.sql
3. database/finalize_assignment_types_and_writing.sql
4. database/vocabulary_assignments.sql
5. database/performance_indexes.sql
```

단, `database/auth.sql`에 이미 최신 테이블과 constraint가 포함되어 있으므로, 2~5번은 아래 목적으로만 실행합니다.

- 오래된 테스트 DB 보강
- auth.sql과 분리 migration 간 정합성 검증
- 운영 전 idempotent migration 검증

대부분 `create table if not exists`, `alter table ... add column if not exists`, `drop constraint if exists` 기반이므로 재실행 가능하게 작성되어 있습니다.

## 7. 로컬에서 Supabase DB에 적용하는 방법

`psql`이 PATH에 있는 환경:

```powershell
psql "$env:DATABASE_URL" -f database/auth.sql
psql "$env:DATABASE_URL" -f database/calendar_notice_schema.sql
psql "$env:DATABASE_URL" -f database/finalize_assignment_types_and_writing.sql
psql "$env:DATABASE_URL" -f database/vocabulary_assignments.sql
psql "$env:DATABASE_URL" -f database/performance_indexes.sql
```

현재 Windows 환경처럼 `psql`이 PATH에 없으면 프로젝트의 Node 적용 스크립트를 사용합니다.

현재 존재하는 적용 스크립트:

```text
scripts/apply-calendar-notice-test.mjs
scripts/apply-writing-assignment-type.mjs
scripts/apply-listening-assignment-type.mjs
scripts/apply-vocabulary-assignments.mjs
```

단어장 migration 적용:

```bash
node scripts/apply-vocabulary-assignments.mjs
```

`database/auth.sql` 전체를 Node로 적용하는 별도 스크립트는 아직 없으므로, Supabase SQL Editor 또는 `psql` 사용을 권장합니다.

## 8. Seed 적용 정책

현재 seed:

```bash
npm run seed:auth
```

현재 seed는 다음을 포함합니다.

- 개발용 teacher/student/parent 계정
- 기본 반
- 기본 학생
- class_memberships
- 숙제 demo data
- assignment_targets
- submissions/submission_items demo data
- notice/calendar/test demo data 일부
- 단어장 예문/녹음 demo data

주의:

- 운영 DB에 그대로 실행하면 demo data가 들어갑니다.
- 이미 운영 제출/리뷰 데이터가 있는 DB에서는 실행하지 않습니다.
- 운영 seed와 demo seed를 분리하는 것이 안전합니다.

권장 seed 분리:

```text
scripts/seed-auth.mjs              # 개발 통합 seed
scripts/seed-base-teacher.mjs      # 운영 초기 teacher/app user만
scripts/seed-base-classes.mjs      # 운영 기본 반만
scripts/seed-demo-data.mjs         # demo assignments/submissions only
```

현재 운영 전까지는 Supabase 테스트 DB에서만 `npm run seed:auth`를 실행합니다.

## 9. Supabase SQL Editor 방식

SQL Editor에 붙여넣을 때 권장 순서:

1. `database/auth.sql` 내용을 전체 복사
2. SQL Editor에서 실행
3. 오류가 없으면 Table Editor에서 핵심 테이블 확인
4. 필요하면 `database/calendar_notice_schema.sql` 실행
5. 필요하면 `database/vocabulary_assignments.sql` 실행

확인할 핵심 테이블:

```text
teachers
students
classes
class_memberships
assignments
assignment_items
assignment_targets
assignment_vocabulary_items
submissions
submission_items
submission_vocabulary_items
notices
notice_targets
class_calendar_events
tests
test_results
```

## 10. Migration 후 필수 확인 쿼리

Supabase SQL Editor에서 실행합니다.

### 10.1 assignment type 확인

```sql
select assignment_type, count(*)
from assignments
group by assignment_type
order by assignment_type;
```

정상 운영 type:

```text
listening_recording
listening
writing
vocabulary_example
vocabulary_recording
```

### 10.2 legacy assignment type 확인

```sql
select id, title, assignment_type
from assignments
where assignment_type in (
  'image_speaking',
  'sentence_shadowing',
  'free_speaking',
  'quiz',
  'vocabulary',
  'general'
);
```

신규 Supabase DB에서는 0건이어야 합니다.

### 10.3 student_code 제거 확인

```sql
select column_name
from information_schema.columns
where table_name = 'students'
  and column_name = 'student_code';
```

신규 Supabase DB에서는 0건이어야 합니다.

### 10.4 단어장 테이블 확인

```sql
select count(*) from assignment_vocabulary_items;
select count(*) from submission_vocabulary_items;
```

seed를 넣지 않은 빈 DB면 0이어도 정상입니다.

### 10.5 notice/test/calendar 테이블 확인

```sql
select count(*) from notices;
select count(*) from notice_targets;
select count(*) from class_calendar_events;
select count(*) from tests;
select count(*) from test_results;
```

## 11. App 연결 확인

Supabase DB로 `.env.local`의 `DATABASE_URL`을 바꾼 뒤:

```bash
npm run build
npm run dev
```

확인할 API:

```text
GET /api/health/db
GET /api/teacher/classes
GET /api/teacher/assignments
GET /api/student/assignments
```

학생 API는 student session cookie가 필요합니다.

강사 API는 현재 mock teacher session이므로 `teacher-1` 데이터가 있어야 화면이 보입니다.

## 12. Smoke test 시나리오

### 12.1 Auth

- teacher login
- student login
- inactive student login 차단

### 12.2 Teacher

- 반 목록 조회
- 학생 생성
- 학생 수정
- 숙제 생성
- 숙제 수정
- 숙제 배정
- 배정 관리
- 제출 현황 조회
- 제출 상세 조회
- 승인/반려/피드백 저장

### 12.3 Student

- 학생 홈 조회
- 내 숙제 목록 조회
- RL 녹음 숙제 수행
- 리스닝 숙제 완료
- 라이팅 AI 첨삭 및 제출
- 단어장 예문 AI 첨삭 및 제출
- 단어장 녹음 제출

### 12.4 Storage

- 과제 이미지 업로드
- 과제 음원 업로드
- 학생 녹음 업로드
- signed URL 재생
- 다운로드 버튼 숨김(`controlsList="nodownload"`) 확인

## 13. 운영 전 반드시 해결할 리스크

### 13.1 teacher-1 mock

현재 teacher API는 `requireTeacherSession()`을 통해 mock `teacher-1`을 사용합니다.

운영 전 필수:

- 강사 로그인 세션 구현
- `requireTeacherSession()`이 cookie/session에서 teacherId를 읽도록 변경
- teacherId 없으면 401 반환
- 모든 teacher API가 `teacher_id = session.teacherId` 기준으로 조회/수정

운영 Supabase DB에 여러 강사 데이터를 넣기 전에는 반드시 해결해야 합니다.

### 13.2 Seed 재실행 위험

`npm run seed:auth`는 demo assignments, targets, submissions를 upsert합니다.

운영 DB에서는 실행하지 않는 것이 안전합니다.

### 13.3 RLS

현재 서버 Route Handler가 service role 또는 PostgreSQL connection으로 DB를 접근하는 구조입니다.

따라서 Supabase RLS를 바로 켜면 서버 쿼리가 막힐 수 있습니다.

현재 운영 방식:

- RLS off 또는 서버 전용 DB connection 사용
- 접근 제어는 API Route에서 session 기반으로 수행

미래에 브라우저 Supabase client를 도입한다면:

- RLS 필수
- students는 자기 row만
- assignment_targets는 자기 target만
- submissions는 자기 submission만
- teacher는 자기 `teacher_id` 데이터만
- Storage object path policy 필요

### 13.4 Storage 권한

private bucket + signed URL 권장입니다.

주의:

- public URL을 DB source of truth로 삼지 않기
- `recording_url`, `audio_url`, `image_url`은 cache/fallback 성격
- 실제 기준은 `recording_storage_path`, `audio_storage_path`, `image_storage_path`

### 13.5 OpenAI API 비용

Writing / 단어장 예문 AI 첨삭 API가 있습니다.

운영 전 권장:

- 학생별 rate limit
- 과제별 AI 첨삭 횟수 제한
- 너무 긴 입력 차단
- API 실패 fallback 유지

## 14. Supabase migration 권장 최종 순서

테스트 DB:

```text
1. Supabase 테스트 프로젝트 생성
2. Storage bucket 생성: homework-image, homework-audio
3. env를 테스트 프로젝트 값으로 변경
4. database/auth.sql 실행
5. 필요 시 보강 SQL 실행
   - database/calendar_notice_schema.sql
   - database/finalize_assignment_types_and_writing.sql
   - database/vocabulary_assignments.sql
   - database/performance_indexes.sql
6. 선택: npm run seed:auth
7. npm run build
8. npm run dev
9. 주요 API smoke test
10. 학생/강사 화면 수동 테스트
```

운영 DB:

```text
1. 테스트 DB 검증 결과 확인
2. teacher session 전환 완료 여부 확인
3. demo seed 미실행 확인
4. Storage bucket 생성
5. database/auth.sql 실행
6. 운영 seed가 있다면 최소 데이터만 삽입
7. 주요 API smoke test
8. Storage upload/signed URL 확인
```

## 15. 현재 Supabase에 넣어도 되는 SQL 기준

신규 빈 Supabase DB:

```text
database/auth.sql
```

보강 또는 오래된 DB:

```text
database/calendar_notice_schema.sql
database/finalize_assignment_types_and_writing.sql
database/vocabulary_assignments.sql
database/performance_indexes.sql
```

기존 로컬/테스트 DB 전환용:

```text
database/legacy-backfill.sql
database/drop-legacy.sql
```

신규 Supabase DB에는 legacy SQL을 실행하지 않습니다.

## 16. 완료 기준

Supabase RDB 전환이 완료되었다고 보려면 아래가 모두 충족되어야 합니다.

- Supabase DB에 핵심 테이블이 생성됨
- `student_code`가 신규 DB에 없음
- 운영 assignment type 5개가 constraint에 포함됨
- legacy assignment type이 신규 UI/DB seed에 없음
- `assignment_vocabulary_items`, `submission_vocabulary_items` 생성됨
- Storage bucket 2개 생성됨
- `GET /api/health/db` 성공
- teacher login / student login 성공
- 학생 숙제 조회 성공
- 녹음 업로드 성공
- 단어장 예문 제출 성공
- 강사 제출 상세 조회 성공
- `npm run build` 통과

## 17. 추천 다음 작업

1. `database/auth.sql`을 Supabase migration 단위 파일로 분리
2. 운영 seed와 demo seed 분리
3. teacher session mock 제거
4. Supabase 테스트 DB에서 full reset -> schema -> seed -> smoke test 자동화
5. Storage signed URL 만료 시간 정책 확정
6. AI 첨삭 rate limit 강화
