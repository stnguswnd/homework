# Homework Studio 진행 보고서 및 최적화 TODO

작성일: 2026-05-25

## 1. 현재까지 완료된 핵심 작업

### 1.1 인증 / 계정 구조

- Supabase Auth는 사용하지 않고, 로컬 PostgreSQL 기반 인증 구조로 유지했다.
- 학생 로그인은 `student_login_id` 기준으로 통일했다.
- `student_code`는 신규 schema/API/UI 기준에서 제거하는 방향으로 정리했다.
- 학생 비밀번호는 `password_hash` 기준으로 저장한다.
- 학생 세션은 httpOnly cookie 기반으로 처리한다.
- 학생 API는 `student session`의 `studentId`, `teacherId` 기준으로 필터링한다.
- 강사 API는 아직 `teacher-1` mock teacher 기준이며, `src/server/teacher/mockTeacher.ts`에서 관리한다.

### 1.2 DB 구조 정리

주요 테이블:

- `teachers`
- `students`
- `classes`
- `class_memberships`
- `assignments`
- `assignment_items`
- `assignment_targets`
- `submissions`
- `submission_items`
- `teacher_feedback`
- `class_schedule_days`
- `class_calendar_events`
- `notices`
- `notice_targets`
- `tests`
- `test_results`

추가/정리된 SQL 파일:

- `database/auth.sql`
  - 신규 Supabase DB용 통합 schema 기준.
- `database/schema.sql`
  - 분리형 schema 기준.
- `database/finalize_assignment_types_and_writing.sql`
  - 라이팅 숙제 및 최종 숙제 타입 3개 기준 보정 SQL.
- `database/calendar_notice_test.sql`
  - 공지사항, 캘린더 이벤트, 테스트 관련 확장 SQL.
- `database/legacy-backfill.sql`
  - 기존 DB 보정용.
- `database/drop-legacy.sql`
  - legacy 제거용.

적용 완료:

- `scripts/apply-writing-assignment-type.mjs` 실행 완료.
- 기존 레거시 숙제 타입은 DB에서 `listening_recording`으로 매핑되도록 보정했다.

### 1.3 최종 운영 숙제 유형

현재 운영 숙제 유형은 3개로 정리했다.

| 화면 라벨 | DB `assignment_type` | DB `item_type` | 학생 컴포넌트 | 설명 |
|---|---|---|---|---|
| RL 녹음 | `listening_recording` | `listening_recording` | `RlRecordingHomework` | 원본 음원 듣기 후 녹음 제출 |
| 리스닝 | `listening` | `listening` | `ListeningHomework` | 원본 음원을 끝까지 들으면 완료 |
| 라이팅 | `writing` | `writing_prompt` | `WritingHomework` | 이미지/주제 기반 글쓰기, AI 첨삭, 제출 |

레거시 타입:

- `image_speaking`
- `sentence_shadowing`
- `free_speaking`
- `quiz`
- `vocabulary`
- `general`

처리 정책:

- 신규 생성 UI에는 노출하지 않는다.
- DB/API 런타임에서 들어오면 `listening_recording`으로 정규화한다.

### 1.4 라이팅 숙제

추가된 DB 컬럼:

`assignment_items`

- `writing_mode`
  - `picture_description`
  - `topic_diary`
- `writing_unit`
  - `paragraphs`
  - `sentences`
- `writing_unit_count`
  - 기본 `4`
- `prompt_text`

`submission_items`

- `answer_text`
- `ai_corrected_text`
- `ai_feedback`
- `ai_grammar_notes`
- `ai_expression_notes`
- `ai_feedback_raw`

추가 API:

- `POST /api/student/writing-feedback`
  - 서버에서 OpenAI API 호출.
  - `OPENAI_API_KEY`가 없으면 fallback 첨삭 반환.
- `POST /api/student/submissions/writing`
  - 학생 라이팅 답안과 AI 첨삭 결과 저장.

환경변수:

```env
OPENAI_API_KEY="sk-..."
OPENAI_WRITING_MODEL="gpt-4.1-mini"
```

검증:

- `scripts/check-openai.mjs` 추가.
- 실제 호출 결과:

