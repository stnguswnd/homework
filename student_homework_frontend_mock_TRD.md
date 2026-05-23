# TRD: 목업 기반 프론트엔드 우선 구현 기술 요구사항

## 1. 문서 목적

이 문서는 학생 관리 + 숙제 관리 반응형 웹 서비스를 **Supabase 연동 전에 목업 데이터 기반 프론트엔드로 먼저 구현**하기 위한 기술 요구사항을 정의한다.

초기 목표는 실제 DB, Auth, Storage 없이도 강사와 학생의 핵심 화면 흐름을 확인할 수 있는 프론트엔드 MVP를 만드는 것이다. 이후 Supabase와 연동할 때 구조를 크게 변경하지 않도록 데이터 타입, 라우팅, 컴포넌트, Repository 구조를 미리 분리한다.

---

## 2. 기술 스택

| 영역 | 기술 |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | React useState/useReducer, 필요 시 Zustand |
| Form | React Hook Form 선택 가능 |
| Mock Data | TypeScript mock module |
| Audio Playback | HTMLAudioElement |
| Audio Recording | MediaRecorder API |
| File Preview | URL.createObjectURL |
| Future Backend | Supabase Auth, DB, Storage |
| Deployment | Vercel 또는 로컬 개발 |

---

## 3. 개발 원칙

### 3.1 프론트 우선

- 실제 DB 연동 없이 화면을 먼저 완성한다.
- 모든 데이터는 `/src/mocks` 또는 `/src/features/*/mock`에서 관리한다.
- 버튼 클릭 시 실제 저장 대신 mock 상태 변경 또는 화면 이동으로 처리한다.

### 3.2 Supabase 연동 대비

- 화면 컴포넌트에서 Supabase SDK를 직접 호출하지 않는다.
- 데이터 접근은 Repository 계층으로 분리한다.
- 목업 단계에서는 `mockRepository`를 사용한다.
- 이후 Supabase 연동 시 `supabaseRepository`로 교체한다.

### 3.3 녹음 처리 정책

- 제출 전에는 서버 업로드를 하지 않는다.
- 녹음 파일은 브라우저 Blob으로만 관리한다.
- 미리듣기는 `URL.createObjectURL(blob)`로 처리한다.
- 재녹음 시 기존 URL은 `URL.revokeObjectURL(url)`로 해제한다.
- 제출 버튼 클릭 시 현재는 mock submit 처리만 수행한다.
- 나중에 Supabase Storage 업로드 로직으로 교체한다.

---

## 4. 권장 프로젝트 구조

```text
src/
  app/
    teacher/
      dashboard/
        page.tsx
      classes/
        page.tsx
        [classId]/
          page.tsx
      students/
        page.tsx
      assignments/
        page.tsx
        new/
          page.tsx
        [assignmentId]/
          page.tsx
          submissions/
            page.tsx
      submissions/
        [submissionId]/
          page.tsx

    student/
      page.tsx
      home/
        page.tsx
      assignments/
        [assignmentId]/
          page.tsx
          listen/
            page.tsx
          record/
            page.tsx
          complete/
            page.tsx

  components/
    layout/
      TeacherLayout.tsx
      StudentLayout.tsx
      Sidebar.tsx
      MobileHeader.tsx
    ui/
      Button.tsx
      Card.tsx
      Badge.tsx
      Input.tsx
      Textarea.tsx
      Select.tsx
      AudioPlayer.tsx
      ProgressStep.tsx
      EmptyState.tsx

  features/
    teacher/
      components/
      repositories/
    student/
      components/
      repositories/
    assignments/
      components/
      repositories/
    recording/
      components/
      hooks/

  hooks/
    useAudioPlayer.ts
    useAudioRecorder.ts

  lib/
    routes.ts
    utils.ts
    format.ts

  mocks/
    mockTeachers.ts
    mockClasses.ts
    mockStudents.ts
    mockAssignments.ts
    mockSubmissions.ts
    mockRepository.ts

  types/
    teacher.ts
    class.ts
    student.ts
    assignment.ts
    submission.ts
```

---

## 5. 라우팅 설계

## 5.1 강사 라우트

