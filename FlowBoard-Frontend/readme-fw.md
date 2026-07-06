# 🚀 Frontend Template

React + TypeScript + Vite 기반의 프론트엔드 스타터 템플릿입니다.

프로젝트를 시작할 때 반복되는 초기 설정을 줄이고, 핵심 기능 개발에 바로 집중할 수 있도록 공통 구조와 UI 컴포넌트를 미리 구성했습니다.

---

## ✨ Tech Stack

| Category           | Technology                     |
| ------------------ | ------------------------------ |
| Framework          | React 19                       |
| Language           | TypeScript                     |
| Build Tool         | Vite                           |
| Styling            | Tailwind CSS v4                |
| Routing            | React Router v7 (Data Router)  |
| Server State       | TanStack Query                 |
| Global State       | Zustand                        |
| HTTP Client        | Axios                          |
| Component Variants | Class Variance Authority (CVA) |
| Notification       | Sonner                         |
| Code Quality       | ESLint + Prettier              |

---

# 📦 Included Features

## Routing

- ✅ createBrowserRouter
- ✅ RouterProvider
- ✅ ProtectedRoute
- ✅ ErrorPage
- ✅ NotFoundPage

---

## UI Components

- Button
- Input
- Card
- Modal
- Skeleton
- EmptyState
- Pagination
- LoadingOverlay

---

## API

- Axios Instance
- Axios Interceptor
- React Query
- QueryClient Provider

---

## Utility

- cn()
- Environment Variables
- ErrorBoundary

---

# 📁 Folder Structure

```text
src
│
├── api
│   ├── axios.ts
│   └── queryClient.ts
│
├── app
│   ├── providers.tsx
│   └── ErrorFallback.tsx
│
├── assets
│
├── components
│   ├── layout
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── MainLayout.tsx
│   │
│   └── ui
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── EmptyState.tsx
│       ├── Input.tsx
│       ├── LoadingOverlay.tsx
│       ├── Modal.tsx
│       ├── Pagination.tsx
│       └── Skeleton.tsx
│
├── hooks
│
├── pages
│   ├── Home
│   ├── Login
│   ├── MyPage
│   ├── NotFound
│   └── ErrorPage.tsx
│
├── routes
│   ├── AppRouter.tsx
│   └── ProtectedRoute.tsx
│
├── stores
├── types
├── utils
│
├── App.tsx
└── main.tsx
```

---

# 🚀 Getting Started

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Auto Fix

```bash
npm run lint:fix
```

## Format

```bash
npm run format
```

---

# 🌐 Environment Variables

`.env`

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

`.env.example`

```env
VITE_API_BASE_URL=
```

---

# 🍞 Toast

```tsx
import { toast } from "sonner";

toast.success("성공");
toast.error("실패");
toast.info("안내");
toast.warning("주의");
```

---

# 🌐 Axios

```ts
import { api } from "@/api/axios";

const { data } = await api.get("/users");
```

---

# 🔄 React Query

```tsx
const { data, isPending } = useQuery({
  queryKey: ["users"],
  queryFn: getUsers,
});
```

---

# 🗂 Zustand

```tsx
const user = useUserStore((state) => state.user);
```

---

# 🎨 UI Components

```tsx
<Button />
<Input />
<Card />
<Modal />
<Skeleton />
<EmptyState />
<Pagination />
<LoadingOverlay />
```

---

# 📌 Why this template?

이 템플릿은 프로젝트마다 반복되는 작업을 최소화하기 위해 제작되었습니다.

매번 설치해야 하는 라이브러리와 공통 컴포넌트를 미리 구성하여 새로운 프로젝트를 빠르게 시작할 수 있습니다.

사용 예정 프로젝트 예시

- 📋 FlowBoard
- ♻️ SmartRecycle
- 🍱 혼밥ON
- 🛒 Shopping Mall
- 🤖 AI Service
- 📊 Dashboard
- 💬 Community
- 💼 Portfolio

---

# 🔮 Planned Features

- React Query Devtools
- Theme Provider (Dark Mode)
- GitHub Actions
- Husky
- lint-staged
- Storybook

---

# 📄 License

MIT License