```text
OPENAI_TEST_OK model=gpt-4.1-mini
```

### 1.5 강사 숙제 생성 / 수정

변경 내용:

- 숙제 생성 진입 시 유형 선택 모달 표시.
- 선택 가능한 유형은 3개만 표시:
  - RL 녹음
  - 리스닝
  - 라이팅
- 유형은 처음 생성할 때만 선택 가능하다.
- 생성 후 수정 화면에서는 숙제 유형을 변경할 수 없다.
- 숙제 생성/수정 화면에서 배정 설정은 제거했다.
- 반/학생 배정은 숙제 목록에서 체크 후 `숙제 배정하기`로 진행한다.

라이팅 생성:

- `그림 묘사`
- `주제/일기 쓰기`
- `4 paragraphs`
- `4 sentences`
- 주제/일기형은 `prompt_text`와 `passage_text`에 주제 텍스트를 저장해 fallback 표시가 가능하도록 했다.

### 1.6 강사 숙제 목록 / 배정

변경 내용:

- 숙제 목록 카드에 체크박스 추가.
- 여러 숙제를 선택할 수 있다.
- 우측 상단 `숙제 배정하기` 버튼 추가.
- 선택한 숙제를 모달에서 반/학생에게 일괄 배정할 수 있게 했다.
- 배정은 `assignment_targets` 기준으로 저장한다.
- `unique(assignment_id, student_id)` 정책을 유지한다.
- 같은 학생에게 같은 source assignment는 중복 배정하지 않는다.

### 1.7 학생 숙제 수행 화면

RL 녹음:

- 1단계 듣기
- 2단계 녹음
- 3단계 제출 확인 모달
- 원본 MP3를 끝까지 들어야 녹음 단계로 이동 가능.
- 녹음 후 미리듣기 가능.
- 제출 시 Supabase Storage에 녹음 파일 업로드.

리스닝:

- 1단계 듣기
- 2단계 완료 확인 모달
- 원본 MP3를 끝까지 들어야 완료 가능.
- 파일 업로드 없이 `submissions`, `assignment_targets` 상태 업데이트.

라이팅:

- 1단계 글 작성
- 2단계 AI 첨삭
- AI 결과 확인
- 다시 작성
- 최종 제출 확인 모달
- 제출 시 `answer_text`와 AI 첨삭 결과 저장.

### 1.8 강사 미리보기

라우트:

- `/teacher/assignments/:assignmentId/preview`

변경 내용:

- 실제 학생 화면에 가까운 미리보기 제공.
- RL 녹음 미리보기:
  - 원본 음원 듣기 가능.
  - 브라우저 녹음 가능.
  - 녹음 미리듣기 가능.
  - 제출은 실제 저장하지 않고 모달만 표시.
- 리스닝 미리보기:
  - 원본 음원 듣기 가능.
  - 완료는 실제 저장하지 않고 모달만 표시.
- 라이팅 미리보기:
  - 텍스트 입력 가능.
  - 입력값은 브라우저 `localStorage`에 저장되어 재진입 시 유지.
  - 미리보기용 AI 결과 표시.
  - 실제 제출 저장은 하지 않음.

### 1.9 공지 / 캘린더 / 테스트

추가 테이블:

- `notices`
- `notice_targets`
- `class_calendar_events`
- `tests`
- `test_results`

강사 대시보드:

- 전체 공지사항 CRUD 구조 추가.
- 전체 공지는 `notice_targets.target_type = 'all'`.

반 상세:

- 반 공지사항 CRUD 구조 추가.
- 반 공지는 `notice_targets.target_type = 'class'`.
- 수업 일정, 휴강, 보강, 시험, 기타 이벤트 구조를 `class_calendar_events`로 확장.
- 테스트 및 테스트 결과 입력 구조 추가.

학생 홈:

- 공지사항 캐러셀.
- 전체 공지 + 학생이 속한 반 공지 표시.
- 학생이 속한 반 정보 표시.
- 이번주 숙제 표시.
- 캘린더 이벤트 표시.
- 다가오는 시험과 시험 결과 표시.

