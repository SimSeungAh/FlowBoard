import {
  createChecklist,
  createChecklistItem,
} from "@/api/checklist";
import {
  getTaskTemplate,
  type TaskTemplateId,
} from "@/features/card/taskTemplates";

export const createTaskTemplateChecklists = async (
  cardId: number,
  templateId: TaskTemplateId,
): Promise<void> => {
  const template = getTaskTemplate(templateId);

  for (const checklistTemplate of template.checklists) {
    const checklist = await createChecklist(cardId, {
      title: checklistTemplate.title,
    });

    // 서버가 count 기반으로 position을 정하므로 항목은 순서대로 생성합니다.
    for (const itemContent of checklistTemplate.items) {
      await createChecklistItem(checklist.id, {
        content: itemContent,
      });
    }
  }
};