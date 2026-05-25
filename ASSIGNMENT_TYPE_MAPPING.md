# Assignment Type Mapping

## 최종 운영 유형

현재 운영 UI/API/DB 기준 숙제 유형은 3개만 사용한다.

| 화면 라벨 | 과목 태그 | DB `assignment_type` | DB `item_type` | 학생 컴포넌트 | 처리 방식 |
|---|---|---|---|---|---|
| RL 녹음 | `RL` | `listening_recording` | `listening_recording` | `RlRecordingHomework` | 원본 음원 듣기 후 녹음 파일 제출 |
| 리스닝 | `Listening` | `listening` | `listening` | `ListeningHomework` | 원본 음원을 끝까지 들으면 파일 없이 완료 |
| 라이팅 | `Writing` | `writing` | `writing_prompt` | `WritingHomework` | 글 작성, AI 첨삭, 답안과 첨삭 결과 제출 |

## Legacy 유형 처리 정책

아래 legacy 유형은 신규 UI에 노출하지 않는다.

```text
image_speaking
sentence_shadowing
free_speaking
quiz
vocabulary
general
```

런타임에서 legacy 값이 들어오면 모두 `listening_recording`으로 정규화한다.

```ts
normalizeAssignmentType("image_speaking") === "listening_recording";
normalizeAssignmentType("sentence_shadowing") === "listening_recording";
normalizeAssignmentType("free_speaking") === "listening_recording";
normalizeAssignmentType("quiz") === "listening_recording";
normalizeAssignmentType("vocabulary") === "listening_recording";
normalizeAssignmentType("general") === "listening_recording";
```

## 공통 유틸

숙제 유형 관련 매핑은 `src/lib/assignmentTypes.ts`에서 관리한다.

주요 함수:

- `normalizeAssignmentType(type)`
- `assignmentTypeLabel(type)`
- `assignmentSubjectLabel(type)`
- `itemTypeForAssignmentType(type)`
- `isSupportedAssignmentType(type)`
- `isLegacyAssignmentType(type)`
- `normalizeAssignmentItemType(itemType, assignmentType)`

UI 파일에서 legacy 문자열을 직접 비교하지 말고 반드시 공통 유틸을 사용한다.

## 생성 UI 노출 여부

강사 숙제 생성 모달에는 아래 3개만 노출한다.

- RL 녹음
- 리스닝
- 라이팅

숙제 유형은 생성 시 최초 1회만 선택할 수 있다. 수정 화면에서는 유형 변경을 허용하지 않는다.

## 제출/완료 처리

### RL 녹음

- 학생 제출 API: `POST /api/student/submissions/recording`
- Storage: `homework-audio`
- DB 저장:
  - `submissions`
  - `submission_items.recording_storage_path`
  - `recording_file_name`
  - `recording_mime_type`
  - `file_size_bytes`
  - `recording_duration_sec`

### 리스닝

- 학생 완료 API: `POST /api/student/submissions/listening`
- 파일 저장 없음.
- `submissions`와 `assignment_targets` 상태만 업데이트한다.

### 라이팅

- AI 첨삭 API: `POST /api/student/writing-feedback`
- 학생 제출 API: `POST /api/student/submissions/writing`
- DB 저장:
  - `submission_items.answer_text`
  - `ai_corrected_text`
  - `ai_feedback`
  - `ai_grammar_notes`
  - `ai_expression_notes`
  - `ai_feedback_raw`

## 라이팅 전용 item 컬럼

`assignment_items`에는 아래 라이팅 전용 컬럼을 사용한다.

- `writing_mode`
  - `picture_description`
  - `topic_diary`
- `writing_unit`
  - `paragraphs`
  - `sentences`
- `writing_unit_count`
  - 기본값 `4`
- `prompt_text`

## 새 유형 추가 시 주의사항

새 숙제 유형을 추가하려면 아래를 동시에 수정해야 한다.

1. `src/lib/assignmentTypes.ts`
2. `database/auth.sql`
3. `database/schema.sql`
4. 필요한 migration SQL
5. 학생 수행 컴포넌트
6. 강사 생성/수정 UI
7. 제출 API
8. 강사 검토 화면
9. 제출 완료 화면

단, 현재 운영 안정화 단계에서는 새 유형 추가보다 3개 유형의 안정화가 우선이다.
## 레거시 UI 삭제 정책

- 신규 UI에는 숙제 유형을 `RL 녹음`, `리스닝`, `라이팅` 3개만 노출한다.
- `image_speaking`, `sentence_shadowing`, `free_speaking`, `quiz`, `vocabulary`, `general`은 생성 화면, 학생 화면, 강사 미리보기, 라벨 함수에서 전용 UI로 표시하지 않는다.
- 기존 DB/API에서 legacy 타입이 들어오면 `normalizeAssignmentType()`이 `listening_recording`으로 보정한다.
- 신규 숙제 생성 API는 legacy 타입 요청을 `400 지원하지 않는 숙제 유형입니다.`로 차단한다.
- legacy 보정 SQL과 migration 문서의 legacy 문자열은 기존 DB 보정 및 검증을 위해 유지한다.