## 2. 검증 결과

최근 통과한 명령:

```bash
npm run build
node --check scripts/apply-writing-assignment-type.mjs
node --check scripts/seed-auth.mjs
node scripts/apply-writing-assignment-type.mjs
node scripts/check-openai.mjs
```

확인 결과:

- Next.js production build 통과.
- 라이팅 DB migration 로컬 적용 완료.
- OpenAI API 호출 성공.
- `gpt-4.1-mini` 모델 호출 성공.

## 3. 현재 남은 주요 리스크

### 3.1 teacher auth mock

현재 강사 API는 대부분 `teacher-1` mock teacher 기준이다.

리스크:

- 운영 데이터에서 강사별 데이터 격리가 실제 session 기반으로 보장되지 않는다.
- Supabase migration 후 실사용 전에는 반드시 강사 session 구조로 전환해야 한다.

필요 작업:

- `requireTeacherSession()` 도입.
- 모든 `/api/teacher/*`에서 mockTeacherId 제거.
- 강사 로그인 세션 cookie 구조 확정.

### 3.2 레거시 타입 라벨 함수 잔존

일부 파일에는 legacy 타입 분기 문자열이 아직 남아 있다.

현재 상태:

- DB/API 응답은 `normalizeAssignmentType()`으로 정규화되어 실제 동작은 깨지지 않는다.
- 하지만 코드 가독성과 유지보수성이 낮다.

필요 작업:

- 모든 타입 라벨 함수를 `src/lib/assignmentTypes.ts`로 통합.
- 레거시 조건문 제거.

### 3.3 UI 문자열 인코딩 깨짐

일부 기존 파일에 한글 깨짐 문자열이 남아 있다.

영향:

- 기능 자체보다 UI 문구 품질에 영향.
- 학생/강사 화면 신뢰도 저하 가능.

필요 작업:

- 주요 화면부터 깨진 문구 정리:
  - 학생 숙제 상세
  - 학생 홈
  - 강사 제출 상세
  - 숙제 목록
  - 반 상세

### 3.4 AI 첨삭 응답 품질

현재 API는 JSON 응답을 기대하고, 실패 시 fallback을 반환한다.

리스크:

- 모델 응답 JSON 파싱 실패 가능.
- 응답 형식이 불안정하면 학생 화면에 단순 fallback이 표시될 수 있다.

필요 작업:

- structured output 방식으로 강화.
- 응답 스키마 검증 추가.
- AI 요청/응답 로그 저장 여부 검토.
- 비용 제한 및 rate limit 추가.

### 3.5 미리보기 저장 범위

현재 미리보기 저장은 실제 DB 저장이 아니라 브라우저 상태/localStorage 저장이다.

의도:

- “제출만 안 되고, 텍스트/오디오 입력은 테스트 가능”한 구조.

한계:

- 녹음 Blob은 페이지 새로고침 시 사라진다.
- 라이팅 텍스트만 localStorage에 남는다.

추후 결정:

- 미리보기 draft를 DB에 저장할지 여부.
- 교사용 preview 전용 임시 저장 테이블을 둘지 여부.

### 3.6 제출 완료 화면의 유형별 최적화

현재 제출 완료 화면은 과거 녹음 중심 UI의 흔적이 남아 있을 수 있다.

필요 작업:

- `listening_recording`
- `listening`
- `writing`

각 유형별 완료 화면을 분기해서 정리한다.

## 4. 최적화 우선순위

### 1순위: 인증 구조 운영화

- 강사 mock teacher 제거.
- `teacher-1` 고정 제거.
- teacher session 기반 필터링.
- 학생/강사 세션 유틸 정리.

### 2순위: 숙제 타입 시스템 정리

- 모든 타입/라벨/subject 매핑을 `src/lib/assignmentTypes.ts`로 통합.
- 레거시 타입 분기 제거.
- `ASSIGNMENT_TYPE_MAPPING.md`를 최종 3개 기준으로 업데이트.

### 3순위: 학생 숙제 UX 마감