| 경로 | 역할 |
|---|---|
| `/teacher/dashboard` | 강사 대시보드 |
| `/teacher/classes` | 반 목록 |
| `/teacher/classes/[classId]` | 반 상세 |
| `/teacher/students` | 학생 목록 |
| `/teacher/assignments` | 숙제 목록 |
| `/teacher/assignments/new` | 숙제 생성 |
| `/teacher/assignments/[assignmentId]` | 숙제 상세 |
| `/teacher/assignments/[assignmentId]/submissions` | 제출 현황 |
| `/teacher/submissions/[submissionId]` | 제출 상세/피드백 |

---

## 5.2 학생 라우트

| 경로 | 역할 |
|---|---|
| `/student` | 학생 진입/access code 입력 |
| `/student/home` | 학생 숙제 목록 |
| `/student/assignments/[assignmentId]` | 숙제 상세 |
| `/student/assignments/[assignmentId]/listen` | 듣기 페이지 |
| `/student/assignments/[assignmentId]/record` | 녹음 페이지 |
| `/student/assignments/[assignmentId]/complete` | 제출 완료 |

목업 단계에서는 access code 검증을 실제로 하지 않고, 기본 mock student를 사용한다.

---

## 6. 데이터 타입 설계

## 6.1 Teacher

```ts
export type Teacher = {
  id: string;
  email: string;
  displayName: string;
  role: 'teacher' | 'admin';
  createdAt: string;
};
```

---

## 6.2 Class

```ts
export type Class = {
  id: string;
  teacherId: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  studentCount: number;
  activeAssignmentCount: number;
  createdAt: string;
};
```

---

## 6.3 Student

```ts
export type Student = {
  id: string;
  teacherId: string;
  name: string;
  accessCode: string;
  classIds: string[];
  status: 'active' | 'inactive';
  memo?: string;
  createdAt: string;
};
```

---

## 6.4 Assignment

```ts
export type Assignment = {
  id: string;
  teacherId: string;
  classId: string;
  title: string;
  description?: string;
  assignmentType: 'listening_recording' | 'writing' | 'quiz';
  dueAt?: string;
  status: 'draft' | 'published' | 'closed' | 'archived';
  items: AssignmentItem[];
  createdAt: string;
};
```

---

## 6.5 AssignmentItem

```ts
export type AssignmentItem = {
  id: string;
  assignmentId: string;
  itemType: 'listening_recording' | 'writing_prompt' | 'quiz_question';
  title?: string;
  passageText: string;
  audioUrl?: string;
  audioFileName?: string;
  orderIndex: number;
  minRecordingSec: number;
  maxRecordingSec: number;
};
```

---

## 6.6 Submission

```ts
export type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  status: 'not_submitted' | 'submitted' | 'reviewed' | 'returned';
  submittedAt?: string;
  items: SubmissionItem[];
  teacherComment?: string;
  reviewedAt?: string;
};
```

---

## 6.7 SubmissionItem

```ts
export type SubmissionItem = {
  id: string;
  submissionId: string;
  assignmentItemId: string;
  recordingUrl?: string;
  recordingFileName?: string;
  recordingMimeType?: string;
  recordingDurationSec?: number;
  fileSizeBytes?: number;
};
```

---

## 7. Mock Repository 설계

화면 컴포넌트가 mock 데이터에 직접 접근하지 않도록 Repository 함수를 둔다.

```ts
export const mockRepository = {
  getTeacherDashboardSummary,
  getClasses,
  getClassById,
  getStudents,
  getAssignments,
  getAssignmentById,
  getSubmissionsByAssignmentId,
  getStudentByAccessCode,
  getStudentAssignments,
  mockSubmitRecording,
};
```

향후 Supabase 연동 시 같은 함수 이름으로 `supabaseRepository`를 구현한다.

---

## 8. 녹음 기능 기술 명세

## 8.1 useAudioRecorder Hook

### 역할

브라우저 MediaRecorder API를 감싸서 녹음 상태, 녹음 Blob, 미리듣기 URL을 관리한다.

### 반환값

```ts
type UseAudioRecorderReturn = {
  state: 'idle' | 'requesting_permission' | 'recording' | 'recorded' | 'error';
  recordingBlob: Blob | null;
  previewUrl: string | null;
  durationSec: number;
  errorMessage: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
};
```

### 동작

