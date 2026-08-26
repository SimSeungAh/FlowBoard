import { api } from "@/api/axios";

export type ReleaseStatus =
  | "PREPARING"
  | "READY"
  | "DEPLOYING"
  | "RELEASED"
  | "BLOCKED"
  | "ROLLED_BACK";

export type ReleaseEnvironment = "DEVELOPMENT" | "STAGING" | "PRODUCTION";
export type SmokeTestStatus = "PENDING" | "PASS" | "FAIL";

export interface ReleaseCheckResponse {
  cardId: number;
  releaseStatus: ReleaseStatus;
  targetEnvironment: ReleaseEnvironment;
  version: string | null;
  smokeTestStatus: SmokeTestStatus;
  releaseNotes: string | null;
  rollbackPlan: string | null;
  updatedAt: string;
}

export interface ReleaseCheckUpdateRequest {
  releaseStatus?: ReleaseStatus;
  targetEnvironment?: ReleaseEnvironment;
  version?: string;
  smokeTestStatus?: SmokeTestStatus;
  releaseNotes?: string;
  rollbackPlan?: string;
}

export const getReleaseCheck = async (cardId: number): Promise<ReleaseCheckResponse> => {
  const response = await api.get(`/cards/${cardId}/release-check`);
  return response.data.data;
};

export const updateReleaseCheck = async (
  cardId: number,
  data: ReleaseCheckUpdateRequest,
): Promise<ReleaseCheckResponse> => {
  const response = await api.patch(`/cards/${cardId}/release-check`, data);
  return response.data.data;
};
