# Supabase Migration Checklist

## 원칙

- 운영 Supabase DB에는 바로 migration을 실행하지 않는다.
- 먼저 빈 Supabase 테스트 DB 또는 로컬 테스트 DB에서 검증한다.
- 기존 운영성 데이터가 있는 DB에서는 legacy 보정 SQL 실행 여부를 먼저 판단한다.

## 실행 순서

### 신규 빈 DB

1. `database/auth.sql`
2. `database/calendar_notice_schema.sql`
3. `database/finalize_assignment_types_and_writing.sql`
4. `database/vocabulary_assignments.sql`
5. `database/performance_indexes.sql`
6. 필요한 경우 `npm run seed:auth`

### 기존 로컬/테스트 DB

1. `database/legacy-backfill.sql`
2. `database/finalize_assignment_types_and_writing.sql`
3. `database/calendar_notice_schema.sql`
4. `database/vocabulary_assignments.sql`
5. `database/performance_indexes.sql`
6. 충분히 검증 후에만 `database/drop-legacy.sql`

## legacy SQL 조건

### `legacy-backfill.sql`

기존 DB에 아래 흔적이 있을 때만 실행한다.

- `students.student_code`
- legacy assignment type
- 과거 `assignment_templates`

### `drop-legacy.sql`

아래 조건을 확인한 뒤 실행한다.

- 학생 로그인은 `student_login_id`로 정상 동작
- `student_code` 참조가 신규 코드에 없음
- legacy 데이터를 모두 보정함

## 숙제 유형 정책

최종 운영 유형:

- `listening_recording`
- `listening`
- `writing`
- `vocabulary_example`
- `vocabulary_recording`

최종 item type:

- `listening_recording`
- `listening`
- `writing_prompt`
- `vocabulary_example`
- `vocabulary_recording`

legacy 유형은 모두 `listening_recording`으로 매핑한다.

## Storage bucket

Supabase Storage bucket 이름:

- `homework-image`
- `homework-audio`

환경변수:

```env
NEXT_PUBLIC_SUPABASE_IMAGE_BUCKET="homework-image"
NEXT_PUBLIC_SUPABASE_AUDIO_BUCKET="homework-audio"
SUPABASE_SERVICE_ROLE_KEY="..."
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 코드에서만 사용한다.
- Client Component에서 `supabase.from()` 직접 호출 금지.
- Client Component에서 `storage.upload()` 직접 호출 금지.
- DB source of truth는 가능하면 `*_storage_path`로 둔다.
- API 응답에서 signed URL을 생성한다.

## AI 첨삭 환경변수

```env
OPENAI_API_KEY="sk-..."
OPENAI_WRITING_MODEL="gpt-4.1-mini"
```

검증:

```bash
node scripts/check-openai.mjs
```

## seed 주의사항

- `npm run seed:auth`는 개발/demo 데이터를 포함할 수 있다.
- production에서는 `ALLOW_DEMO_SEED=true`가 없으면 demo seed를 건너뛰도록 유지한다.
- 운영 DB에는 seed 실행 전 insert/update/delete 범위를 반드시 확인한다.

## 운영 전 차단 조건

- teacher API가 아직 mock `teacher-1` 세션에 의존하면 운영 배포 금지.
- `requireTeacherSession()`을 실제 강사 세션으로 전환해야 한다.
- 학생 API가 student session 기준으로만 필터링되는지 확인한다.

## 검증 명령

```bash
npm run build
node --check scripts/apply-writing-assignment-type.mjs
node --check scripts/seed-auth.mjs
node --check scripts/check-openai.mjs
```

검색 검증:

```bash
rg "image_speaking|sentence_shadowing|free_speaking|vocabulary|quiz|general" src database scripts
rg "teacher-1" src
rg "student_code" src database scripts
rg "supabase\\.from|storage\\.upload|SUPABASE_SERVICE_ROLE_KEY" src
```
## 2차 안정화 반영 사항

- 운영 Supabase DB에는 직접 migration을 실행하지 말고, 빈 Supabase 테스트 DB 또는 로컬 테스트 DB에서 먼저 검증한다.
- `database/auth.sql` 실행 후 공지/캘린더/시험 확장 테이블이 필요하면 `database/calendar_notice_schema.sql`을 실행한다.
- demo 공지/캘린더/시험 데이터는 schema migration 이후, 강사/반/학생 데이터가 존재할 때만 `npm run seed:calendar-demo -- --teacher-id teacher-1`로 실행한다.
- Writing 타입 및 최종 숙제 타입 제약은 `database/finalize_assignment_types_and_writing.sql`로 검증한다.
- 성능 인덱스는 `database/performance_indexes.sql`을 마지막에 실행한다.
- 기존 DB에서만 `database/legacy-backfill.sql`과 `database/drop-legacy.sql`을 사용한다. 신규 Supabase DB에는 legacy 보정 SQL을 실행하지 않는다.
- 운영 배포 전 `teacher-1` mock은 실제 `requireTeacherSession()` 구현으로 교체해야 한다.
- `seed-auth`는 운영 데이터를 덮어쓰지 않는지 확인하고, 데모 seed는 운영에서 `ALLOW_DEMO_SEED=true` 없이 실행하지 않는다.
- Storage bucket 이름은 `homework-image`, `homework-audio`로 맞춘다.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 유틸과 서버 Route Handler에서만 사용한다.
- Client Component에서 `supabase.from()` 또는 `storage.upload()`를 직접 호출하지 않는지 검색한다.
- 오디오/이미지는 가능한 `*_storage_path`를 source of truth로 두고 API에서 signed URL을 내려준다.
- legacy assignment type은 신규 UI에 노출하지 않고, 런타임에서는 `listening_recording`으로 정규화한다.
- legacy assignment type은 신규 생성 API에서도 허용하지 않는다. 기존 DB에 남은 legacy 값은 migration/backfill 단계에서 `listening_recording`으로 보정한다.
- 신규 schema의 CHECK constraint는 `assignments.assignment_type in ('listening_recording', 'listening', 'writing', 'vocabulary_example', 'vocabulary_recording')`, `assignment_items.item_type in ('listening_recording', 'listening', 'writing_prompt', 'vocabulary_example', 'vocabulary_recording')`만 허용한다.
- 단어장 숙제 확장은 `database/vocabulary_assignments.sql`로 검증한다.
- `assignment_vocabulary_items`, `submission_vocabulary_items` 테이블 생성 여부를 확인한다.
- 학생/강사 주요 화면에서 깨진 한글 문구가 없는지 수동 점검한다.
- 학생 홈, 강사 대시보드, 숙제 목록은 대량 데이터에서 쿼리 범위와 signed URL 생성 비용을 점검한다.

권장 실행 순서:

```bash
psql "$DATABASE_URL" -f database/auth.sql
psql "$DATABASE_URL" -f database/calendar_notice_schema.sql
psql "$DATABASE_URL" -f database/finalize_assignment_types_and_writing.sql
psql "$DATABASE_URL" -f database/vocabulary_assignments.sql
psql "$DATABASE_URL" -f database/performance_indexes.sql
npm run seed:auth
npm run seed:calendar-demo -- --teacher-id teacher-1
npm run build
```
