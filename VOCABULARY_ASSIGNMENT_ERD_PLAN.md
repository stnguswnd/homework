# Vocabulary Assignment ERD Plan

작성일: 2026-05-26

이 문서는 현재 Homework Studio의 기존 3가지 숙제 유형을 정리하고, 추가 예정인 2가지 단어장 숙제 유형을 위한 DB/ERD 확장 방향을 정리한다. 아직 구현 지시가 아니며, 이후 확정 후 SQL/API/UI 작업으로 이어간다.

## 1. 현재 운영 숙제 유형

현재 운영 숙제 유형은 `assignments.assignment_type` 기준으로 3개다.

| 화면 라벨 | `assignments.assignment_type` | `assignment_items.item_type` | 학생 화면 | 제출 방식 |
|---|---|---|---|---|
| RL 녹음 | `listening_recording` | `listening_recording` | `RlRecordingHomework` | 원본 음원 청취 후 학생 녹음 파일 제출 |
| 리스닝 | `listening` | `listening` | `ListeningHomework` | 원본 음원 끝까지 듣고 파일 없이 완료 처리 |
| 라이팅 | `writing` | `writing_prompt` | `WritingHomework` | 글 작성, AI 첨삭, 다시 쓰는 글 제출 |

현재 과목 태그는 숙제 유형과 분리되어 있다.

```sql
assignments.assignment_type     -- 숙제 수행 UI/로직 결정
assignments.assignment_subject  -- 반 관리/숙제 목록 필터용 과목 태그
```

현재 과목 태그 후보:

```text
Phonics, AL, AR, SL, RBJ, SG, ST, SR, JT, Boost, BRT, BLT
```

## 2. 현재 핵심 테이블 연결

현재 숙제 흐름은 아래 테이블을 중심으로 동작한다.

```text
teachers
  └─ assignments
       ├─ assignment_items
       └─ assignment_targets
             └─ submissions
                  ├─ submission_items
                  └─ teacher_feedback
```

### 2.1 `assignments`

숙제 원본 또는 템플릿 성격의 테이블이다.

주요 컬럼:

```sql
id text primary key
teacher_id text not null
class_id text nullable
schedule_day_id text nullable
title text not null
description text
assignment_type text not null
assignment_subject text not null default 'Phonics'
image_url text
image_storage_path text
image_file_name text
due_at timestamptz
status text
```

역할:

- 숙제의 제목, 설명, 유형, 과목 태그 저장
- 학생별 배정 정보는 직접 저장하지 않음
- 실제 배정은 `assignment_targets` 기준

### 2.2 `assignment_items`

숙제 안의 실제 콘텐츠 단위다.

현재 주요 컬럼:

```sql
assignment_id text not null
item_type text not null
title text
passage_text text
audio_url text
audio_storage_path text
image_url text
image_storage_path text
order_index int
min_recording_sec int
max_recording_sec int
writing_mode text
writing_unit text
writing_unit_count int
prompt_text text
writing_instructions text
writing_hint text
writing_example text
```

역할:

- RL 녹음/리스닝: 음원, 지문, 이미지, 녹음 제한 시간 저장
- 라이팅: 주제, 그림, 지시문, 힌트, 예시 저장

### 2.3 `assignment_targets`

학생별 숙제 배정 테이블이다.

주요 컬럼:

```sql
assignment_id text not null
class_id text nullable
student_id text not null
status text default 'assigned'
due_at timestamptz
submitted_at timestamptz
reviewed boolean
feedback text
cancelled_at timestamptz
cancelled_by text
unique (assignment_id, student_id)
```

역할:

- 어떤 학생에게 어떤 숙제가 배정되었는지 저장
- 학생별 개별 마감일 저장
- 배정 취소 상태 저장
- 학생 화면은 반드시 이 테이블 기준으로 자기 숙제만 조회

### 2.4 `submissions`

학생 제출 단위다.

주요 컬럼:

```sql
assignment_id text not null
student_id text not null
assignment_target_id text nullable
status text default 'not_submitted'
submitted_at timestamptz
teacher_comment text
reviewed_at timestamptz
unique (assignment_id, student_id)
```

역할:

- 한 학생이 한 숙제에 제출한 최종 제출 상태 저장
- 재제출 구조는 현재 같은 `submission`을 갱신하는 방식에 가깝다

### 2.5 `submission_items`

제출물의 실제 내용이다.

현재 주요 컬럼:

