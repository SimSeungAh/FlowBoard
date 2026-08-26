import { api } from "@/api/axios";

export type RequirementPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type RequirementApprovalStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED";

export interface RequirementResponse {
  cardId: number;
  title: string;
  priority: RequirementPriority;
  approvalStatus: RequirementApprovalStatus;
  source: string | null;
  targetVersion: string | null;
  acceptanceCriteria: string | null;
  updatedAt: string | null;
}

export interface RequirementUpdateRequest {
  priority?: RequirementPriority;
  approvalStatus?: RequirementApprovalStatus;
  source?: string;
  targetVersion?: string;
  acceptanceCriteria?: string;
}

export async function getRequirement(cardId: number): Promise<RequirementResponse> {
  const response = await api.get(`/cards/${cardId}/requirement`);
  return response.data.data;
}

export async function updateRequirement(
  cardId: number,
  data: RequirementUpdateRequest,
): Promise<RequirementResponse> {
  const response = await api.patch(`/cards/${cardId}/requirement`, data);
  return response.data.data;
}