```text
startRecording
→ getUserMedia({ audio: true })
→ MediaRecorder 생성
→ chunks 수집
→ state = recording

stopRecording
→ MediaRecorder stop
→ Blob 생성
→ previewUrl 생성
→ state = recorded

resetRecording
→ 기존 previewUrl revoke
→ Blob null 처리
→ state = idle
```

---

## 8.2 브라우저 호환성 처리

지원 MIME 타입 우선순위:

```ts
const MIME_TYPE_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
];
```

`MediaRecorder.isTypeSupported()`로 지원 여부를 확인한다.

---

## 8.3 예외 처리

| 상황 | 처리 |
|---|---|
| 마이크 권한 거부 | 안내 메시지 표시 |
| MediaRecorder 미지원 | 브라우저 변경 안내 |
| 녹음 시간이 너무 짧음 | 제출 버튼 비활성 또는 경고 |
| 녹음 중 페이지 이동 | 경고 또는 녹음 중지 |
| 재녹음 | 기존 previewUrl revoke |

---

## 9. 듣기 기능 기술 명세

## 9.1 useAudioPlayer Hook

### 역할

MP3 재생 상태를 관리한다.

### 반환값

```ts
type UseAudioPlayerReturn = {
  state: 'idle' | 'playing' | 'paused' | 'ended' | 'error';
  currentTime: number;
  duration: number;
  play: () => Promise<void>;
  pause: () => void;
  replay: () => Promise<void>;
};
```

### 동작

```text
START 클릭
→ audio.play()
→ state = playing
→ ended 이벤트 발생
→ state = ended
→ 다시 듣기 가능
```

---

## 10. 주요 컴포넌트 설계

## 10.1 TeacherLayout

- 사이드바
- 상단 헤더
- 모바일 메뉴
- 콘텐츠 영역

## 10.2 StudentLayout

- 모바일 중심 상단 헤더
- 진행 상태 표시
- 하단 액션 버튼 영역

## 10.3 AssignmentCard

- 숙제 제목
- 마감일
- 상태
- 대상 반
- 제출률

## 10.4 SubmissionStatusTable

- 학생명
- 제출 상태
- 제출 시간
- 재생 버튼
- 피드백 상태

## 10.5 ListeningStep

- 지문 카드
- START 버튼
- 오디오 재생 상태
- 다시 듣기
- 다음 버튼

## 10.6 RecordingStep

- 지문 카드
- 녹음 시작/종료
- 녹음 시간
- 미리듣기
- 다시 녹음
- 제출 버튼

---

## 11. 상태 관리

초기 목업 단계에서는 전역 상태를 최소화한다.

### Local State 사용

- 폼 입력값
- 녹음 상태
- 오디오 재생 상태
- 필터 상태
- 모달 열림/닫힘

### Mock Repository 사용

- 목록 데이터
- 상세 데이터
- 제출 현황 데이터

### 필요 시 Zustand 사용

다음 경우에만 사용한다.

- 학생 선택 상태를 여러 페이지에서 공유
- 목업 제출 상태를 페이지 간 유지
- 강사 로그인 상태 목업 유지

---

## 12. 제출 플로우 기술 설계

목업 단계 제출 흐름:

```text
녹음 완료
→ recordingBlob 존재 확인
→ mockSubmitRecording 호출
→ 500ms loading 표시
→ complete 페이지 이동
```

추후 Supabase 연동 시 변경될 부분:

```text
recordingBlob
→ FormData 생성
→ /api/student/submissions 호출
→ 서버에서 Supabase Storage 업로드
→ submissions DB 저장
→ complete 페이지 이동
```

목업 단계에서도 이 흐름과 유사하게 함수명을 만든다.

```ts
async function submitRecording(input: {
  assignmentId: string;
  itemId: string;
  studentId: string;
  blob: Blob;
  durationSec: number;
}): Promise<{ submissionId: string }>;
```

---

## 13. 향후 Supabase 연동 포인트

프론트 목업 완료 후 다음 파일들을 교체 또는 확장한다.

| 현재 | 향후 |
|---|---|
| `mockRepository.ts` | `supabaseRepository.ts` |
| mock students | Supabase `students` table |
| mock assignments | Supabase `assignments`, `assignment_items` |
| mock submissions | Supabase `submissions`, `submission_items` |
| mock submit | `/api/student/submissions` |
| mock audio URL | Supabase Storage signed/public URL |
| mock teacher | Supabase Auth user |

