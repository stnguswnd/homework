# Subject Management Policy

## Goal

반 상세페이지에서 과목을 추가/삭제하고, 반 관리 화면에서 과목별로 과제/미제출/검토 필요 항목을 필터링한다.

현재 과제 생성 시 사용하는 subject와 반에서 관리하는 subject는 같은 값이어야 한다.

## Current State

- 과제의 과목은 `assignments.assignment_subject`에 저장된다.
- 과목 값은 `src/lib/assignmentTypes.ts`의 `ASSIGNMENT_SUBJECTS` 12개 값으로 정규화된다.
- 현재 반 관리 overview는 반에 저장된 과목이 아니라, 해당 반 학생들에게 배정된 과제의 `assignments.assignment_subject`를 모아서 필터 목록을 만든다.
- 따라서 현재 구조에서는 과제를 한 번도 낸 적 없는 과목은 필터에 표시되지 않는다.

## Decided Approach

`classes` 테이블에 `subject` 컬럼을 추가하지 않는다.

대신 `class_subjects` 테이블 하나만 추가한다.

```txt
classes
  id

class_subjects
  class_id
  subject

assignments
  class_id
  assignment_subject
```

역할은 다음과 같이 나눈다.

- `class_subjects.subject`: 이 반에서 관리/노출할 과목 목록
- `assignments.assignment_subject`: 이 과제가 실제로 속한 과목

과제 테이블은 기존 `assignments.assignment_subject`를 유지한다. 별도의 `subject_id`는 추가하지 않는다.

## Why Not `classes.subject`

`classes.subject`는 1반 = 1과목일 때만 맞다.

한 반이 `Phonics`, `SL`, `SR`처럼 여러 과목을 운영할 수 있으므로, `classes`에 단일 subject 컬럼을 두면 구조가 막힌다.

## Why Not `subjects` Table

현재 결정은 과목 12개가 고정이고, 새 과목 추가나 과목 이름 변경을 하지 않는다는 전제다.

따라서 `subjects` 마스터 테이블은 만들지 않는다.

나중에 다음 요구가 생기면 `subjects` 테이블로 확장하는 편이 맞다.

- 새 과목을 DB/관리자 화면에서 추가
- 과목 이름 변경
- 과목별 표시명, 정렬 순서, 색상, 활성/비활성 관리
- 과목 code와 label 분리

그때는 장기적으로 `assignments.assignment_subject` 문자열 대신 `assignments.subject_id`를 쓰는 구조가 더 적합하다.

## Schema

권장 스키마:

```sql
create table class_subjects (
  class_id text not null references classes(id) on delete cascade,
  subject text not null,
  created_at timestamptz not null default now(),
  primary key (class_id, subject),
  check (subject in ('Phonics', 'AL', 'AR', 'SL', 'RBJ', 'SG', 'ST', 'SR', 'JT', 'Boost', 'BRT', 'BLT'))
);
```

`primary key (class_id, subject)`가 중복 추가를 막는다.

별도 FK로 `assignments(class_id, assignment_subject)`를 `class_subjects(class_id, subject)`에 연결하지 않는다.

이유:

- 현재 `assignments.class_id`가 `null`인 draft/템플릿 과제가 존재한다.
- assignment target 기준으로 class가 결정되는 흐름도 있다.
- 강한 DB FK를 걸면 기존 draft/과도기 데이터와 충돌할 수 있다.

대신 과제 생성 API에서 검증한다.

## Migration For Existing Data

기존 과제 데이터를 기준으로 `class_subjects`를 초기화한다.

```sql
insert into class_subjects (class_id, subject)
select distinct coalesce(at.class_id, a.class_id), a.assignment_subject
from assignments a
left join assignment_targets at on at.assignment_id = a.id
where coalesce(at.class_id, a.class_id) is not null
  and a.assignment_subject is not null
  and trim(a.assignment_subject) <> ''
on conflict do nothing;
```

이 마이그레이션 후 기존에 과제를 낸 적 있는 과목은 반 필터에 계속 표시된다.

주의:

- 과제를 낸 적 없는 과목은 자동으로 생기지 않는다.
- 필요한 과목은 반 상세에서 수동 추가해야 한다.

## Class Detail Behavior

반 상세페이지에서 과목을 추가/삭제할 수 있다.

