# 단어장 예문 / 단어장 녹음 숙제 구현 보고서

작성일: 2026-05-26

## 1. 작업 요약

기존 Homework Studio 숙제 구조에 신규 숙제 유형 2개를 추가했다.

| 화면 라벨 | DB `assignment_type` | DB `item_type` | 학생 화면 |
|---|---|---|---|
| 단어장 예문 | `vocabulary_example` | `vocabulary_example` | `VocabularyExampleHomework` |
| 단어장 녹음 | `vocabulary_recording` | `vocabulary_recording` | `VocabularyRecordingHomework` |

이번 구현에서는 단어장 재사용 기능을 만들지 않고, 숙제별로 단어 목록을 직접 저장하는 구조로 정리했다.

## 2. DB 변경

신규 migration 파일:

```text
database/vocabulary_assignments.sql
```

추가 테이블:

```text
assignment_vocabulary_items
submission_vocabulary_items
```

### assignment_vocabulary_items

숙제에 종속된 단어 목록을 저장한다.

주요 컬럼:

```text
id
assignment_id
word
meaning
order_index
created_at
updated_at
```

### submission_vocabulary_items

단어장 예문 숙제에서 학생의 단어별 문장, AI 첨삭 결과, 다시 쓴 문장을 저장한다.

주요 컬럼:

```text
id
submission_id
assignment_vocabulary_item_id
original_answer_text
ai_corrected_text
ai_feedback
ai_grammar_notes
ai_feedback_raw
revised_answer_text
teacher_comment
status
created_at
updated_at
```

### CHECK constraint 확장

`assignments.assignment_type` 허용값에 아래를 추가했다.

```text
vocabulary_example
vocabulary_recording
```

`assignment_items.item_type` 허용값에도 동일하게 추가했다.

## 3. DB 적용 결과

`psql`은 로컬 PATH에 없어 직접 실행이 실패했다.

대신 프로젝트의 기존 `pg` 기반 migration 적용 방식과 맞춰 아래 스크립트를 추가했다.

```text
scripts/apply-vocabulary-assignments.mjs
```

실행 결과:

```text
database/vocabulary_assignments.sql applied
```

이후 seed도 실행했다.

```text
npm run seed:auth
```

결과:

```text
Schema applied and seed data inserted.
Seeding demo assignments, targets, submissions, and recording metadata.
```

## 4. 타입 / 라벨 변경

수정 파일:

```text
src/lib/assignmentTypes.ts
src/types/assignment.ts
```

추가된 타입:

```ts
"vocabulary_example"
"vocabulary_recording"
```

라벨:

```text
vocabulary_example -> 단어장 예문
vocabulary_recording -> 단어장 녹음
```

## 5. 강사 숙제 생성 / 수정 화면

수정 파일:

```text
src/app/teacher/assignments/new/page.tsx
```

추가 내용:

- 숙제 유형 선택에 `단어장 예문`, `단어장 녹음` 추가
- 단어장 입력 테이블 추가
- 행 추가 / 삭제
- 엑셀 복사 붙여넣기용 일괄 붙여넣기 모달
- 단어장 예문 전용 필드
  - 기본 지시문
  - 추가 지시문
  - 힌트
  - 예시 문장
- 단어장 녹음 전용 필드
  - 기본 지시문
  - 추가 안내
  - 최소 녹음 시간
  - 최대 녹음 시간
  - 발음 가이드 음원 선택

단어장 유형에서는 이미지 미리보기 영역을 사용하지 않고, 단어장 입력 테이블이 전체 폭을 사용하도록 구성했다.

## 6. API 변경

### 강사 숙제 생성 API

수정 파일:

```text
src/app/api/teacher/assignments/route.ts
```

변경 내용:

- `vocabularyItems` payload 파싱
- 단어장 유형 생성 시 최소 1개 단어 validation
- `assignment_vocabulary_items` 저장
- 숙제 상세 응답에 `vocabularyItems` 포함

### 학생 과제 조회 API

수정 파일:

```text
src/app/api/student/assignments/route.ts
src/features/assignments/repositories/studentAssignmentRepository.ts
```

변경 내용:

- 학생 과제 응답에 `vocabularyItems` 포함
- 학생 제출 응답에 `submissionVocabularyItems` 포함