```sql
submission_id text not null
assignment_item_id text not null
recording_storage_path text
recording_url text
recording_file_name text
recording_mime_type text
recording_duration_sec int
file_size_bytes bigint
original_answer_text text
answer_text text
ai_corrected_text text
ai_feedback text
ai_grammar_notes text
ai_expression_notes text
ai_feedback_raw jsonb
```

역할:

- RL 녹음: 학생 녹음 파일 메타데이터 저장
- 라이팅: 원문, 다시 쓴 글, AI 첨삭 결과 저장

## 3. 추가 예정 숙제 유형

추가 예정 유형은 2개다.

| 화면 라벨 | 제안 `assignment_type` | 제안 `item_type` | 목적 |
|---|---|---|---|
| 단어장 예문 숙제 | `vocabulary_example` | `vocabulary_example` | 단어장을 보고 학생이 단어별 예문을 작성 |
| 단어장 녹음 숙제 | `vocabulary_recording` | `vocabulary_recording` | 단어장/예문을 보고 학생이 읽어서 녹음 제출 |

주의:

- 기존 legacy 타입 `vocabulary`와 이름을 분리하는 것이 좋다.
- 과거 legacy `vocabulary`는 지금 정책상 `listening_recording`으로 정규화하던 값이므로, 신규 타입은 명확하게 `vocabulary_example`, `vocabulary_recording`처럼 새 이름을 쓰는 편이 안전하다.

## 4. 왜 단어장 원본 테이블이 필요한가

단어장 숙제는 단순히 `assignment_items.passage_text`에 텍스트를 넣는 방식으로도 만들 수 있다. 하지만 운영 구조에서는 별도 단어장 테이블을 두는 것이 낫다.

이유:

- 같은 단어장을 여러 숙제에서 재사용 가능
- 단어별 뜻, 예문, 발음, 품사, 레벨, 순서 관리 가능
- 학생별 단어 응답/녹음을 단어 단위로 저장 가능
- 나중에 단어 테스트, 오답노트, 복습 기능으로 확장 가능

## 5. 권장 ERD 확장

### 5.1 `vocabulary_sets`

단어장 묶음 테이블이다.

