import { api } from "@/api/axios";

export type DesignReviewStatus = "PENDING" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED";

export interface DesignReviewResponse {
  cardId: number;
  title: string;
  reviewStatus: DesignReviewStatus;
  designUrl: string | null;
  reviewScope: string | null;
  updatedAt: string | null;
}

export interface DesignReviewUpdateRequest {
  reviewStatus?: DesignReviewStatus;
  designUrl?: string;
  reviewScope?: string;
}

export async function getDesignReview(cardId: number): Promise<DesignReviewResponse> {
  const response = await api.get(`/cards/${cardId}/design-review`);
  return response.data.data;
}

export async function updateDesignReview(
  cardId: number,
  data: DesignReviewUpdateRequest,
): Promise<DesignReviewResponse> {
  const response = await api.patch(`/cards/${cardId}/design-review`, data);
  return response.data.data;
}