### 단어장 예문 AI 첨삭 API

추가 파일:

```text
src/app/api/student/vocabulary-feedback/route.ts
```

역할:

- 단어, 뜻, 학생 문장을 받아 AI 첨삭 결과 반환
- OpenAI 오류 시 fallback 응답 반환
- 간단한 요청 간격 제한 적용

### 단어장 예문 제출 API

추가 파일:

```text
src/app/api/student/submissions/vocabulary-example/route.ts
```

역할:

- 학생 세션 기준 검증
- 배정된 과제인지 확인
- `submissions` upsert
- `submission_items` placeholder upsert
- `submission_vocabulary_items` upsert
- `assignment_targets.status`, `submitted_at` 업데이트

## 7. 학생 화면

추가 파일:

```text
src/app/student/assignments/[assignmentId]/VocabularyExampleHomework.tsx
src/app/student/assignments/[assignmentId]/VocabularyRecordingHomework.tsx
```

수정 파일:

```text
src/app/student/assignments/[assignmentId]/page.tsx
src/app/student/assignments/[assignmentId]/complete/page.tsx
```

### 단어장 예문

구현 내용:

- 단어별 진행률 표시
- 단어 / 뜻 카드
- 문장 작성
- AI 첨삭 요청
- AI 첨삭 결과 표시
- 다시 쓰는 글 입력
- 전 단어 / 다음 단어 이동
- 마지막 단어에서 제출

### 단어장 녹음

구현 내용:

- 단어장 2열 리스트
- 전체 단어장을 한 번에 읽는 녹음 구조
- MediaRecorder 기반 녹음
- 다시 듣기
- 다시 녹음하기
- 기존 녹음 제출 API로 파일 제출

## 8. 강사 미리보기 / 제출 상세

수정 파일:

```text
src/app/teacher/assignments/[assignmentId]/preview/page.tsx
src/app/api/teacher/submissions/[submissionId]/route.ts
src/app/teacher/submissions/[submissionId]/SubmissionReviewPanel.tsx
```

변경 내용:

- 미리보기에서 단어장 예문 / 단어장 녹음 분기 추가
- 제출 상세 API에 단어장 제출 데이터 포함
- 강사 제출 상세에서 단어장 예문 결과 표시
- 단어장 녹음 제출에서는 단어 목록과 학생 녹음 파일 표시

## 9. Seed 데이터

수정 파일:

```text
scripts/seed-auth.mjs
```

추가된 데모 과제:

```text
assignment-5: Unit 3 Vocabulary Sentence Writing
assignment-6: Unit 3 Vocabulary Reading
hw_5: 단어장 예문 draft 템플릿
hw_6: 단어장 녹음 draft 템플릿
```

추가된 단어 예시:

```text
apple / 사과
library / 도서관
happy / 행복한
mountain / 산
teacher / 선생님
picture / 사진
hungry / 배고픈
quickly / 빠르게
```

## 10. 검증 결과

실행한 명령:

```text
node --check scripts/apply-vocabulary-assignments.mjs
node scripts/apply-vocabulary-assignments.mjs
npm run seed:auth
npm run build
```

결과:

```text
node --check 통과
DB migration 적용 성공
seed 실행 성공
npm run build 통과
```

## 11. 남은 TODO

- 단어장 예문 AI 첨삭은 현재 학생 화면에서 즉시 호출한다. 운영 전에는 학생별/과제별 rate limit을 더 강화하는 것이 좋다.
- 단어장 예문 답안 draft를 단어 이동마다 서버 저장하는 기능은 아직 없다. 현재는 제출 전 local state 중심이다.
- 단어장 녹음의 waveform은 실제 파형 분석이 아니라 간단한 시각적 표시다.
- 제출자가 있는 단어장 과제의 단어 목록 수정 제한 정책은 UI/서버 양쪽에서 추가 보강할 수 있다.
- 강사 제출 상세에서 단어별 teacher comment 저장은 테이블 컬럼은 있으나 UI 저장 흐름은 아직 MVP 범위 밖이다.
- Supabase 운영 DB 적용 전에는 빈 테스트 DB에서 `database/vocabulary_assignments.sql`을 먼저 검증해야 한다.