- 제출 완료 화면 유형별 분기.
- 반려/재제출 흐름 유형별 확인.
- 라이팅 제출 후 학생이 AI 첨삭 결과와 선생님 피드백을 다시 볼 수 있게 정리.

### 4순위: 강사 검토 UX 마감

- 녹음 검토와 라이팅 검토 UI 분리.
- 승인/반려 버튼 상태 명확화.
- 저장 중/저장 완료/오류 상태 표시 개선.

### 5순위: 공지 / 캘린더 / 테스트 고도화

- 캘린더에서 숙제 개수, 시험, 휴강, 보강, 정규수업을 한 화면에서 명확히 표시.
- 반 상세 일정 관리와 학생 홈 캘린더의 데이터 연결 검증.
- 테스트 결과 입력 UX 개선.

### 6순위: Storage / Signed URL 정책 정리

- DB source of truth는 `*_storage_path`.
- API 응답 시 signed URL 생성.
- public URL fallback 최소화.
- 학생/강사 다운로드 방지 `controlsList="nodownload"` 적용 확인.

### 7순위: 성능 최적화

- 학생 홈 API 통합 또는 서버 repository 최적화.
- N+1 signed URL 생성 줄이기.
- 대시보드 집계 쿼리 인덱스 점검.
- `assignment_targets(student_id, due_at)`, `submissions(assignment_id, student_id)` 쿼리 플랜 확인.

## 5. Supabase Migration 전 체크리스트

- [ ] 운영 Supabase DB에는 아직 직접 migration 실행하지 않기.
- [ ] 빈 Supabase 테스트 DB에서 `database/auth.sql` 실행 검증.
- [ ] 기존 로컬 DB는 필요 시 `legacy-backfill.sql` 후 `drop-legacy.sql` 실행.
- [ ] `database/finalize_assignment_types_and_writing.sql` 적용.
- [ ] `database/calendar_notice_test.sql` 적용.
- [ ] `npm run seed:auth`가 운영 데이터를 덮지 않는지 재확인.
- [ ] Storage bucket 이름 확인:
  - `homework-image`
  - `homework-audio`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 서버 코드에서만 사용되는지 확인.
- [ ] Client Component에서 `supabase.from()` 또는 `storage.upload()` 직접 호출이 없는지 재검색.
- [ ] teacher session 전환 계획 확정.

## 6. 주요 파일 목록

### 타입 / 매핑

- `src/lib/assignmentTypes.ts`
- `src/types/assignment.ts`
- `src/features/class-calendar/types/classCalendar.ts`
- `src/features/student-management/types/studentManagement.ts`

### 학생 숙제 화면

- `src/app/student/assignments/[assignmentId]/RlRecordingHomework.tsx`
- `src/app/student/assignments/[assignmentId]/ListeningHomework.tsx`
- `src/app/student/assignments/[assignmentId]/WritingHomework.tsx`
- `src/app/student/assignments/[assignmentId]/page.tsx`
- `src/app/student/assignments/[assignmentId]/complete/page.tsx`

### 강사 숙제 화면

- `src/app/teacher/assignments/new/page.tsx`
- `src/app/teacher/assignments/page.tsx`
- `src/app/teacher/assignments/[assignmentId]/preview/page.tsx`

### API

- `src/app/api/teacher/assignments/route.ts`
- `src/app/api/teacher/assignments/bulk-assign/route.ts`
- `src/app/api/student/assignments/route.ts`
- `src/app/api/student/submissions/recording/route.ts`
- `src/app/api/student/submissions/listening/route.ts`
- `src/app/api/student/submissions/writing/route.ts`
- `src/app/api/student/writing-feedback/route.ts`
- `src/app/api/teacher/submissions/[submissionId]/route.ts`
- `src/app/api/teacher/submissions/[submissionId]/review/route.ts`

### DB / Scripts

- `database/auth.sql`
- `database/schema.sql`
- `database/finalize_assignment_types_and_writing.sql`
- `database/calendar_notice_test.sql`
- `scripts/apply-writing-assignment-type.mjs`
- `scripts/check-openai.mjs`
- `scripts/seed-auth.mjs`

## 7. 다음 작업 제안

