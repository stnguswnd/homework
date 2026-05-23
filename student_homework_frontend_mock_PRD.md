# PRD: 학생 관리 + 숙제 관리 반응형 웹 서비스

## 1. 제품 개요

이 서비스는 영어 강사가 반, 학생, 숙제, 제출 현황을 한 곳에서 관리할 수 있는 반응형 웹 서비스다.

초기 개발 단계에서는 실제 DB와 Supabase 연동 없이 **목업 데이터 기반 프론트엔드 화면**을 먼저 구현한다. 이후 Supabase Auth, Supabase Database, Supabase Storage와 연동할 수 있도록 화면 구조와 데이터 모델을 미리 분리해 둔다.

MVP의 핵심 과제 유형은 **듣기/녹음 숙제**다. 학생은 원어민 MP3를 여러 번 듣고, 다음 화면에서 자신의 음성을 녹음한 뒤 제출한다. 제출 전까지는 여러 번 재녹음할 수 있으며, 최종 제출 시에만 나중에 Supabase Storage에 업로드되도록 설계한다.

---

## 2. 제품 목표

### 2.1 강사 목표

- 반을 생성하고 관리할 수 있다.
- 학생을 등록하고 반에 배정할 수 있다.
- 반별 숙제를 생성할 수 있다.
- 숙제별 제출 현황을 확인할 수 있다.
- 학생이 제출한 녹음 파일을 재생할 수 있다.
- 학생별 피드백을 남길 수 있다.

### 2.2 학생 목표

- 본인에게 배정된 숙제를 확인할 수 있다.
- 원어민 MP3를 반복해서 들을 수 있다.
- 지문을 보고 직접 녹음할 수 있다.
- 제출 전까지 여러 번 다시 녹음할 수 있다.
- 최종 녹음본을 제출할 수 있다.

### 2.3 개발 목표

- 먼저 목업 데이터로 전체 화면 흐름을 구현한다.
- 화면과 컴포넌트를 Supabase 연동 전에도 테스트 가능하게 만든다.
- 추후 Supabase 연동 시 최소 수정으로 연결할 수 있게 데이터 구조를 설계한다.

---

## 3. MVP 범위

### 3.1 포함 기능

| 영역 | 기능 |
|---|---|
| 공통 | 반응형 레이아웃 |
| 공통 | 목업 데이터 기반 라우팅 |
| 강사 | 대시보드 |
| 강사 | 반 목록 화면 |
| 강사 | 반 상세 화면 |
| 강사 | 학생 목록 화면 |
| 강사 | 학생 등록 목업 UI |
| 강사 | 숙제 목록 화면 |
| 강사 | 숙제 생성 화면 |
| 강사 | 듣기/녹음 과제 생성 UI |
| 강사 | 제출 현황 화면 |
| 강사 | 학생 녹음 재생 목업 |
| 강사 | 피드백 작성 UI |
| 학생 | 학생용 숙제 목록 화면 |
| 학생 | 듣기 페이지 |
| 학생 | 녹음 페이지 |
| 학생 | 녹음 미리듣기 |
| 학생 | 재녹음 |
| 학생 | 제출 완료 화면 |

---

### 3.2 제외 기능

초기 프론트 목업 단계에서는 아래 기능을 제외한다.

| 제외 기능 | 이유 |
|---|---|
| 실제 로그인 | 화면 우선 구현 |
| Supabase Auth | 후순위 연동 |
| Supabase DB CRUD | 목업 데이터로 대체 |
| Supabase Storage 업로드 | 제출 플로우만 UI로 구현 |
| 실제 파일 영구 저장 | 브라우저 Blob까지만 처리 |
| AI 발음 평가 | MVP 제외 |
| 자동 채점 | MVP 제외 |
| 카카오톡 알림 | 후순위 |
| 결제 기능 | 범위 외 |
| 학부모 계정 | 후순위 |

---

## 4. 사용자 유형

### 4.1 강사

강사는 웹 대시보드에서 반, 학생, 숙제, 제출 현황을 관리한다.

주요 작업:

1. 반 생성
2. 학생 등록
3. 반에 학생 배정
4. 듣기/녹음 숙제 생성
5. 숙제 제출 현황 확인
6. 녹음 파일 재생
7. 피드백 작성

---

### 4.2 학생

학생은 모바일 또는 PC에서 숙제를 수행한다.

주요 작업:

1. 숙제 목록 확인
2. 숙제 상세 진입
3. 원어민 MP3 듣기
4. 녹음하기
5. 미리듣기
6. 다시 녹음
7. 제출하기

---

## 5. 핵심 사용자 플로우

## 5.1 강사 플로우

```text
강사 대시보드 진입
→ 반 목록 확인
→ 반 상세 진입
→ 학생 목록 확인
→ 숙제 생성
→ 듣기/녹음 문항 작성
→ 원어민 MP3 등록 UI 확인
→ 숙제 배정
→ 제출 현황 확인
→ 학생 녹음 재생
→ 피드백 작성
```

