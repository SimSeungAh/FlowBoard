export type TaskTemplateId =
  | "basic"
  | "blank"
  | "bug"
  | "test-case"
  | "design-review"
  | "requirements"
  | "security-review"
  | "release-check";

export type TestCaseTypeId =
  | "normal"
  | "exception"
  | "boundary"
  | "permission"
  | "security"
  | "recovery"
  | "integration"
  | "e2e";

export interface TaskTemplateChecklist {
  title: string;
  items: readonly string[];
}

export interface TaskTemplate {
  id: TaskTemplateId;
  name: string;
  description: string;
  helperText: string;
  descriptionTemplate: string;
  checklists: readonly TaskTemplateChecklist[];
}

export interface TestCaseType {
  id: TestCaseTypeId;
  name: string;
  helperText: string;
  titleExample: string;
  descriptionTemplate: string;
}

export const DEFAULT_TASK_TEMPLATE_ID: TaskTemplateId = "basic";
export const DEFAULT_TEST_CASE_TYPE_ID: TestCaseTypeId = "normal";

export const TEST_CASE_TYPES: readonly TestCaseType[] = [
  {
    id: "normal",
    name: "정상",
    helperText: "정상 입력과 정상 흐름 확인",
    titleExample: "예: [정상] 올바른 계정으로 로그인 성공",
    descriptionTemplate: `## 테스트 유형
- 정상 테스트

## 테스트 목적


## 사전조건
- 

## 테스트 데이터
- 정상 입력값: 

## 테스트 절차
1. 
2. 
3. 

## 예상 결과
- 

## 실제 결과
- 

## 테스트 결과
- 미실행 / PASS / FAIL / BLOCKED: 

## 우선순위
- 높음 / 보통 / 낮음: 

## 관련 이슈 / 참고
- `,
  },
  {
    id: "exception",
    name: "예외",
    helperText: "잘못된 입력과 실패 상황 확인",
    titleExample: "예: [예외] 잘못된 비밀번호 입력 시 로그인 실패",
    descriptionTemplate: `## 테스트 유형
- 예외 테스트

## 테스트 목적


## 사전조건
- 

## 예외 조건 / 테스트 데이터
- 잘못된 입력값 또는 실패 조건: 

## 테스트 절차
1. 
2. 
3. 

## 예상 결과
- 요청이 안전하게 실패한다.
- 사용자에게 적절한 오류 상태가 표시된다.

## 실제 결과
- 

## 테스트 결과
- 미실행 / PASS / FAIL / BLOCKED: 

## 우선순위
- 높음 / 보통 / 낮음: 

## 관련 이슈 / 참고
- `,
  },
  {
    id: "boundary",
    name: "경계값",
    helperText: "최소·최대·빈 값 등 경계 확인",
    titleExample: "예: [경계] 작업 제목 최대 길이 입력 처리",
    descriptionTemplate: `## 테스트 유형
- 경계값 테스트

## 테스트 목적


## 사전조건
- 

## 경계 조건
- 최소값: 
- 최대값: 
- 경계 밖 값: 
- 빈 값 / null 필요 여부: 

## 테스트 절차
1. 
2. 
3. 

## 예상 결과
- 

## 실제 결과
- 

## 테스트 결과
- 미실행 / PASS / FAIL / BLOCKED: 

## 우선순위
- 높음 / 보통 / 낮음: 

## 관련 이슈 / 참고
- `,
  },
  {
    id: "permission",
    name: "권한",
    helperText: "역할별 접근·수정 가능 범위 확인",
    titleExample: "예: [권한] VIEWER의 카드 수정 요청 차단",
    descriptionTemplate: `## 테스트 유형
- 권한 테스트

## 테스트 목적


## 사전조건
- 사용자 역할: OWNER / MEMBER / VIEWER
- 대상 보드 / 리소스: 

## 권한 조건
- 허용되어야 하는 동작: 
- 차단되어야 하는 동작: 

## 테스트 절차
1. 
2. 
3. 

## 예상 결과
- 

## 실제 결과
- 

## 테스트 결과
- 미실행 / PASS / FAIL / BLOCKED: 

## 우선순위
- 높음 / 보통 / 낮음: 

## 관련 이슈 / 참고
- `,
  },
  {
    id: "security",
    name: "보안",
    helperText: "인증·인가·입력 검증 등 보호 동작 확인",
    titleExample: "예: [보안] 만료된 토큰으로 보호 API 접근 차단",
    descriptionTemplate: `## 테스트 유형
- 보안 테스트

## 테스트 목적


## 사전조건
- 

## 점검 조건
- 인증 / 인가 / 입력 검증 / 민감정보 노출 등: 

## 테스트 절차
1. 
2. 
3. 

## 예상 보호 동작
- 

## 실제 결과
- 

## 테스트 결과
- 미실행 / PASS / FAIL / BLOCKED: 

## 위험도
- 낮음 / 보통 / 높음 / 긴급: 

## 관련 이슈 / 참고
- `,
  },
  {
    id: "recovery",
    name: "복구",
    helperText: "연결 끊김·실패 후 복구 흐름 확인",
    titleExample: "예: [복구] WebSocket 재연결 후 최신 카드 상태 복원",
    descriptionTemplate: `## 테스트 유형
- 복구 테스트

## 테스트 목적


## 사전조건
- 

## 장애 / 중단 조건
- 네트워크 끊김, 서버 재시작, 요청 실패 등: 

## 테스트 절차
1. 
2. 
3. 

## 예상 복구 결과
- 

## 실제 결과
- 

## 테스트 결과
- 미실행 / PASS / FAIL / BLOCKED: 

## 우선순위
- 높음 / 보통 / 낮음: 

## 관련 이슈 / 참고
- `,
  },
  {
    id: "integration",
    name: "통합",
    helperText: "여러 모듈·API·DB 간 연결 확인",
    titleExample: "예: [통합] 카드 생성 후 WebSocket으로 다른 화면 동기화",
    descriptionTemplate: `## 테스트 유형
- 통합 테스트

## 테스트 목적


## 연동 대상
- Frontend: 
- Backend / API: 
- DB / WebSocket / 기타: 

## 사전조건
- 

## 테스트 절차
1. 
2. 
3. 

## 예상 연동 결과
- 

## 실제 결과
- 

## 테스트 결과
- 미실행 / PASS / FAIL / BLOCKED: 

## 우선순위
- 높음 / 보통 / 낮음: 

## 관련 이슈 / 참고
- `,
  },
  {
    id: "e2e",
    name: "E2E",
    helperText: "사용자 시나리오 전체 흐름 확인",
    titleExample: "예: [E2E] 보드 생성부터 카드 완료까지 전체 흐름",
    descriptionTemplate: `## 테스트 유형
- E2E 테스트

## 사용자 시나리오


## 시작 상태
- 

## 테스트 절차
1. 
2. 
3. 
4. 
5. 

## 최종 기대 상태
- 

## 실제 결과
- 

## 테스트 결과
- 미실행 / PASS / FAIL / BLOCKED: 

## 우선순위
- 높음 / 보통 / 낮음: 

## 관련 이슈 / 참고
- `,
  },
];