다음 단계는 기능 추가보다 안정화가 우선이다.

추천 순서:

1. UI 깨진 한글 문구 정리.
2. 제출 완료 화면을 3개 숙제 유형별로 분기.
3. 강사 검토 화면을 녹음/라이팅별로 분리.
4. legacy 타입 라벨/조건문 제거.
5. teacher auth session 전환.
6. Supabase 테스트 DB에 전체 schema 재적용.
7. Playwright 또는 API smoke test 추가.
## 2차 안정화 작업 보고

### 처리한 내용

- `/api/teacher/*` Route Handler에서 직접 `mockTeacherId`를 import하던 구조를 `requireTeacherSession()` 기반으로 전환했다.
- `src/server/teacher/session.ts`에 실제 강사 세션 전환 TODO를 명확히 남겼다.
- 숙제 타입 공통 유틸은 `src/lib/assignmentTypes.ts` 기준으로 정리했다.
- 제출 완료 화면은 `RL 녹음`, `리스닝`, `라이팅` 유형별로 표시 내용이 갈리도록 정리했다.
- 강사 제출 검토 화면은 녹음 제출, 리스닝 완료, 라이팅 제출을 구분해 보여주도록 정리했다.
- Writing AI 첨삭 API는 항상 안정적인 응답 스키마를 반환하도록 보강했다.
- 학생 홈과 강사 숙제/반 관리 성능을 위한 보조 인덱스 파일 `database/performance_indexes.sql`을 추가했다.
- Supabase 운영 전 체크리스트에 2차 안정화 기준과 실행 순서를 보강했다.

### 성능 점검 결과

- 학생 홈은 `/api/student/home` 중심으로 공지, 숙제, 캘린더, 시험 정보를 묶어 가져오는 구조가 있어 API 분산 호출 위험은 낮다.
- 학생 과제 조회는 student session의 `studentId`, `teacherId` 기준으로 필터링되어 다른 학생 데이터 접근 위험을 줄였다.
- 강사 숙제 목록은 assignment target/submission 집계를 SQL에서 처리하는 구조로 N+1 위험을 줄였다.
- 캘린더/공지/시험 데이터는 날짜 범위 및 class/student 기준 필터링을 유지해야 하며, 운영 데이터가 많아지면 페이지네이션 또는 limit 정책을 추가하는 것이 좋다.
- signed URL은 API 응답 단계에서 생성되므로, 목록 화면에서는 실제 표시가 필요한 파일에 대해서만 생성하는 정책을 유지해야 한다.
- 학생 홈 공지 조회는 최신 10개, 학생 시험 결과는 최신 10개로 제한했다.
- 강사용 전체/반 공지 관리 조회는 최신 20개로 제한했다.

### 추가한 DB 인덱스

`database/performance_indexes.sql`에 아래 인덱스를 추가했다.

- `assignment_targets(student_id, due_at)`
- `assignment_targets(assignment_id, student_id)`
- `submissions(assignment_id, student_id)`
- `submissions(student_id, created_at)`
- `notice_targets(target_type, class_id, student_id)`
- `class_calendar_events(class_id, event_date)`

현재 schema에는 `notice_targets.target_id`, `class_calendar_events.start_at` 컬럼이 없으므로 실제 컬럼인 `class_id`, `student_id`, `event_date` 기준으로 구성했다.

### 남은 운영 전 리스크

- `requireTeacherSession()`은 아직 mock teacher를 반환한다. 운영 전 httpOnly cookie 기반 강사 세션 검증으로 교체해야 한다.
- 깨진 한글 문구는 핵심 화면 중심으로 계속 정리 중이며, 운영 전 전체 UI 수동 점검이 필요하다.
- Supabase 운영 DB에는 아직 migration을 직접 실행하지 않았다. 빈 테스트 DB에서 SQL 실행과 seed 재실행 위험을 먼저 검증해야 한다.
- 학생 홈/강사 대시보드는 데이터가 커졌을 때 limit, pagination, signed URL 지연 생성 전략을 추가로 검토해야 한다.

### 검증 명령

