import { addCardAssignee } from "@/api/cardAssignee";
import { addTagToCard } from "@/api/tag";

export interface TaskCreationRelationsResult {
  assigneeFailureCount: number;
  tagFailureCount: number;
}

export const applyTaskCreationRelations = async (
  cardId: number,
  assigneeUserIds: readonly number[],
  tagIds: readonly number[],
): Promise<TaskCreationRelationsResult> => {
  let assigneeFailureCount = 0;
  let tagFailureCount = 0;

  for (const userId of assigneeUserIds) {
    try {
      await addCardAssignee(cardId, {
        userId,
      });
    } catch {
      assigneeFailureCount += 1;
    }
  }

  for (const tagId of tagIds) {
    try {
      await addTagToCard(
        cardId,
        tagId,
      );
    } catch {
      tagFailureCount += 1;
    }
  }

  return {
    assigneeFailureCount,
    tagFailureCount,
  };
};