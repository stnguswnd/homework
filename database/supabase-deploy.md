# Vercel + Supabase Deploy Guide

작성일: 2026-05-26

이 문서는 Homework Studio를 Vercel + Supabase로 배포할 때 필요한 설정과 검증 순서를 정리합니다.

## 1. 배포 구조

| 역할 | 서비스 |
|---|---|
| Next.js 앱 실행 | Vercel |
| PostgreSQL DB | Supabase PostgreSQL |
| 파일 저장 | Supabase Storage |
| 강사/학생/학부모 로그인 | 자체 DB 테이블 + httpOnly cookie |
| Supabase Auth | 아직 사용하지 않음 |

중요:

- 강사 공개 회원가입은 만들지 않습니다.
- 강사 계정은 개발자가 로컬 터미널에서 `create:teacher` 스크립트로 발급합니다.
- 학생 계정은 강사가 앱에서 생성해서 학생에게 나눠줍니다.
- 학부모 계정은 추후 강사가 앱에서 생성하고 특정 학생과 연결하는 구조로 확장합니다.

## 2. Supabase 준비

### 2.1 Supabase 프로젝트 생성

Supabase dashboard에서 새 프로젝트를 생성합니다.

권장:

- 먼저 테스트 프로젝트에서 검증
- 운영 프로젝트에는 검증된 SQL만 적용

### 2.2 Storage bucket 생성

아래 bucket을 만듭니다.

```text
homework-image
homework-audio
```

권장:

- private bucket
- API Route에서 signed URL 생성
- DB에는 public URL보다 `*_storage_path` 저장

## 3. Supabase SQL 적용

신규 Supabase DB 기준 권장 순서:

```text
1. database/auth.sql
2. database/calendar_notice_schema.sql
3. database/finalize_assignment_types_and_writing.sql
4. database/vocabulary_assignments.sql
5. database/performance_indexes.sql
```

Supabase SQL Editor에서 파일 내용을 복사해 순서대로 실행합니다.

주의:

- 신규 Supabase DB에는 `legacy-backfill.sql`, `drop-legacy.sql`을 실행하지 않습니다.
- 기존 로컬/테스트 DB를 보정할 때만 legacy SQL을 사용합니다.

## 4. 로컬 환경변수 설정

로컬 `.env.local`이 Supabase 테스트 DB를 바라보게 설정합니다.

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

- `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용합니다.
- `NEXT_PUBLIC_` prefix를 붙이면 안 됩니다.
- `create:teacher`는 `DATABASE_URL`만 사용합니다.

## 5. 강사 계정 생성

강사 계정은 Vercel에서 생성하지 않습니다.

개발자 로컬 터미널에서 실행합니다.

```bash
npm run create:teacher -- --username teacher --password TempPass123! --email teacher@example.com --name "원장님" --teacher-id teacher-1
```

전제:

- 로컬 `.env.local`의 `DATABASE_URL`이 Supabase DB를 바라보고 있어야 합니다.

생성되는 데이터:

```text
app_users
teachers
```

주의:

- 비밀번호 평문은 저장하지 않습니다.
- `password_hash`는 console에 출력하지 않습니다.
- 초기 비밀번호는 안전한 채널로 전달합니다.
- 강사는 로그인 후 `/teacher/settings/account`에서 비밀번호를 변경해야 합니다.

## 6. 로컬 테스트

```bash
npm run build
npm run dev
```

확인:

- `/api/health/db`
- `/api/health/storage`
- 강사 로그인
- `/teacher/settings/account`
- 강사 비밀번호 변경
- 반 생성
- 학생 생성
- 숙제 생성/배정
- 학생 로그인/제출
- 강사 제출 검토

## 7. Vercel 환경변수

Vercel Project Settings > Environment Variables에 아래를 등록합니다.

```text
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET
NEXT_PUBLIC_SUPABASE_AUDIO_BUCKET
OPENAI_API_KEY
OPENAI_WRITING_MODEL
```

권장:

- Production / Preview / Development 모두 필요한 값 확인
- `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트에 노출하지 않음

## 8. Vercel 배포

1. GitHub에 push
2. Vercel 프로젝트 연결
3. Environment Variables 확인
4. Deploy
5. 배포 URL에서 강사 로그인 테스트

## 9. 계정 정책

### 강사 계정

- 개발자/관리자가 `npm run create:teacher`로 발급
- 공개 회원가입 없음
- 로그인 후 계정 설정에서 비밀번호 변경

### 학생 계정

- 강사가 앱에서 생성
- `student_login_id + 초기 비밀번호` 발급
- 학생은 본인 숙제만 조회 가능

### 학부모 계정

- MVP에서는 별도 생성 UI 없음
- 추후 강사가 생성
- 특정 `student_id`와 연결
- 연결된 자녀 정보만 조회 가능

## 10. 운영 전 차단 조건

운영 전 반드시 확인합니다.

- `npm run build` 통과
- `node --check scripts/create-teacher.mjs` 통과
- `rg "teacher-1" src` 결과가 seed/demo/mock 예시 외 실제 API 로직에 없음
- `rg "mockTeacherId" src` 결과가 실제 API 로직에 없음
- `rg "password_hash" src` 결과가 API 응답에 노출되지 않음
- `rg "supabase\\.from|storage\\.upload|SUPABASE_SERVICE_ROLE_KEY" src` 결과에서 client component 노출 없음
- `/api/teacher/*`는 teacher session 없으면 401
- 모든 teacher API는 `teacher_id = session.teacherId` 기준
- 학생 API는 student session 기준

## 11. 전체 배포 순서 요약

```text
1. Supabase 프로젝트 생성
2. homework-image, homework-audio bucket 생성
3. Supabase SQL Editor에서 schema 실행
4. 로컬 .env.local을 Supabase DB로 연결
5. npm run create:teacher 실행
6. npm run build
7. npm run dev로 로컬 검증
8. Vercel env 등록
9. GitHub push
10. Vercel 배포
11. 배포 URL에서 강사 로그인/계정 설정/숙제 흐름 테스트
```