export const TASK_TEMPLATES: readonly TaskTemplate[] = [
  {
    id: "basic",
    name: "기본 작업",
    description: "일반적인 개발 작업을 빠르게 정리합니다.",
    helperText: "작업 내용과 완료 조건을 중심으로 작성",
    descriptionTemplate: `## 작업 내용


## 완료 조건
- 

## 참고
- `,
    checklists: [
      {
        title: "작업 체크",
        items: ["작업 내용 확인", "완료 조건 확인"],
      },
    ],
  },
  {
    id: "blank",
    name: "빈 작업",
    description: "정해진 형식 없이 처음부터 자유롭게 작성합니다.",
    helperText: "설명과 체크리스트 없이 시작",
    descriptionTemplate: "",
    checklists: [],
  },
  {
    id: "bug",
    name: "버그",
    description: "재현 정보와 기대/실제 동작을 기록합니다.",
    helperText: "버그 수정과 재테스트에 적합",
    descriptionTemplate: `## 발생 환경
- 환경: 
- 브라우저 / OS / 기기: 
- 버전: 

## 재현 절차
1. 
2. 
3. 

## 예상 동작


## 실제 동작


## 원인 / 참고
- `,
    checklists: [
      {
        title: "버그 처리",
        items: ["원인 확인", "수정 완료", "재테스트 완료"],
      },
    ],
  },
  {
    id: "test-case",
    name: "테스트 케이스",
    description: "테스트 유형을 고르고 하나의 검증 시나리오를 기록합니다.",
    helperText: "정상·예외·경계·권한·보안·복구·통합·E2E 지원",
    descriptionTemplate: TEST_CASE_TYPES[0].descriptionTemplate,
    checklists: [],
  },
  {
    id: "design-review",
    name: "디자인 리뷰",
    description: "시안 링크와 검토 항목, 수정 요청을 정리합니다.",
    helperText: "UX/UI 검토와 피드백에 적합",
    descriptionTemplate: `## 디자인 링크
- 

## 검토 항목
- 

## 수정 요청
- 

## 참고
- `,
    checklists: [
      {
        title: "디자인 리뷰",
        items: ["검토 항목 확인", "피드백 작성", "수정 반영 확인"],
      },
    ],
  },
  {
    id: "requirements",
    name: "기획 / 요구사항",
    description: "배경과 목표, 요구사항, 완료 조건을 구조화합니다.",
    helperText: "기획 및 요구사항 정의에 적합",
    descriptionTemplate: `## 배경


## 목표


## 요구사항
- 

## 완료 조건
- 

## 참고 링크
- `,
    checklists: [
      {
        title: "요구사항 검토",
        items: ["요구사항 확인", "완료 조건 확인"],
      },
    ],
  },
  {
    id: "security-review",
    name: "보안 점검",
    description: "위험도와 영향 범위, 대응 및 재검증 내용을 기록합니다.",
    helperText: "취약점 점검과 대응 추적에 적합",
    descriptionTemplate: `## 위험도
- 낮음 / 보통 / 높음 / 긴급: 

## 영향 범위
- 

## 점검 / 재현 내용
1. 

## 대응 내용
- 

## 재검증 결과
- `,
    checklists: [
      {
        title: "보안 점검",
        items: ["점검 / 재현 완료", "대응 적용", "재검증 완료"],
      },
    ],
  },
  {
    id: "release-check",
    name: "릴리즈 체크",
    description: "배포 대상과 버전, 릴리즈 참고 내용을 정리합니다.",
    helperText: "배포 및 릴리즈 작업에 적합",
    descriptionTemplate: `## 배포 대상
- 

## 버전
- 

## 배포 참고
- 

## 결과 / 특이사항
- `,
    checklists: [
      {
        title: "릴리즈 체크",
        items: ["사전 점검", "배포 완료", "스모크 테스트", "롤백 절차 확인"],
      },
    ],
  },
];

export const getTaskTemplate = (templateId: TaskTemplateId) =>
  TASK_TEMPLATES.find((template) => template.id === templateId) ??
  TASK_TEMPLATES[0];

export const getTestCaseType = (testCaseTypeId: TestCaseTypeId) =>
  TEST_CASE_TYPES.find((testCaseType) => testCaseType.id === testCaseTypeId) ??
  TEST_CASE_TYPES[0];

export const getTaskDescriptionTemplate = (
  templateId: TaskTemplateId,
  testCaseTypeId: TestCaseTypeId = DEFAULT_TEST_CASE_TYPE_ID,
) => {
  if (templateId === "test-case") {
    return getTestCaseType(testCaseTypeId).descriptionTemplate;
  }

  return getTaskTemplate(templateId).descriptionTemplate;
};