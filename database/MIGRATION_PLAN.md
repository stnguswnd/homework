# Homework Studio Migration Plan

## Assignment Type Policy

신규 운영 UI와 신규 schema는 아래 3개 숙제 유형만 사용한다.

| UI label | assignments.assignment_type | assignment_items.item_type |
| --- | --- | --- |
| RL 녹음 | `listening_recording` | `listening_recording` |
| 리스닝 | `listening` | `listening` |
| 라이팅 | `writing` | `writing_prompt` |

## Legacy Type Handling

아래 legacy 타입은 신규 UI에서 삭제한다.

- `image_speaking`
- `sentence_shadowing`
- `free_speaking`
- `quiz`
- `vocabulary`
- `general`

정책:

- 신규 생성 UI에는 legacy 타입을 노출하지 않는다.
- 신규 생성 API는 legacy 타입 요청을 차단한다.
- 기존 DB/API 조회에서 legacy 타입이 들어오면 애플리케이션에서 `listening_recording`으로 정규화한다.
- 기존 DB에 남은 legacy 데이터는 migration/backfill 단계에서 `listening_recording`으로 보정한다.
- `database/legacy-backfill.sql`, `database/drop-legacy.sql`, `database/auth.legacy.sql`의 legacy 문자열은 기존 DB 보정용으로 유지한다.

## SQL Order For Test DB

```bash
psql "$DATABASE_URL" -f database/auth.sql
psql "$DATABASE_URL" -f database/calendar_notice_test.sql
psql "$DATABASE_URL" -f database/finalize_assignment_types_and_writing.sql
psql "$DATABASE_URL" -f database/performance_indexes.sql
```

기존 로컬 DB에서 legacy 제거를 검증할 때만 다음 파일을 추가 실행한다.

```bash
psql "$DATABASE_URL" -f database/legacy-backfill.sql
psql "$DATABASE_URL" -f database/drop-legacy.sql
```
