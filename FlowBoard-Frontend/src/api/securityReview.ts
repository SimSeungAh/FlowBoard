import { api } from "@/api/axios";
import type { CardAssigneeResponse } from "@/api/cardAssignee";
import type { TagResponse } from "@/api/tag";

export type SecuritySeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type SecurityVerificationStatus = "PENDING" | "IN_PROGRESS" | "RETEST_REQUIRED" | "VERIFIED";

export interface SecurityReviewPageItem {
  id: number;

  columnId: number;
  columnTitle: string;

  createdById: number;
  createdByNickname: string;

  title: string;
  description: string | null;
  dueDate: string | null;

  securitySeverity: SecuritySeverity;
  securityImpactScope: string | null;
  securityVerificationStatus: SecurityVerificationStatus;

  assignees: CardAssigneeResponse[];
  tags: TagResponse[];

  createdAt: string;
  updatedAt: string;
}

export interface SecurityReviewPageResponse {
  content: SecurityReviewPageItem[];

  page: number;
  size: number;

  totalElements: number;
  totalPages: number;

  first: boolean;
  last: boolean;
}

export interface SecurityReviewSummaryResponse {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  pending: number;
}

export interface GetSecurityReviewsParams {
  securitySeverity?: SecuritySeverity;
  verificationStatus?: SecurityVerificationStatus;
  keyword?: string;
  page?: number;
  size?: number;
}

export interface SecurityReviewUpdateRequest {
  securitySeverity?: SecuritySeverity;
  securityImpactScope?: string;
  securityVerificationStatus?: SecurityVerificationStatus;
}

export const getSecurityReviews = async (
  boardId: number,
  params: GetSecurityReviewsParams = {},
): Promise<SecurityReviewPageResponse> => {
  const response = await api.get(`/boards/${boardId}/security-reviews`, {
    params: {
      securitySeverity: params.securitySeverity,
      verificationStatus: params.verificationStatus,
      keyword: params.keyword,
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  });

  return response.data.data;
};

export const getSecurityReviewSummary = async (
  boardId: number,
): Promise<SecurityReviewSummaryResponse> => {
  const response = await api.get(`/boards/${boardId}/security-reviews/summary`);

  return response.data.data;
};

export const updateSecurityReview = async (
  cardId: number,
  data: SecurityReviewUpdateRequest,
): Promise<void> => {
  await api.patch(`/cards/${cardId}/security-review`, data);
};