추가:

- 선택지는 고정 12개 과목이다.
- 이미 추가된 과목은 다시 추가할 수 없다.
- 추가 시 `class_subjects(class_id, subject)`에 insert한다.

삭제:

- `class_subjects` row를 delete한다.
- 기존 과제의 `assignments.assignment_subject`는 수정하지 않는다.
- 삭제된 과목의 기존 과제 데이터는 남는다.

삭제 정책은 구현 전에 명확히 정해야 한다.

권장 정책:

- 해당 과목으로 진행 중인 과제/미제출/검토 필요 항목이 있으면 삭제 전 경고한다.
- 삭제해도 과제 자체는 삭제하지 않는다.
- 삭제 후에는 필터 목록에서 사라지므로, 사용자가 그 과목의 기존 과제를 필터로 접근하기 어려워질 수 있다.

더 엄격한 정책:

- 해당 과목의 과제가 하나라도 있으면 삭제를 막는다.

현재 UX 기준으로는 경고 후 삭제 허용이 더 유연하다.

## Class Management Filter Behavior

필터 버튼/탭 목록은 `class_subjects` 기준으로 만든다.

```txt
전체 | Phonics | SL | SR
```

실제 목록 필터링은 기존 과제 subject 기준으로 한다.

```ts
item.subject === selectedSubject
```

즉:

- 필터에 표시할 과목 목록: `class_subjects.subject`
- 필터링할 과제 항목의 과목: `assignments.assignment_subject`

결과:

- 반에 등록된 과목이면 과제가 없어도 필터에 표시된다.
- 과제가 없는 과목을 선택하면 빈 상태를 보여준다.
- 반에 등록되지 않은 과목은 필터에 표시하지 않는다.

## Assignment Creation Behavior

과제 생성 시 subject는 기존처럼 `assignments.assignment_subject`에 저장한다.

단, 선택 가능한 subject는 반의 `class_subjects`를 기준으로 한다.

정책:

1. 해당 반의 `class_subjects`가 1개 이상 있으면, 그 목록 안의 subject만 선택 가능하다.
2. 해당 반의 `class_subjects`가 0개이면, 초기 전환 호환성을 위해 고정 12개 과목 전체를 선택지로 보여준다.
3. 0개 상태에서 과제를 생성하면 선택한 subject를 `class_subjects`에 자동 추가한다.

예:

```txt
class-a에 class_subjects 없음
사용자가 과제 생성에서 SL 선택
assignments.assignment_subject = 'SL' 저장
class_subjects(class-a, 'SL') 자동 insert
```

이후 반 관리 필터에는 `SL`이 표시된다.

검증 흐름:

```ts
const classSubjects = await getClassSubjects(classId);

if (classSubjects.length > 0) {
  if (!classSubjects.includes(subject)) {
    throw new Error("이 반에 등록되지 않은 과목입니다.");
  }
} else {
  await insertClassSubject(classId, subject);
}
```

## Draft Assignments

`class_id`가 없는 draft/템플릿 과제는 `class_subjects` 검증을 하지 않는다.

이 경우 subject는 고정 12개 과목 중 하나인지까지만 검증한다.

나중에 class를 지정해 발행하거나 배정할 때, 해당 class의 `class_subjects` 정책을 적용한다.

## Assignment Targets

현재 데이터 흐름에서는 과제의 class가 `assignments.class_id` 또는 `assignment_targets.class_id`로 결정될 수 있다.

따라서 조회 시 class 기준은 기존처럼 다음 값을 고려한다.

```sql
coalesce(assignment_targets.class_id, assignments.class_id)
```

기존 과제 목록/캘린더/학생 홈 등에서 class를 계산하는 방식과 일관성을 맞춘다.

## Deleting A Class Subject

삭제 시 고려할 점:

- `class_subjects` 삭제는 과제 삭제가 아니다.
- 기존 `assignments.assignment_subject` 값은 그대로 남는다.
- 필터 목록이 `class_subjects` 기반으로 바뀌면 삭제된 과목은 필터에서 사라진다.
- 단, 전체 보기에는 기존 과제가 계속 보일 수 있다.

삭제 API는 최소한 다음 정보를 확인할 수 있어야 한다.