---

## 5.2 학생 플로우

```text
학생 숙제 목록 진입
→ 숙제 선택
→ 듣기 페이지
→ START 버튼 클릭
→ MP3 반복 청취
→ 다음 버튼 클릭
→ 녹음 페이지
→ 녹음 시작
→ 녹음 종료
→ 미리듣기
→ 다시 녹음 또는 제출
→ 제출 완료
```

---

## 6. 화면 목록

## 6.1 강사용 화면

| 경로 | 화면 | 설명 |
|---|---|---|
| `/teacher/dashboard` | 강사 대시보드 | 전체 현황 요약 |
| `/teacher/classes` | 반 목록 | 반 조회/생성 |
| `/teacher/classes/:classId` | 반 상세 | 반 학생/숙제 확인 |
| `/teacher/students` | 학생 목록 | 학생 조회/등록 |
| `/teacher/assignments` | 숙제 목록 | 숙제 조회 |
| `/teacher/assignments/new` | 숙제 생성 | 듣기/녹음 숙제 생성 |
| `/teacher/assignments/:assignmentId` | 숙제 상세 | 숙제 정보 확인 |
| `/teacher/assignments/:assignmentId/submissions` | 제출 현황 | 제출/미제출 확인 |
| `/teacher/submissions/:submissionId` | 제출 상세 | 녹음 재생/피드백 |

---

## 6.2 학생용 화면

| 경로 | 화면 | 설명 |
|---|---|---|
| `/student` | 학생 진입 | access code 입력 또는 목업 학생 선택 |
| `/student/home` | 학생 홈 | 배정된 숙제 목록 |
| `/student/assignments/:assignmentId` | 숙제 상세 | 숙제 안내 |
| `/student/assignments/:assignmentId/listen` | 듣기 페이지 | MP3 반복 청취 |
| `/student/assignments/:assignmentId/record` | 녹음 페이지 | 녹음/미리듣기/제출 |
| `/student/assignments/:assignmentId/complete` | 제출 완료 | 제출 완료 안내 |

---

## 7. 화면별 상세 요구사항

## 7.1 강사 대시보드

### 목적

강사가 전체 운영 현황을 빠르게 파악한다.

### 표시 정보

- 총 반 수
- 총 학생 수
- 진행 중 숙제 수
- 오늘 마감 숙제 수
- 미제출 학생 수
- 최근 제출 목록

### UI 요소

- 요약 카드
- 최근 제출 테이블
- 빠른 이동 버튼
  - 반 관리
  - 학생 관리
  - 숙제 만들기
  - 제출 현황 보기

---

## 7.2 반 목록 화면

### 목적

강사가 운영 중인 반을 확인하고 새 반을 만들 수 있다.

### UI 요소

- 반 카드 목록
- 반 이름
- 학생 수
- 진행 중 숙제 수
- 상태: active / archived
- 새 반 만들기 버튼

---

## 7.3 반 상세 화면

### 목적

특정 반의 학생과 숙제를 관리한다.

### UI 요소

- 반 이름
- 반 설명
- 학생 목록
- 숙제 목록
- 학생 추가 버튼
- 숙제 만들기 버튼

---

## 7.4 학생 목록 화면

### 목적

강사가 등록된 학생을 확인하고 관리한다.

### UI 요소

- 학생 검색
- 학생 상태 필터
- 학생 테이블
  - 이름
  - 소속 반
  - access code
  - 최근 제출일
  - 상태
- 학생 등록 버튼

---

## 7.5 숙제 생성 화면

### 목적

강사가 듣기/녹음 숙제를 생성한다.

### 입력 항목

| 필드 | 설명 |
|---|---|
| 숙제 제목 | 예: Discovery Unit 1 Speaking Homework |
| 대상 반 | 숙제를 배정할 반 |
| 마감일 | 선택 |
| 설명 | 학생에게 보여줄 안내 |
| 지문 제목 | 문항 제목 |
| 지문 내용 | 학생이 읽을 문장/문단 |
| 원어민 MP3 | 파일 업로드 UI |
| 최소 녹음 시간 | 기본 3초 |
| 최대 녹음 시간 | 기본 120초 |

### 목업 단계 처리

- 실제 DB 저장 대신 mockAssignments 배열에 추가된 것처럼 화면 전환한다.
- MP3 업로드는 실제 저장하지 않고 파일명만 표시한다.
- 저장 버튼 클릭 시 숙제 목록 또는 숙제 상세로 이동한다.

---

## 7.6 제출 현황 화면

### 목적

강사가 숙제별 제출/미제출 학생을 확인한다.

### UI 요소

- 숙제 제목
- 제출률 카드
- 전체 학생 수
- 제출 학생 수
- 미제출 학생 수
- 상태 필터: 전체 / 제출 / 미제출 / 검토 완료
- 제출 현황 테이블
  - 학생명
  - 제출 상태
  - 제출 시간
  - 녹음 재생 버튼
  - 피드백 상태

