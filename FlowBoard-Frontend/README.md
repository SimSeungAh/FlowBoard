# Frontend Template

React + TypeScript 기반 프론트엔드 템플릿입니다.  
공통 UI 컴포넌트, 라우팅, 인증 상태 관리, API 통신, 토큰 재발급, 전역 알림 처리를 미리 구성해두었습니다.

---

## 기술 스택

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- Axios
- Tailwind CSS
- React Hook Form
- Sonner

---

## 주요 기능

- 공통 레이아웃 구성
  - Header
  - Footer
  - MainLayout

- 라우팅
  - Home
  - Login
  - Signup
  - MyPage
  - NotFound

- 인증 처리
  - 회원가입
  - 로그인
  - 로그아웃
  - Access Token 저장
  - Refresh Token 저장
  - 인증 필요 페이지 보호
  - 401 응답 시 토큰 재발급

- API 통신
  - Axios 인스턴스
  - Authorization 헤더 자동 추가
  - Response Interceptor

- 공통 UI 컴포넌트
  - Button
  - Card
  - Input
  - Textarea
  - Modal
  - ConfirmDialog
  - Badge
  - Avatar
  - Tabs
  - Pagination
  - Skeleton
  - EmptyState
  - LoadingOverlay

---

## 폴더 구조

```txt
src
├─ api
│  ├─ auth.ts
│  ├─ axios.ts
│  ├─ interceptors.ts
│  ├─ queryClient.ts
│  └─ test.ts
│
├─ app
│  └─ providers.tsx
│
├─ components
│  ├─ common
│  │  └─ ErrorFallback.tsx
│  │
│  ├─ layout
│  │  ├─ Footer.tsx
│  │  ├─ Header.tsx
│  │  └─ MainLayout.tsx
│  │
│  └─ ui
│     ├─ Avatar.tsx
│     ├─ Badge.tsx
│     ├─ Button.tsx
│     ├─ Card.tsx
│     ├─ ConfirmDialog.tsx
│     ├─ EmptyState.tsx
│     ├─ Input.tsx
│     ├─ LoadingOverlay.tsx
│     ├─ Modal.tsx
│     ├─ Pagination.tsx
│     ├─ Skeleton.tsx
│     ├─ Spinner.tsx
│     ├─ Tabs.tsx
│     └─ Textarea.tsx
│
├─ pages
│  ├─ ErrorPage.tsx
│  ├─ Home
│  │  └─ HomePage.tsx
│  ├─ Login
│  │  └─ LoginPage.tsx
│  ├─ MyPage
│  │  └─ MyPage.tsx
│  ├─ NotFound
│  │  └─ NotFoundPage.tsx
│  └─ Signup
│     └─ SignupPage.tsx
│
├─ routes
│  ├─ AppRouter.tsx
│  └─ ProtectedRoute.tsx
│
├─ schemas
│  └─ authSchema.ts
│
├─ store
│  └─ authStore.ts
│
├─ styles
│  ├─ globals.css
│  └─ variables.css
│
├─ App.tsx
├─ index.css
└─ main.tsx
```

---

## 실행 방법

### 1. 패키지 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

기본 실행 주소:

```txt
http://localhost:5173
```

### 3. 빌드

```bash
npm run build
```

---

## 환경 변수

위치:

```txt
.env
```

예시:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

백엔드 API 주소가 바뀌면 이 값을 수정해야 합니다.

---

## 인증 API 연결

프론트는 아래 백엔드 API와 연결되어 있습니다.

```txt
POST /api/auth/signup   회원가입
POST /api/auth/login    로그인
POST /api/auth/logout   로그아웃
POST /api/auth/reissue  토큰 재발급
GET  /api/users/me      내 정보 조회
```

---

## 인증 흐름

```txt
사용자 로그인
  ↓
POST /api/auth/login
  ↓
Access Token, Refresh Token 발급
  ↓
localStorage 저장
  ↓
Axios 요청 시 Authorization 헤더 자동 추가
  ↓
인증 필요한 API 요청 가능
```

---

## 토큰 재발급 흐름

```txt
API 요청
  ↓
Access Token 만료
  ↓
401 응답 발생
  ↓
Refresh Token으로 /api/auth/reissue 요청
  ↓
새 Access Token, Refresh Token 저장
  ↓
기존 요청 재시도
```

---

## 라우팅 구조

```txt
/          HomePage
/login     LoginPage
/signup    SignupPage
/mypage    MyPage
*          NotFoundPage
```

`/mypage`는 로그인한 사용자만 접근할 수 있습니다.

---

## 레이아웃 구조

```txt
MainLayout
├─ Header
├─ Outlet
└─ Footer
```

`Outlet` 위치에 현재 라우트에 맞는 페이지가 렌더링됩니다.

---

## 공통 UI 컴포넌트

### Button

```tsx
<Button>Primary</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
```

### Input

```tsx
<Input label="이메일" placeholder="이메일을 입력하세요" />
```

### Textarea

```tsx
<Textarea label="내용" placeholder="내용을 입력하세요" />
```

### Badge

```tsx
<Badge>기본</Badge>
<Badge variant="success">완료</Badge>
<Badge variant="warning">대기</Badge>
<Badge variant="danger">실패</Badge>
```

### Avatar

```tsx
<Avatar name="비타" />
<Avatar name="비타" size="lg" />
```

### Pagination

```tsx
<Pagination
  page={page}
  totalPages={totalPages}
  onChange={setPage}
/>
```

### ConfirmDialog

```tsx
<ConfirmDialog
  open={open}
  title="삭제 확인"
  description="정말 삭제하시겠습니까?"
  confirmText="삭제"
  cancelText="취소"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>
```

---

## 프로젝트 시작 시 수정할 곳

새 프로젝트를 시작할 때는 아래 파일들을 먼저 수정합니다.

```txt
package.json
.env
src/pages
src/routes/AppRouter.tsx
src/components/layout/Header.tsx
src/api
src/store/authStore.ts
```

프로젝트 이름, API 주소, 라우팅, 화면 구성을 프로젝트 성격에 맞게 변경하면 됩니다.

---

## 권장 개발 순서

```txt
1. 백엔드 API 명세 확인
2. src/api에 API 함수 작성
3. pages에 화면 작성
4. components/ui 공통 컴포넌트 재사용
5. React Query 또는 Zustand로 상태 관리
6. ProtectedRoute로 인증 페이지 보호
7. 빌드 확인
```

---

## 참고

이 템플릿은 개인 프로젝트 시작 전 반복 설정을 줄이기 위해 만든 기본 구조입니다.  
프로젝트 성격에 따라 도메인 폴더, 페이지, API 모듈을 추가해서 확장하면 됩니다.