```bash
npm run build
node --check scripts/apply-writing-assignment-type.mjs
node --check scripts/seed-auth.mjs
node --check scripts/check-openai.mjs
```

## 사용하지 않는 코드 정리

### 삭제한 구형 학생 숙제 페이지

- `src/app/student/assignments/[assignmentId]/listen/page.tsx`
- `src/app/student/assignments/[assignmentId]/record/page.tsx`

현재 학생 숙제 수행은 `src/app/student/assignments/[assignmentId]/page.tsx`에서 숙제 유형별 컴포넌트로 직접 분기한다.

- `RlRecordingHomework`
- `ListeningHomework`
- `WritingHomework`

따라서 예전 1/2 듣기, 2/2 녹음 개별 route는 더 이상 연결되지 않는다.

### 삭제한 mock/localStorage 기반 코드

- `src/mocks/mockData.ts`
- `src/mocks/mockRepository.ts`
- `src/features/class-calendar/components/ClassDetailView.tsx`
- `src/features/class-calendar/repositories/classCalendarRepository.ts`
- `src/features/class-calendar/types/classCalendar.ts`

반 상세/캘린더/숙제/학생 데이터는 현재 Route Handler와 PostgreSQL 기반 구조로 전환되어 있어, 이전 mock/localStorage 컴포넌트는 제거했다.

### 삭제한 미사용 API wrapper/hook

- `src/features/assignments/api/assignmentApi.ts`
- `src/features/students/api/studentApi.ts`
- `src/hooks/useAudioPlayer.ts`

해당 파일들은 현재 import 참조가 없고, 동일 기능은 Route Handler 또는 현재 학생/강사 화면의 repository/API 함수로 대체되어 있다.

### 정리한 unused export

- `src/features/submissions/api/submissionApi.ts`에서 사용하지 않는 `TeacherSubmissionStatus`, `listTeacherAssignmentSubmissions()`를 제거했다.
- 동시에 남아 있던 깨진 한글 에러 문구를 정상 문구로 교체했다.

### 검증

- 삭제 후 `npm run build` 통과.
- 삭제 대상 관련 import 검색 결과 없음.

## Writing 보조 필드 및 미리보기 AI 첨삭

### 추가한 Writing 필드

`assignment_items`에 Writing 전용 보조 필드를 추가했다.

- `writing_instructions`: 추가 지시문
- `writing_hint`: 힌트
- `writing_example`: 예시 문장

적용 파일:

- `database/auth.sql`
- `database/schema.sql`
- `database/finalize_assignment_types_and_writing.sql`
- `src/types/assignment.ts`
- `src/app/api/teacher/assignments/route.ts`
- `src/app/api/student/assignments/route.ts`
- `src/features/assignments/repositories/studentAssignmentRepository.ts`

### 강사 생성/수정 UI

`src/app/teacher/assignments/new/page.tsx`를 정리하고 Writing 방식에 따라 아래 입력을 제공하도록 수정했다.

- 그림 묘사: 이미지 + 추가 주제/관찰 포인트 + 추가 지시문 + 힌트 + 예시 문장
- 주제/일기 쓰기: 주제 텍스트 + 추가 지시문 + 힌트 + 예시 문장

숙제 유형은 처음 생성 시에만 선택하고, 수정 화면에서는 변경할 수 없다.

### 학생 Writing 화면

`WritingHomework`에서 추가 지시문, 힌트, 예시 문장을 학생에게 카드로 표시한다.
AI 첨삭 요청 payload에도 해당 보조 필드를 함께 전달한다.

### 강사 미리보기 AI 첨삭

`src/app/teacher/assignments/[assignmentId]/preview/page.tsx`에서 Writing 미리보기도 실제 AI 첨삭 흐름을 호출하도록 변경했다.

- 새 API: `POST /api/teacher/writing-feedback`
- 학생 제출은 저장하지 않음
- 미리보기 입력은 localStorage에 유지
- AI 첨삭 결과는 학생 화면과 유사하게 원문/첨삭/피드백/문법/표현으로 표시

### 검증

- `npm run build` 통과
- `node scripts/apply-writing-assignment-type.mjs` 로컬 PostgreSQL 적용 완료