- 해당 class + subject로 배정된 과제 수
- 미제출 수
- 검토 필요 수

이 정보를 경고 모달에 보여줄 수 있다.

## API Changes Needed

추가될 API 예시:

```txt
GET    /api/teacher/classes/:classId/subjects
POST   /api/teacher/classes/:classId/subjects
DELETE /api/teacher/classes/:classId/subjects/:subject
```

또는 기존 class detail API에 포함해도 된다.

반 관리 overview API 변경:

- 현재는 `assignments.assignment_subject`에서 subject 목록을 만든다.
- 변경 후에는 `class_subjects`를 join하거나 별도 조회해서 class별 subjects를 채운다.

과제 생성 API 변경:

- `class_id`가 있는 경우 `class_subjects` 검증 추가
- `class_subjects`가 비어 있으면 생성 subject 자동 insert

## UI Changes Needed

반 상세페이지:

- 과목 목록 표시
- 과목 추가 버튼
- 과목 삭제 버튼
- 삭제 전 경고

반 관리 목록:

- 필터 목록을 API의 `class_subjects` 기반 subjects로 표시
- 과제가 없는 과목 선택 시 빈 상태 표시

과제 생성페이지:

- class 선택 후 해당 class의 subjects를 불러온다.
- class subjects가 비어 있으면 고정 12개 과목 전체를 보여준다.
- subject 선택 후 과제 생성 시 API 검증을 통과해야 한다.

## Edge Cases

### Existing class has assignments but no class_subjects

마이그레이션으로 대부분 채워야 한다.

마이그레이션 누락 시에도 과제 생성 시 자동 추가 정책이 있으므로 신규 생성은 가능하다.

### Class has no subjects and no assignments

과제 생성에서는 고정 12개 과목 전체를 보여준다.

첫 과제 생성 시 선택한 과목이 `class_subjects`에 자동 추가된다.

### Subject removed from class but old assignments remain

전체 보기에는 남는다.

과목 필터에서는 사라질 수 있다.

이 UX가 싫으면 삭제를 막는 정책으로 바꿔야 한다.

### Invalid subject string in old data

현재 `normalizeAssignmentSubject`는 알 수 없는 값을 `Phonics`로 fallback한다.

마이그레이션 전에 old data를 정리하는 것이 좋다.

가능하면 DB check constraint 추가 전 다음을 확인한다.

```sql
select distinct assignment_subject
from assignments
where assignment_subject not in ('Phonics', 'AL', 'AR', 'SL', 'RBJ', 'SG', 'ST', 'SR', 'JT', 'Boost', 'BRT', 'BLT');
```

### Multiple classes sharing one assignment

`assignment_targets.class_id` 기준으로 각 class에 subject가 필요할 수 있다.

마이그레이션과 조회는 `coalesce(at.class_id, a.class_id)`를 기준으로 해야 한다.

### Changing subject list in code

`ASSIGNMENT_SUBJECTS`와 DB `check` constraint가 반드시 같은 값을 가져야 한다.

과목 12개가 바뀌면 코드와 DB 마이그레이션을 같이 수정해야 한다.

## Implementation Order

1. `class_subjects` migration 추가
2. 기존 과제 데이터 기반 backfill SQL 추가
3. class subject 조회/추가/삭제 API 추가
4. 반 상세페이지 과목 관리 UI 추가
5. 반 관리 overview API를 `class_subjects` 기반으로 변경
6. 과제 생성 API에 class subject 검증 및 자동 추가 정책 적용
7. 과제 생성 UI에서 class별 subject 선택지 적용
8. 기존 주요 화면 회귀 확인

## Final Decision Summary

- `classes.subject`는 추가하지 않는다.
- `subjects` 테이블도 현재는 만들지 않는다.
- `class_subjects(class_id, subject)`만 추가한다.
- 과제 subject는 기존 `assignments.assignment_subject`를 유지한다.
- 필터 목록은 `class_subjects` 기반으로 바꾼다.
- 실제 과제 필터링은 `assignments.assignment_subject` 기준으로 한다.
- 과제 생성 시 class subjects가 있으면 그 안에서만 선택 가능하게 한다.
- class subjects가 비어 있으면 기존 12개 전체를 보여주고, 생성 시 선택 subject를 자동 추가한다.
