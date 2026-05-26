# Class Delete Policy Report

## Summary

Class deletion now follows a data-aware policy:

- Classes with only student memberships can be hard deleted.
- Students are never deleted or inactivated by class deletion.
- Existing `class_memberships` are allowed and are removed by the `classes -> class_memberships` cascade.
- Classes with learning or operation history are archived instead of deleted.

## Hard Delete Criteria

Hard delete is allowed only when all history counts are zero:

- `class_schedule_days`
- `class_calendar_events`
- `assignments`
- `assignment_targets`
- `tests`
- `test_results`
- `notice_targets`

`class_memberships` is intentionally not a blocking condition.

## API Behavior

Implemented in `DELETE /api/teacher/classes/:classId`.

When no history exists:

```json
{
  "ok": true,
  "deleted": true,
  "archived": false,
  "reason": "no_history"
}
```

When history exists:

```json
{
  "ok": true,
  "deleted": false,
  "archived": true,
  "reason": "has_history",
  "counts": {}
}
```

The same route supports `GET /api/teacher/classes/:classId?deletePreview=1` so the UI can show the correct confirmation copy before acting.

## UI Behavior

- Active classes remain the default class list.
- Archived classes are shown in a separate "비활성 반" tab.
- Class detail has a "반 삭제" action.
- If the class has no history, the confirmation explains that students remain and only membership is removed.
- If the class has history, the confirmation explains that the class will be archived and records remain.

## Verification

`npm run build` completed successfully.

Recommended manual checks:

1. Create a class, assign a student, then delete it. The class should disappear and the student should remain with no active class.
2. Create a class with an assignment or schedule, then delete it. The class should be archived and visible under "비활성 반".
3. Attempt deletion for a class owned by another teacher. The API should return 404 and perform no change.