---

## 7.7 학생 듣기 페이지

### 목적

학생이 원어민 MP3를 반복해서 듣는다.

### UI 요소

- 숙제 제목
- 진행 단계: `1 / 2 듣기`
- 지문 카드
- START 버튼
- 재생 상태
- 다시 듣기 버튼
- 다음 버튼

### 동작

```text
START 클릭
→ MP3 재생
→ 재생 중 버튼 상태 Playing
→ 재생 완료 후 다시 듣기 가능
→ 다음 클릭 시 녹음 페이지 이동
```

---

## 7.8 학생 녹음 페이지

### 목적

학생이 지문을 보고 음성을 녹음한다.

### UI 요소

- 숙제 제목
- 진행 단계: `2 / 2 녹음`
- 지문 카드
- 녹음 시작 버튼
- 녹음 종료 버튼
- 녹음 시간 표시
- 미리듣기 오디오 플레이어
- 다시 녹음 버튼
- 제출 버튼

### 핵심 정책

```text
제출 전에는 서버 업로드 없음
녹음 데이터는 브라우저 Blob으로만 관리
재녹음 시 기존 Blob URL 해제
최종 제출 클릭 시 나중에 서버/Supabase로 전송 예정
```

---

## 7.9 제출 완료 화면

### 목적

학생이 제출 완료 상태를 확인한다.

### UI 요소

- 제출 완료 메시지
- 제출 시간
- 숙제 목록으로 이동 버튼
- 다음 숙제 이동 버튼

---

## 8. 목업 데이터 요구사항

초기 프론트 개발에서는 다음 목업 데이터를 사용한다.

### 8.1 Teacher

```ts
type Teacher = {
  id: string;
  email: string;
  displayName: string;
  role: 'teacher' | 'admin';
};
```

### 8.2 Class

```ts
type Class = {
  id: string;
  teacherId: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  studentCount: number;
  activeAssignmentCount: number;
};
```

### 8.3 Student

```ts
type Student = {
  id: string;
  teacherId: string;
  name: string;
  accessCode: string;
  classIds: string[];
  status: 'active' | 'inactive';
  memo?: string;
};
```

### 8.4 Assignment

```ts
type Assignment = {
  id: string;
  teacherId: string;
  classId: string;
  title: string;
  description?: string;
  assignmentType: 'listening_recording' | 'writing' | 'quiz';
  dueAt?: string;
  status: 'draft' | 'published' | 'closed' | 'archived';
  items: AssignmentItem[];
};
```

### 8.5 AssignmentItem

```ts
type AssignmentItem = {
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

### 8.6 Submission

```ts
type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  status: 'not_submitted' | 'submitted' | 'reviewed' | 'returned';
  submittedAt?: string;
  items: SubmissionItem[];
  teacherComment?: string;
};
```

### 8.7 SubmissionItem

```ts
type SubmissionItem = {
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

## 9. 반응형 요구사항

### 9.1 데스크톱

- 좌측 사이드바 + 우측 콘텐츠 구조
- 테이블 중심 대시보드
- 카드형 요약 정보
- 넓은 화면에서는 2~3열 카드 배치

### 9.2 태블릿

- 사이드바 축소 또는 상단 메뉴화
- 카드 2열 배치
- 테이블은 가로 스크롤 허용

### 9.3 모바일

- 하단 또는 상단 네비게이션
- 단일 컬럼 레이아웃
- 버튼은 크게 배치
- 학생 녹음 화면은 모바일 최적화
- 지문 글자 크기 최소 18px 권장

---

## 10. 성공 기준

초기 프론트 목업 단계의 성공 기준은 다음과 같다.

| 기준 | 설명 |
|---|---|
| 전체 화면 이동 가능 | 강사/학생 주요 플로우가 끊기지 않아야 함 |
| 목업 데이터 렌더링 | 실제 DB 없이도 목록/상세/제출 현황 표시 |
| 녹음 기능 동작 | 브라우저에서 녹음, 미리듣기, 재녹음 가능 |
| 제출 플로우 표현 | 실제 저장 없이 제출 완료 화면까지 이동 |
| 반응형 대응 | 모바일에서 학생 숙제 수행 가능 |
| 추후 연동 가능 | mock API를 Supabase API로 교체하기 쉬운 구조 |

---

## 11. 향후 Supabase 연동 방향

프론트 목업 완료 후 다음 단계에서 Supabase와 연결한다.

연동 예정 항목:

1. Supabase Auth 또는 자체 Auth
2. classes CRUD
3. students CRUD
4. assignments CRUD
5. assignment_items CRUD
6. assignment_targets 생성
7. student-recordings Storage 업로드
8. submissions 저장
9. submission_items 저장
10. teacher_feedback 저장

초기 화면 설계 시 데이터 접근은 `mockRepository` 또는 `apiRepository` 형태로 추상화하여, 나중에 Supabase Repository로 교체할 수 있게 한다.