```sql
create table vocabulary_sets (
  id text primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  title text not null,
  description text,
  subject text not null default 'Phonics',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

역할:

- 강사가 만든 단어장 원본
- `subject`는 `assignments.assignment_subject`와 같은 12개 과목 태그를 사용 가능

### 5.2 `vocabulary_words`

단어장 안의 단어 목록이다.

```sql
create table vocabulary_words (
  id text primary key,
  vocabulary_set_id text not null references vocabulary_sets(id) on delete cascade,
  word text not null,
  meaning text,
  part_of_speech text,
  example_sentence text,
  translation text,
  pronunciation text,
  audio_url text,
  audio_storage_path text,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

역할:

- 단어, 뜻, 품사, 기본 예문, 번역, 발음 정보 저장
- 단어별 원어민 발음 파일이 필요하면 `audio_storage_path` 사용

### 5.3 `assignment_vocabulary_sets`

숙제와 단어장을 연결하는 테이블이다.

```sql
create table assignment_vocabulary_sets (
  id text primary key,
  assignment_id text not null references assignments(id) on delete cascade,
  vocabulary_set_id text not null references vocabulary_sets(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (assignment_id, vocabulary_set_id)
);
```

역할:

- 하나의 숙제가 하나 이상의 단어장을 참조할 수 있게 함
- MVP에서는 한 숙제당 단어장 1개만 허용해도 됨
- 다중 단어장을 지원할 경우 UI/정렬 정책이 추가로 필요

### 5.4 `assignment_vocabulary_words` 선택 테이블

숙제에 단어장 전체가 아니라 일부 단어만 넣고 싶다면 필요하다.

```sql
create table assignment_vocabulary_words (
  id text primary key,
  assignment_id text not null references assignments(id) on delete cascade,
  vocabulary_word_id text not null references vocabulary_words(id) on delete restrict,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  unique (assignment_id, vocabulary_word_id)
);
```

MVP 선택:

- 단어장 전체를 그대로 숙제로 내는 구조라면 이 테이블 없이 `assignment_vocabulary_sets`만 사용
- 단어장 중 일부 단어만 선택해서 숙제로 내야 한다면 이 테이블 추가

## 6. 제출 ERD 확장

단어장 숙제는 학생 답변이 단어 단위로 생긴다. `submission_items`에 전체 JSON으로 저장할 수도 있지만, 검토/통계/재제출을 생각하면 단어별 제출 테이블을 따로 두는 것이 좋다.

### 6.1 `submission_vocabulary_items`

```sql
create table submission_vocabulary_items (
  id text primary key,
  submission_id text not null references submissions(id) on delete cascade,
  vocabulary_word_id text not null references vocabulary_words(id) on delete restrict,
  assignment_item_id text references assignment_items(id) on delete cascade,
  example_answer_text text,
  recording_storage_path text,
  recording_url text,
  recording_file_name text,
  recording_mime_type text,
  recording_duration_sec int,
  file_size_bytes bigint,
  ai_feedback text,
  teacher_comment text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'returned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, vocabulary_word_id)
);
```

역할:

- 단어장 예문 숙제: `example_answer_text` 저장
- 단어장 녹음 숙제: 단어별 녹음 파일 메타데이터 저장
- 나중에 단어별 선생님 코멘트/반려도 가능

## 7. 숙제 유형별 저장 방식

### 7.1 단어장 예문 숙제

제안 값:

```text
assignments.assignment_type = vocabulary_example
assignment_items.item_type = vocabulary_example
```

생성 시:

```text
assignments 생성
assignment_items 1개 생성
assignment_vocabulary_sets 연결
assignment_targets로 학생별 배정
```

학생 제출 시:

```text
submissions upsert
submission_items는 요약 row로 유지 가능
submission_vocabulary_items에 단어별 예문 저장
assignment_targets.status = submitted
submitted_at 업데이트
```

학생 화면 예시:

```text
단어장 보기
단어 / 뜻 / 기본 예문
각 단어마다 내가 만든 예문 입력
제출하기
```

강사 검토 화면:

```text
단어별 학생 예문
선생님 코멘트
완료 / 미완료
```

### 7.2 단어장 녹음 숙제

제안 값:

```text
assignments.assignment_type = vocabulary_recording
assignment_items.item_type = vocabulary_recording
```

생성 시:

```text
assignments 생성
assignment_items 1개 생성
assignment_vocabulary_sets 연결
assignment_targets로 학생별 배정
```

학생 제출 시:

```text
submissions upsert
submission_vocabulary_items에 단어별 녹음 메타데이터 저장
assignment_targets.status = submitted
submitted_at 업데이트
```

Storage path 제안:

```text
submissions/{submissionId}/vocabulary/{vocabularyWordId}/{fileName}
```

학생 화면 예시:

```text
단어장 보기
단어 / 뜻 / 예문 확인
단어 또는 예문을 읽고 녹음
내 녹음 다시 듣기
제출하기
```

강사 검토 화면:

```text
단어별 녹음 재생
단어별 코멘트 또는 전체 코멘트
완료 / 미완료
```

## 8. `assignment_items` 확장 여부

단어장 숙제 자체의 옵션은 `assignment_items`에 최소 컬럼을 추가해서 관리할 수 있다.

제안 컬럼:

```sql
alter table assignment_items
add column if not exists vocabulary_mode text check (
  vocabulary_mode in ('example', 'recording')
),
add column if not exists vocabulary_prompt text,
add column if not exists vocabulary_require_all_words boolean not null default true;
```

다만 `assignment_type`만으로 예문/녹음이 구분된다면 `vocabulary_mode`는 없어도 된다.

권장:

- MVP에서는 `assignment_type`과 `item_type`으로만 구분
- 지시문은 기존 `description` 또는 `assignment_items.title`, `passage_text` 재사용
- 단어장 전용 옵션이 늘어날 때만 `vocabulary_*` 컬럼 추가

## 9. CHECK constraint 변경 필요

신규 유형을 확정하면 아래 constraint를 수정해야 한다.

현재:

```sql
assignments.assignment_type in (
  'listening_recording',
  'listening',
  'writing'
)
```

변경안:

```sql
assignments.assignment_type in (
  'listening_recording',
  'listening',
  'writing',
  'vocabulary_example',
  'vocabulary_recording'
)
```

현재:

```sql
assignment_items.item_type in (
  'listening_recording',
  'listening',
  'writing_prompt'
)
```

변경안:

```sql
assignment_items.item_type in (
  'listening_recording',
  'listening',
  'writing_prompt',
  'vocabulary_example',
  'vocabulary_recording'
)
```

## 10. TypeScript 확장 필요

확정 시 `src/lib/assignmentTypes.ts`에 추가해야 한다.

```ts
export type AssignmentType =
  | "listening_recording"
  | "listening"
  | "writing"
  | "vocabulary_example"
  | "vocabulary_recording";

export type AssignmentItemType =
  | "listening_recording"
  | "listening"
  | "writing_prompt"
  | "vocabulary_example"
  | "vocabulary_recording";
```

라벨 제안:

```text
vocabulary_example   → 단어장 예문
vocabulary_recording → 단어장 녹음
```

## 11. API 연결 계획

### 11.1 강사 단어장 CRUD

필요 API:

```text
GET    /api/teacher/vocabulary-sets
POST   /api/teacher/vocabulary-sets
GET    /api/teacher/vocabulary-sets/:vocabularySetId
PATCH  /api/teacher/vocabulary-sets/:vocabularySetId
DELETE /api/teacher/vocabulary-sets/:vocabularySetId
```

단어 CRUD:

```text
POST   /api/teacher/vocabulary-sets/:vocabularySetId/words
PATCH  /api/teacher/vocabulary-sets/:vocabularySetId/words/:wordId
DELETE /api/teacher/vocabulary-sets/:vocabularySetId/words/:wordId
```

### 11.2 숙제 생성 API

기존:

```text
POST /api/teacher/assignments
```

추가 payload:

```json
{
  "type": "vocabulary_example",
  "vocabularySetId": "vocab-set-1"
}
```

또는 일부 단어 선택 시:

```json
{
  "type": "vocabulary_recording",
  "vocabularySetId": "vocab-set-1",
  "vocabularyWordIds": ["word-1", "word-2"]
}
```

### 11.3 학생 과제 조회 API

기존:

```text
GET /api/student/assignments
```

추가 반환:

```ts
assignment.vocabularySet?: {
  id: string;
  title: string;
  words: Array<{
    id: string;
    word: string;
    meaning?: string;
    exampleSentence?: string;
    audioUrl?: string;
  }>;
};
```

### 11.4 학생 제출 API

권장 분리:

```text
POST /api/student/submissions/vocabulary-example
POST /api/student/submissions/vocabulary-recording
```

예문 제출 payload:

```json
{
  "assignmentId": "assignment-1",
  "answers": [
    {
      "vocabularyWordId": "word-1",
      "exampleAnswerText": "I can use this word in a sentence."
    }
  ]
}
```

녹음 제출은 multipart:

```text
assignmentId
files[word-1]
files[word-2]
durationSec[word-1]
durationSec[word-2]
```

## 12. 학생 화면 컴포넌트 계획

추가 컴포넌트:

```text
VocabularyExampleHomework
VocabularyRecordingHomework
```

분기:

```tsx
switch (assignment.assignmentType) {
  case "listening_recording":
    return <RlRecordingHomework assignment={assignment} />;
  case "listening":
    return <ListeningHomework assignment={assignment} />;
  case "writing":
    return <WritingHomework assignment={assignment} />;
  case "vocabulary_example":
    return <VocabularyExampleHomework assignment={assignment} />;
  case "vocabulary_recording":
    return <VocabularyRecordingHomework assignment={assignment} />;
}
```

## 13. 강사 검토 화면 계획

기존 제출 상세:

```text
/teacher/submissions/:submissionId
```

추가 표시:

### 단어장 예문

```text
단어
뜻
학생 예문
선생님 코멘트
```

### 단어장 녹음

```text
단어
뜻
기본 예문
학생 녹음 플레이어
녹음 시간
선생님 코멘트
```

## 14. 추천 구현 순서

1. 단어장 ERD 확정
2. `vocabulary_sets`, `vocabulary_words` SQL 추가
3. `assignment_type`, `item_type` CHECK constraint 확장
4. 강사 단어장 CRUD API/UI
5. 숙제 생성 화면에 2개 유형 추가
6. 숙제 생성 시 단어장 선택 연결
7. 학생 과제 조회 API에 단어장 포함
8. `VocabularyExampleHomework` 구현
9. `VocabularyRecordingHomework` 구현
10. 제출 API 구현
11. 강사 제출 상세 화면 확장
12. seed/demo data 추가

## 15. 결정해야 할 사항

구현 전에 아래를 결정해야 한다.

1. 한 숙제에 단어장 1개만 연결할지, 여러 개 연결할지
2. 단어장 전체를 숙제로 낼지, 단어 일부 선택을 허용할지
3. 단어장 예문 숙제에서 AI 첨삭을 붙일지
4. 단어장 녹음 숙제에서 단어별 녹음인지, 전체 한 번 녹음인지
5. 단어별 선생님 코멘트가 필요한지, 제출 전체 코멘트만 필요한지
6. 단어별 원어민 음원 업로드가 필요한지
7. 학생 재제출 시 기존 단어별 제출 row를 덮어쓸지, attempt 이력을 남길지

