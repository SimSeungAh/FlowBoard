import type { CardTaskType, TestCaseType } from "@/api/card";

import type { TaskTemplateId, TestCaseTypeId } from "@/features/card/taskTemplates";

/**
 * 프론트에서 사용하는 작업 템플릿 ID를
 * 백엔드 CardTaskType으로 변환합니다.
 *
 * 기본 작업과 빈 작업은 모두 GENERAL입니다.
 */
const TASK_TYPE_BY_TEMPLATE: Record<TaskTemplateId, CardTaskType> = {
  basic: "GENERAL",
  blank: "GENERAL",
  bug: "BUG",
  "test-case": "TEST_CASE",
  "design-review": "DESIGN_REVIEW",
  requirements: "REQUIREMENT",
  "security-review": "SECURITY_REVIEW",
  "release-check": "RELEASE_CHECK",
};

/**
 * 프론트 테스트 유형 ID를
 * 백엔드 TestCaseType Enum 값으로 변환합니다.
 */
const API_TEST_CASE_TYPE_BY_ID: Record<TestCaseTypeId, TestCaseType> = {
  normal: "NORMAL",
  exception: "EXCEPTION",
  boundary: "BOUNDARY",
  permission: "PERMISSION",
  security: "SECURITY",
  recovery: "RECOVERY",
  integration: "INTEGRATION",
  e2e: "E2E",
};

export const getCardTaskType = (templateId: TaskTemplateId): CardTaskType => {
  return TASK_TYPE_BY_TEMPLATE[templateId];
};

export const getApiTestCaseType = (testCaseTypeId: TestCaseTypeId): TestCaseType => {
  return API_TEST_CASE_TYPE_BY_ID[testCaseTypeId];
};