---

## 14. 보안 고려사항

목업 단계에서는 실제 보안 처리를 하지 않지만, 구조상 아래 원칙을 지킨다.

- 학생 녹음 파일은 public URL로 다루지 않는 것을 전제로 설계한다.
- 학생 제출은 서버 API를 통해 처리하는 구조를 유지한다.
- 화면 컴포넌트에서 DB/Storage에 직접 쓰는 코드를 만들지 않는다.
- 나중에 Supabase service role key는 서버에서만 사용한다.
- 학생 access code는 클라이언트에서 영구 저장하지 않는 방향으로 설계한다.

---

## 15. UI 스타일 가이드

### 15.1 톤

- 초등학생도 이해하기 쉬운 문구
- 강사용 화면은 관리 도구처럼 명확하게
- 학생용 화면은 버튼 크고 단순하게

### 15.2 색상 의미

| 색상 | 의미 |
|---|---|
| 파랑 | 주요 액션 |
| 초록 | 제출 완료 |
| 노랑 | 마감 임박 |
| 빨강 | 미제출/오류 |
| 회색 | 비활성/보조 정보 |

### 15.3 버튼 문구

학생용:

- START
- 다시 듣기
- 다음
- 녹음 시작
- 녹음 종료
- 내 녹음 듣기
- 다시 녹음
- 제출하기

강사용:

- 반 만들기
- 학생 추가
- 숙제 만들기
- 제출 현황 보기
- 피드백 작성

---

## 16. 개발 단계

## 16.1 1단계: 문서 및 타입 정의

- PRD 작성
- TRD 작성
- TypeScript 타입 정의
- Mock 데이터 생성

## 16.2 2단계: 레이아웃 구현

- TeacherLayout
- StudentLayout
- 공통 UI 컴포넌트
- 반응형 구조

## 16.3 3단계: 강사 화면 구현

- 대시보드
- 반 목록
- 반 상세
- 학생 목록
- 숙제 목록
- 숙제 생성
- 제출 현황

## 16.4 4단계: 학생 화면 구현

- 학생 진입
- 숙제 목록
- 듣기 페이지
- 녹음 페이지
- 제출 완료

## 16.5 5단계: 녹음 기능 구현

- useAudioRecorder
- 미리듣기
- 재녹음
- mock 제출

## 16.6 6단계: Supabase 연동 준비

- Repository 인터페이스 정리
- API endpoint 설계
- Supabase 테이블 설계 반영
- Storage 업로드 로직 추가 준비

---

## 17. Codex 작업 지시 기준

Codex에게는 한 번에 전체를 구현시키지 않고 단계별로 지시한다.

### 첫 번째 지시

```text
PRD.md와 TRD.md를 기준으로 프로젝트 타입과 mock 데이터를 먼저 만들어줘.
아직 Supabase 연동은 하지 마.
```

### 두 번째 지시

```text
TeacherLayout, StudentLayout, 공통 UI 컴포넌트를 먼저 구현해줘.
아직 실제 페이지 기능은 만들지 마.
```

### 세 번째 지시

```text
mockRepository를 사용해서 강사 대시보드, 반 목록, 학생 목록, 숙제 목록을 구현해줘.
```

### 네 번째 지시

```text
학생 듣기/녹음 화면을 구현해줘.
MediaRecorder API로 녹음하고, 제출 전에는 Blob으로만 관리해줘.
```

---

## 18. 완료 기준

프론트 목업 MVP는 아래 기준을 만족하면 완료로 본다.

- 강사 주요 화면이 모두 이동 가능하다.
- 학생 주요 화면이 모두 이동 가능하다.
- 목업 데이터가 정상 렌더링된다.
- 듣기 페이지에서 MP3 재생 UI가 동작한다.
- 녹음 페이지에서 녹음, 미리듣기, 재녹음이 동작한다.
- 제출 버튼 클릭 시 제출 완료 화면으로 이동한다.
- 모바일 화면에서 학생 플로우가 자연스럽다.
- Supabase 연동을 위한 Repository 구조가 분리되어 있다.
