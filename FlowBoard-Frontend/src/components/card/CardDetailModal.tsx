import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useParams } from "react-router";
import { toast } from "sonner";

import {
  deleteCard,
  getCardDetail,
  getCardsByColumn,
  moveCard,
  updateCard,
  type CardUpdateRequest,
} from "@/api/card";

import { getBoardDetail } from "@/api/board";

import {
  updateTestCaseResult,
  updateTestCaseType,
  type TestCaseResult,
  type TestCaseType,
} from "@/api/testCase";

import {
  updateSecurityReview,
  type SecurityReviewUpdateRequest,
  type SecuritySeverity,
  type SecurityVerificationStatus,
} from "@/api/securityReview";

import {
  addCardAssignee,
  getBoardMembers,
  getCardAssignees,
  removeCardAssignee,
} from "@/api/cardAssignee";

import { addTagToCard, createTag, getBoardTags, getCardTags, removeTagFromCard } from "@/api/tag";

import Button from "@/components/ui/Button";
import ChecklistSection from "@/components/card/ChecklistSection";
import CommentSection from "@/components/card/CommentSection";
import StructuredDescription from "@/components/card/StructuredDescription";
import RequirementCardSection from "@/components/card/RequirementCardSection";
import DesignReviewCardSection from "@/components/card/DesignReviewCardSection";
import ReleaseCheckCardSection from "@/components/card/ReleaseCheckCardSection";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

interface CardDetailModalProps {
  open: boolean;
  cardId: number | null;
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}

type MovePositionValue = "TOP" | "BOTTOM" | `BEFORE:${number}`;

const DEFAULT_TAG_COLOR = "#3B82F6";

const toDateTimeInputValue = (value: string | null) => {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatCompactDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const isPastDue = (value: string | null) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() < Date.now();
};

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="5.5" width="16" height="14" rx="2" />

      <path d="M8 3.5v4" />
      <path d="M16 3.5v4" />
      <path d="M4 9.5h16" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.5" />

      <path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />

      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

const getRoleLabel = (role: "OWNER" | "MEMBER" | "VIEWER") => {
  switch (role) {
    case "OWNER":
      return "OWNER";

    case "MEMBER":
      return "MEMBER";

    case "VIEWER":
      return "VIEWER";
  }
};

const getTestCaseTypeLabel = (type: TestCaseType) => {
  switch (type) {
    case "NORMAL":
      return "정상";

    case "EXCEPTION":
      return "예외";

    case "BOUNDARY":
      return "경계값";

    case "PERMISSION":
      return "권한";

    case "SECURITY":
      return "보안";

    case "RECOVERY":
      return "복구";

    case "INTEGRATION":
      return "통합";

    case "E2E":
      return "E2E";
  }
};

const getTestCaseResultLabel = (result: TestCaseResult) => {
  switch (result) {
    case "NOT_RUN":
      return "미실행";

    case "PASS":
      return "PASS";

    case "FAIL":
      return "FAIL";

    case "BLOCKED":
      return "BLOCKED";
  }
};

const getTaskTypeLabel = (taskType: string) => {
  switch (taskType) {
    case "GENERAL":
      return "일반 작업";

    case "BUG":
      return "버그";

    case "TEST_CASE":
      return "테스트 케이스";

    case "DESIGN_REVIEW":
      return "디자인 리뷰";

    case "REQUIREMENT":
      return "기획 / 요구사항";

    case "SECURITY_REVIEW":
      return "보안 점검";

    case "RELEASE_CHECK":
      return "릴리즈 체크";

    default:
      return "작업";
  }
};

const getTaskTypeClassName = (taskType: string) => {
  switch (taskType) {
    case "BUG":
      return "border-red-200 bg-[var(--flow-danger-soft)] text-[var(--flow-danger-dark)]";

    case "TEST_CASE":
      return "border-emerald-200 bg-[var(--flow-success-soft)] text-[var(--flow-success-dark)]";

    case "SECURITY_REVIEW":
      return "border-amber-200 bg-[var(--flow-warning-soft)] text-[var(--flow-warning-dark)]";

    case "REQUIREMENT":
      return "border-[var(--flow-primary-200)] bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]";

    case "DESIGN_REVIEW":
      return "border-[var(--flow-border-strong)] bg-[var(--flow-gray-100)] text-[var(--flow-text-secondary)]";

    case "RELEASE_CHECK":
      return "border-[var(--flow-primary-200)] bg-[var(--flow-primary-50)] text-[var(--flow-primary-700)]";

    default:
      return "border-[var(--flow-border)] bg-[var(--flow-gray-100)] text-[var(--flow-text-secondary)]";
  }
};

const getSecuritySeverityLabel = (severity: SecuritySeverity) => {
  switch (severity) {
    case "CRITICAL":
      return "CRITICAL";

    case "HIGH":
      return "HIGH";

    case "MEDIUM":
      return "MEDIUM";

    case "LOW":
      return "LOW";
  }
};

const getSecuritySeverityClassName = (severity: SecuritySeverity) => {
  switch (severity) {
    case "CRITICAL":
      return "border-red-300 bg-[var(--flow-danger-soft)] text-[var(--flow-danger-dark)]";

    case "HIGH":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "MEDIUM":
      return "border-amber-200 bg-[var(--flow-warning-soft)] text-[var(--flow-warning-dark)]";

    case "LOW":
      return "border-sky-200 bg-sky-50 text-sky-700";
  }
};

const getSecurityVerificationLabel = (status: SecurityVerificationStatus) => {
  switch (status) {
    case "PENDING":
      return "대기";

    case "IN_PROGRESS":
      return "검증 중";

    case "RETEST_REQUIRED":
      return "재검증 필요";

    case "VERIFIED":
      return "검증 완료";
  }
};

export default function CardDetailModal({
  open,
  cardId,
  canEdit,
  onClose,
  onChanged,
}: CardDetailModalProps) {
  const { boardId: boardIdParam } = useParams<{
    boardId: string;
  }>();

  const boardId = Number(boardIdParam);

  const isValidBoardId = Number.isInteger(boardId) && boardId > 0;

  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);

  const [descriptionEditMode, setDescriptionEditMode] = useState(false);

  const testCaseTypeMutation = useMutation({
    mutationFn: (testCaseType: TestCaseType) => {
      if (cardId === null) {
        throw new Error("카드 ID가 없습니다.");
      }

      return updateTestCaseType(cardId, testCaseType);
    },

    onSuccess: async (updatedCard) => {
      queryClient.setQueryData(["cards", updatedCard.id], updatedCard);

      await queryClient.invalidateQueries({
        queryKey: ["board", boardId, "test-cases"],
      });

      await onChanged();

      toast.success("테스트 유형을 변경했습니다.");
    },

    onError: () => {
      toast.error("테스트 유형을 변경하지 못했습니다.");
    },
  });

  const testCaseResultMutation = useMutation({
    mutationFn: (testCaseResult: TestCaseResult) => {
      if (cardId === null) {
        throw new Error("카드 ID가 없습니다.");
      }

      return updateTestCaseResult(cardId, testCaseResult);
    },

    onSuccess: async (updatedCard) => {
      queryClient.setQueryData(["cards", updatedCard.id], updatedCard);

      await queryClient.invalidateQueries({
        queryKey: ["board", boardId, "test-cases"],
      });

      await onChanged();

      toast.success("테스트 결과를 변경했습니다.");
    },

    onError: () => {
      toast.error("테스트 결과를 변경하지 못했습니다.");
    },
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  const [startDate, setStartDate] = useState("");

  const [dueDate, setDueDate] = useState("");

  const [securityImpactScope, setSecurityImpactScope] = useState("");

  const [selectedAssigneeUserId, setSelectedAssigneeUserId] = useState("");

  const [selectedTagId, setSelectedTagId] = useState("");

  const [newTagName, setNewTagName] = useState("");

  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR);

  const [moveTargetColumnId, setMoveTargetColumnId] = useState<number | null>(null);

  const [movePosition, setMovePosition] = useState<MovePositionValue>("BOTTOM");

  const cardQuery = useQuery({
    queryKey: ["cards", cardId],

    queryFn: () => getCardDetail(cardId as number),

    enabled: open && cardId !== null,
  });

  const boardQuery = useQuery({
    queryKey: ["boards", boardId],

    queryFn: () => getBoardDetail(boardId),

    enabled: open && cardId !== null && isValidBoardId,

    staleTime: 30_000,
  });

  const moveTargetCardsQuery = useQuery({
    queryKey: [
      "board",
      boardId,
      "move-target-cards",
      moveTargetColumnId,
      cardId,
    ],

    queryFn: async () => {
      if (moveTargetColumnId === null || cardId === null) {
        return [];
      }

      const cards = await getCardsByColumn(boardId, moveTargetColumnId);

      return cards.filter((item) => item.id !== cardId);
    },

    enabled:
      open &&
      canEdit &&
      isValidBoardId &&
      cardId !== null &&
      moveTargetColumnId !== null,

    staleTime: 5_000,
  });

  const membersQuery = useQuery({
    queryKey: ["boards", boardId, "members"],

    queryFn: () => getBoardMembers(boardId),

    enabled: open && cardId !== null && isValidBoardId,
  });

  const assigneesQuery = useQuery({
    queryKey: ["cards", cardId, "assignees"],

    queryFn: () => getCardAssignees(cardId as number),

    enabled: open && cardId !== null,
  });

  const boardTagsQuery = useQuery({
    queryKey: ["boards", boardId, "tags"],

    queryFn: () => getBoardTags(boardId),

    enabled: open && cardId !== null && isValidBoardId,
  });

  const cardTagsQuery = useQuery({
    queryKey: ["cards", cardId, "tags"],

    queryFn: () => getCardTags(cardId as number),

    enabled: open && cardId !== null,
  });

  const card = cardQuery.data;

  const board = boardQuery.data;

  const members = membersQuery.data ?? [];

  const assignees = assigneesQuery.data ?? [];

  const boardTags = boardTagsQuery.data ?? [];

  const cardTags = cardTagsQuery.data ?? [];

  const moveTargetCards = moveTargetCardsQuery.data ?? [];

  const availableMembers = useMemo(
    () =>
      members.filter((member) => !assignees.some((assignee) => assignee.userId === member.userId)),
    [assignees, members],
  );

  const availableTags = useMemo(
    () => boardTags.filter((tag) => !cardTags.some((cardTag) => cardTag.id === tag.id)),
    [boardTags, cardTags],
  );

  useEffect(() => {
    if (!open || !card) {
      return;
    }

    setTitle(card.title);

    setDescription(card.description ?? "");

    setStartDate(toDateTimeInputValue(card.startDate));

    setDueDate(toDateTimeInputValue(card.dueDate));

    setSecurityImpactScope(card.securityImpactScope ?? "");

    setEditMode(false);

    setDescriptionEditMode(false);

    setSelectedAssigneeUserId("");

    setSelectedTagId("");

    setNewTagName("");

    setNewTagColor(DEFAULT_TAG_COLOR);

    setMoveTargetColumnId(card.columnId);

    setMovePosition("BOTTOM");
  }, [card, open]);

  useEffect(() => {
    if (open) {
      return;
    }

    setEditMode(false);

    setDescriptionEditMode(false);

    setDeleteDialogOpen(false);

    setSecurityImpactScope("");

    setSelectedAssigneeUserId("");

    setSelectedTagId("");

    setNewTagName("");

    setNewTagColor(DEFAULT_TAG_COLOR);

    setMoveTargetColumnId(null);

    setMovePosition("BOTTOM");
  }, [open]);

  const updateMutation = useMutation({
    mutationFn: (data: CardUpdateRequest) => {
      if (cardId === null) {
        throw new Error("카드 ID가 없습니다.");
      }

      return updateCard(cardId, data);
    },

    onSuccess: async (updatedCard) => {
      queryClient.setQueryData(["cards", updatedCard.id], updatedCard);

      await onChanged();

      setEditMode(false);

      toast.success("카드를 수정했습니다.");
    },

    onError: () => {
      toast.error("카드를 수정하지 못했습니다.");
    },
  });

  const descriptionUpdateMutation = useMutation({
    mutationFn: (nextDescription: string) => {
      if (cardId === null || !card) {
        throw new Error("카드 정보를 확인할 수 없습니다.");
      }

      return updateCard(cardId, {
        title: card.title,

        description: nextDescription.trim() || null,

        startDate: card.startDate,

        dueDate: card.dueDate,
      });
    },

    onSuccess: async (updatedCard) => {
      queryClient.setQueryData(["cards", updatedCard.id], updatedCard);

      setDescription(updatedCard.description ?? "");

      setDescriptionEditMode(false);

      await onChanged();

      toast.success("설명을 수정했습니다.");
    },

    onError: () => {
      toast.error("설명을 수정하지 못했습니다.");
    },
  });

  const securityReviewMutation = useMutation({
    mutationFn: (data: SecurityReviewUpdateRequest) => {
      if (cardId === null) {
        throw new Error("카드 ID가 없습니다.");
      }

      return updateSecurityReview(cardId, data);
    },

    onSuccess: async (updatedCard) => {
      queryClient.setQueryData(["cards", updatedCard.id], updatedCard);

      setSecurityImpactScope(updatedCard.securityImpactScope ?? "");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["board", boardId, "security-reviews"],
        }),

        onChanged(),
      ]);

      toast.success("보안 점검 정보를 변경했습니다.");
    },

    onError: () => {
      toast.error("보안 점검 정보를 변경하지 못했습니다.");
    },
  });

  const columnMoveMutation = useMutation({
    mutationFn: async ({
      targetColumnId,
      position,
    }: {
      targetColumnId: number;
      position: MovePositionValue;
    }) => {
      if (cardId === null || !card) {
        throw new Error("카드 정보를 확인할 수 없습니다.");
      }

      const latestTargetCards = await getCardsByColumn(boardId, targetColumnId);

      const currentIndex =
        targetColumnId === card.columnId
          ? latestTargetCards.findIndex((item) => item.id === cardId)
          : -1;

      const targetCards = latestTargetCards.filter((item) => item.id !== cardId);

      let targetIndex: number;

      if (position === "TOP") {
        targetIndex = 0;
      } else if (position === "BOTTOM") {
        targetIndex = targetCards.length;
      } else {
        const beforeCardId = Number(position.replace("BEFORE:", ""));

        targetIndex = targetCards.findIndex((item) => item.id === beforeCardId);

        if (targetIndex < 0) {
          throw new Error("MOVE_TARGET_POSITION_CHANGED");
        }
      }

      if (targetColumnId === card.columnId && currentIndex === targetIndex) {
        return {
          updatedCard: card,
          moved: false,
          targetColumnId,
        };
      }

      const updatedCard = await moveCard(cardId, {
        targetColumnId,
        targetIndex,
      });

      return {
        updatedCard,
        moved: true,
        targetColumnId,
      };
    },

    onSuccess: async ({ updatedCard, moved, targetColumnId }) => {
      queryClient.setQueryData(["cards", updatedCard.id], updatedCard);

      if (!moved) {
        toast.info("이미 선택한 위치에 있습니다.");

        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["board", boardId, "cards"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["board", boardId, "dashboard"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["board", boardId, "test-cases"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["board", boardId, "security-reviews"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["boards", boardId, "card-search"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["boards", boardId, "activities"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["board", boardId, "move-target-cards"],
        }),

        onChanged(),
      ]);

      const targetColumn =
        board?.columns.find((column) => column.id === targetColumnId) ?? null;

      toast.success(
        targetColumn
          ? `"${targetColumn.title}" 컬럼의 선택한 위치로 이동했습니다.`
          : "카드를 선택한 위치로 이동했습니다.",
      );
    },

    onError: (error) => {
      if (error instanceof Error && error.message === "MOVE_TARGET_POSITION_CHANGED") {
        toast.error("선택한 위치의 카드가 변경되었습니다. 위치를 다시 선택해주세요.");

        void moveTargetCardsQuery.refetch();

        setMovePosition("BOTTOM");

        return;
      }

      toast.error("카드를 이동하지 못했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (cardId === null) {
        throw new Error("카드 ID가 없습니다.");
      }

      await deleteCard(cardId);
    },

    onSuccess: async () => {
      if (cardId !== null) {
        queryClient.removeQueries({
          queryKey: ["cards", cardId],
        });
      }

      await onChanged();

      setDeleteDialogOpen(false);

      toast.success("카드를 삭제했습니다.");

      onClose();
    },

    onError: () => {
      toast.error("카드를 삭제하지 못했습니다.");
    },
  });

  const addAssigneeMutation = useMutation({
    mutationFn: async (userId: number) => {
      if (cardId === null) {
        throw new Error("카드 ID가 없습니다.");
      }

      return addCardAssignee(cardId, {
        userId,
      });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["cards", cardId, "assignees"],
      });

      setSelectedAssigneeUserId("");

      toast.success("담당자를 추가했습니다.");
    },

    onError: () => {
      toast.error("담당자를 추가하지 못했습니다.");
    },
  });

  const removeAssigneeMutation = useMutation({
    mutationFn: async (userId: number) => {
      if (cardId === null) {
        throw new Error("카드 ID가 없습니다.");
      }

      await removeCardAssignee(cardId, userId);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["cards", cardId, "assignees"],
      });

      toast.success("담당자를 제거했습니다.");
    },

    onError: () => {
      toast.error("담당자를 제거하지 못했습니다.");
    },
  });

  const addTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      if (cardId === null) {
        throw new Error("카드 ID가 없습니다.");
      }

      return addTagToCard(cardId, tagId);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["cards", cardId, "tags"],
      });

      setSelectedTagId("");

      toast.success("태그를 추가했습니다.");
    },

    onError: () => {
      toast.error("태그를 추가하지 못했습니다.");
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      if (cardId === null) {
        throw new Error("카드 ID가 없습니다.");
      }

      await removeTagFromCard(cardId, tagId);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["cards", cardId, "tags"],
      });

      toast.success("태그를 제거했습니다.");
    },

    onError: () => {
      toast.error("태그를 제거하지 못했습니다.");
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async () => {
      if (cardId === null) {
        throw new Error("카드 ID가 없습니다.");
      }

      const name = newTagName.trim();

      if (!name) {
        throw new Error("태그 이름이 없습니다.");
      }

      const tag = await createTag(boardId, {
        name,
        color: newTagColor,
      });

      await addTagToCard(cardId, tag.id);

      return tag;
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["boards", boardId, "tags"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["cards", cardId, "tags"],
        }),
      ]);

      setNewTagName("");

      setNewTagColor(DEFAULT_TAG_COLOR);

      toast.success("새 태그를 만들고 카드에 추가했습니다.");
    },

    onError: () => {
      toast.error("태그를 생성하지 못했습니다. 같은 이름의 태그가 있는지 확인해주세요.");
    },
  });

  const startEdit = () => {
    if (!card || !canEdit) {
      return;
    }

    setTitle(card.title);

    setDescription(card.description ?? "");

    setStartDate(toDateTimeInputValue(card.startDate));

    setDueDate(toDateTimeInputValue(card.dueDate));

    setDescriptionEditMode(false);

    setEditMode(true);
  };

  const cancelEdit = () => {
    if (!card) {
      return;
    }

    setTitle(card.title);

    setDescription(card.description ?? "");

    setStartDate(toDateTimeInputValue(card.startDate));

    setDueDate(toDateTimeInputValue(card.dueDate));

    setEditMode(false);
  };

  const startDescriptionEdit = () => {
    if (!card || !canEdit) {
      return;
    }

    setDescription(card.description ?? "");

    setDescriptionEditMode(true);
  };

  const cancelDescriptionEdit = () => {
    if (!card) {
      return;
    }

    setDescription(card.description ?? "");

    setDescriptionEditMode(false);
  };

  const saveDescription = () => {
    if (!card || !canEdit) {
      return;
    }

    descriptionUpdateMutation.mutate(description);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canEdit || !card) {
      return;
    }

    const trimmedTitle = title.trim();

    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      toast.error("카드 제목을 입력해주세요.");

      return;
    }

    if (startDate && dueDate) {
      const startTime = new Date(startDate).getTime();
      const dueTime = new Date(dueDate).getTime();

      if (Number.isFinite(startTime) && Number.isFinite(dueTime) && startTime > dueTime) {
        toast.error("시작일은 마감일보다 늦을 수 없습니다.");

        return;
      }
    }

    updateMutation.mutate({
      title: trimmedTitle,

      description: trimmedDescription || null,

      startDate: startDate || null,

      dueDate: dueDate || null,
    });
  };

  const handleAddAssignee = () => {
    if (!canEdit) {
      return;
    }

    if (!selectedAssigneeUserId) {
      toast.error("추가할 담당자를 선택해주세요.");

      return;
    }

    const userId = Number(selectedAssigneeUserId);

    if (!Number.isInteger(userId) || userId <= 0) {
      toast.error("담당자 정보를 확인할 수 없습니다.");

      return;
    }

    addAssigneeMutation.mutate(userId);
  };

  const handleAddTag = () => {
    if (!canEdit) {
      return;
    }

    if (!selectedTagId) {
      toast.error("추가할 태그를 선택해주세요.");

      return;
    }

    const tagId = Number(selectedTagId);

    if (!Number.isInteger(tagId) || tagId <= 0) {
      toast.error("태그 정보를 확인할 수 없습니다.");

      return;
    }

    addTagMutation.mutate(tagId);
  };

  const handleCreateTag = () => {
    if (!canEdit) {
      return;
    }

    const name = newTagName.trim();

    if (!name) {
      toast.error("새 태그 이름을 입력해주세요.");

      return;
    }

    if (name.length > 30) {
      toast.error("태그 이름은 30자 이하로 입력해주세요.");

      return;
    }

    createTagMutation.mutate();
  };

  const isAssigneeBusy = addAssigneeMutation.isPending || removeAssigneeMutation.isPending;

  const isTagBusy =
    addTagMutation.isPending || removeTagMutation.isPending || createTagMutation.isPending;

  const handleClose = () => {
    if (
      updateMutation.isPending ||
      descriptionUpdateMutation.isPending ||
      testCaseTypeMutation.isPending ||
      testCaseResultMutation.isPending ||
      securityReviewMutation.isPending ||
      columnMoveMutation.isPending ||
      deleteMutation.isPending ||
      isAssigneeBusy ||
      isTagBusy
    ) {
      return;
    }

    setEditMode(false);

    onClose();
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (descriptionEditMode) {
          cancelDescriptionEdit();

          return;
        }

        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    open,
    updateMutation.isPending,
    descriptionUpdateMutation.isPending,
    testCaseTypeMutation.isPending,
    testCaseResultMutation.isPending,
    securityReviewMutation.isPending,
    columnMoveMutation.isPending,
    deleteMutation.isPending,
    descriptionEditMode,
    isAssigneeBusy,
    isTagBusy,
  ]);

  if (!open) {
    return (
      <ConfirmDialog
        open={deleteDialogOpen}
        title="작업 삭제"
        description={
          card
            ? `'${card.title}' 작업을 삭제합니다. 연결된 데이터도 함께 삭제될 수 있으며 되돌릴 수 없습니다.`
            : "작업을 삭제합니다. 되돌릴 수 없습니다."
        }
        confirmText="삭제"
        cancelText="취소"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-950/[0.06]"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            handleClose();
          }
        }}
      >
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={editMode ? "작업 수정" : "작업 상세"}
          className={[
            "absolute inset-y-0 right-0",
            "flex w-[580px]",
            "max-w-[calc(100vw-var(--flow-sidebar-width)-24px)]",
            "flex-col",
            "border-l border-[var(--flow-border)]",
            "bg-white",
            "shadow-[var(--flow-shadow-panel)]",
          ].join(" ")}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="flex h-[64px] shrink-0 items-center justify-between gap-5 border-b border-[var(--flow-border)] bg-white px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="text-[12px] font-bold text-[var(--flow-primary)]">
                {editMode ? "작업 수정" : "작업 상세"}
              </span>

              {card && (
                <span className="inline-flex h-6 items-center rounded-md bg-[var(--flow-gray-100)] px-2 text-[10px] font-semibold text-[var(--flow-text-muted)]">
                  #{card.id}
                </span>
              )}

              {!canEdit && (
                <span className="inline-flex h-6 items-center rounded-md bg-[var(--flow-gray-100)] px-2 text-[10px] font-semibold text-[var(--flow-text-muted)]">
                  읽기 전용
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {!editMode && canEdit && card && (
                <button
                  type="button"
                  className={[
                    "inline-flex h-9 items-center justify-center",
                    "rounded-lg px-3",
                    "text-[12px] font-semibold",
                    "text-[var(--flow-text-secondary)]",
                    "transition-colors",
                    "hover:bg-[var(--flow-gray-100)]",
                    "hover:text-[var(--flow-text)]",
                  ].join(" ")}
                  onClick={startEdit}
                >
                  수정
                </button>
              )}

              <button
                type="button"
                aria-label="작업 상세 닫기"
                className={[
                  "flex h-9 w-9 items-center justify-center",
                  "rounded-lg",
                  "text-[20px] leading-none",
                  "text-[var(--flow-text-muted)]",
                  "transition-colors",
                  "hover:bg-[var(--flow-gray-100)]",
                  "hover:text-[var(--flow-text)]",
                ].join(" ")}
                onClick={handleClose}
              >
                ×
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {cardQuery.isLoading ? (
              <div className="flex min-h-[460px] items-center justify-center px-8">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--flow-gray-200)] border-t-[var(--flow-primary)]" />

                  <p className="mt-4 text-[13px] text-[var(--flow-text-muted)]">
                    작업 정보를 불러오는 중...
                  </p>
                </div>
              </div>
            ) : cardQuery.isError || !card ? (
              <div className="p-8">
                <div className="rounded-[var(--flow-radius-lg)] border border-red-200 bg-red-50 px-6 py-10 text-center">
                  <h3 className="text-base font-bold text-[var(--flow-text)]">
                    작업 정보를 불러오지 못했습니다.
                  </h3>

                  <p className="mt-2 text-[13px] text-[var(--flow-text-muted)]">
                    잠시 후 다시 시도해주세요.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5"
                    onClick={() => void cardQuery.refetch()}
                  >
                    다시 불러오기
                  </Button>
                </div>
              </div>
            ) : editMode ? (
              <form className="flex min-h-full flex-col" onSubmit={handleSubmit}>
                <div className="space-y-8 p-8">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.12em] text-[var(--flow-primary)] uppercase">
                      Basic information
                    </p>

                    <h2 className="mt-2 text-[22px] font-bold tracking-[-0.02em] text-[var(--flow-text)]">
                      작업 기본 정보 수정
                    </h2>

                    <p className="mt-2 text-[13px] leading-6 text-[var(--flow-text-muted)]">
                      제목, 설명, 시작일과 마감일을 수정합니다. 담당자와 태그, 체크리스트는 상세 화면에서
                      관리합니다.
                    </p>
                  </div>

                  <div className="space-y-6 rounded-[var(--flow-radius-lg)] bg-[var(--flow-gray-50)] p-6">
                    <Input
                      label="작업 제목"
                      value={title}
                      required
                      maxLength={100}
                      helperText={`${title.length}/100`}
                      disabled={updateMutation.isPending}
                      onChange={(event) => setTitle(event.target.value)}
                    />

                    <Textarea
                      id="card-detail-description"
                      label="설명"
                      value={description}
                      placeholder="기획, 디자인, 구현, 테스트, 보안 검토 등 작업 내용을 정리해주세요."
                      disabled={updateMutation.isPending}
                      onChange={(event) => setDescription(event.target.value)}
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Input
                        label="작업 시작일"
                        type="datetime-local"
                        value={startDate}
                        disabled={updateMutation.isPending}
                        onChange={(event) => setStartDate(event.target.value)}
                      />

                      <Input
                        label="마감일"
                        type="datetime-local"
                        value={dueDate}
                        disabled={updateMutation.isPending}
                        onChange={(event) => setDueDate(event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 mt-auto flex shrink-0 items-center justify-end gap-3 border-t border-[var(--flow-border)] bg-white/95 px-8 py-5 backdrop-blur">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={updateMutation.isPending}
                    onClick={cancelEdit}
                  >
                    취소
                  </Button>

                  <Button type="submit" loading={updateMutation.isPending} disabled={!title.trim()}>
                    저장
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <section className="border-b border-[var(--flow-border)] px-7 py-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "inline-flex h-7 items-center rounded-lg border px-2.5",
                        "text-[10px] font-bold",
                        getTaskTypeClassName(card.taskType),
                      ].join(" ")}
                    >
                      {getTaskTypeLabel(card.taskType)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {cardTagsQuery.isLoading ? (
                      <>
                        <span className="h-6 w-16 animate-pulse rounded-md bg-[var(--flow-gray-100)]" />

                        <span className="h-6 w-20 animate-pulse rounded-md bg-[var(--flow-gray-100)]" />
                      </>
                    ) : (
                      cardTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex h-7 max-w-[180px] items-center gap-2 rounded-lg border border-[var(--flow-border)] bg-white px-2.5 text-[11px] font-semibold text-[var(--flow-text-secondary)]"
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: tag.color,
                            }}
                          />

                          <span className="truncate">{tag.name}</span>
                        </span>
                      ))
                    )}

                    {cardTags.length === 0 && !cardTagsQuery.isLoading && (
                      <span className="inline-flex h-7 items-center rounded-lg bg-[var(--flow-gray-100)] px-2.5 text-[10px] font-semibold text-[var(--flow-text-muted)]">
                        태그 없음
                      </span>
                    )}
                  </div>

                  <h2 className="mt-4 text-[24px] leading-[1.45] font-bold tracking-[-0.03em] break-words text-[var(--flow-text)]">
                    {card.title}
                  </h2>

                  <p className="mt-2 text-[11px] text-[var(--flow-text-placeholder)]">
                    작업 #{card.id}
                  </p>

                  <div className="mt-6 divide-y divide-[var(--flow-border)] rounded-xl border border-[var(--flow-border)] bg-white">
                    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-4 px-4 py-3.5">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--flow-text-muted)]">
                        <UserIcon />
                        작성자
                      </div>

                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--flow-gray-800)] text-[10px] font-bold text-white">
                          {card.createdByNickname.charAt(0).toUpperCase()}
                        </span>

                        <span className="truncate text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                          {card.createdByNickname}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-4 px-4 py-3.5">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--flow-text-muted)]">
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="4" y="4" width="5" height="16" rx="1.5" />
                          <rect x="10.5" y="4" width="5" height="12" rx="1.5" />
                          <rect x="17" y="4" width="3" height="8" rx="1.5" />
                        </svg>
                        현재 컬럼
                      </div>

                      {boardQuery.isLoading ? (
                        <div className="h-8 w-24 animate-pulse rounded-lg bg-[var(--flow-gray-100)]" />
                      ) : boardQuery.isError || !board ? (
                        <button
                          type="button"
                          className="w-fit text-[11px] font-semibold text-[var(--flow-primary)] hover:underline"
                          onClick={() => void boardQuery.refetch()}
                        >
                          컬럼 다시 불러오기
                        </button>
                      ) : (
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex min-w-0 items-center rounded-lg bg-[var(--flow-primary-50)] px-3 py-1.5 text-[11px] font-bold text-[var(--flow-primary-700)]">
                            <span className="truncate">
                              {board.columns.find((column) => column.id === card.columnId)?.title ??
                                `컬럼 #${card.columnId}`}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-4 px-4 py-3.5">
                      <div className="flex items-center gap-2 pt-2 text-[11px] font-medium text-[var(--flow-text-muted)]">
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12h14" />
                          <path d="m14 7 5 5-5 5" />
                        </svg>
                        카드 이동
                      </div>

                      {!board || boardQuery.isLoading ? (
                        <div className="h-[82px] w-full animate-pulse rounded-lg bg-[var(--flow-gray-100)]" />
                      ) : boardQuery.isError ? (
                        <button
                          type="button"
                          className="w-fit pt-2 text-[11px] font-semibold text-[var(--flow-primary)] hover:underline"
                          onClick={() => void boardQuery.refetch()}
                        >
                          이동 정보를 다시 불러오기
                        </button>
                      ) : canEdit ? (
                        <div className="min-w-0 space-y-2">
                          <select
                            aria-label="이동할 컬럼"
                            value={String(moveTargetColumnId ?? card.columnId)}
                            disabled={columnMoveMutation.isPending}
                            className={[
                              "h-9 w-full min-w-0 rounded-lg",
                              "border border-[var(--flow-border-strong)]",
                              "bg-white px-3",
                              "text-[11px] font-semibold",
                              "text-[var(--flow-text-secondary)]",
                              "outline-none",
                              "transition-[border-color,box-shadow,opacity]",
                              "focus:border-[var(--flow-primary)]",
                              "focus:ring-4 focus:ring-[var(--flow-focus-ring)]",
                              "disabled:cursor-not-allowed disabled:opacity-55",
                            ].join(" ")}
                            onChange={(event) => {
                              const targetColumnId = Number(event.target.value);

                              if (!Number.isInteger(targetColumnId) || targetColumnId <= 0) {
                                return;
                              }

                              setMoveTargetColumnId(targetColumnId);
                              setMovePosition("BOTTOM");
                            }}
                          >
                            {board.columns.map((column) => (
                              <option key={column.id} value={column.id}>
                                {column.title}
                              </option>
                            ))}
                          </select>

                          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                            <select
                              aria-label="이동할 위치"
                              value={movePosition}
                              disabled={
                                columnMoveMutation.isPending ||
                                moveTargetCardsQuery.isLoading ||
                                moveTargetCardsQuery.isError
                              }
                              className={[
                                "h-9 min-w-0 rounded-lg",
                                "border border-[var(--flow-border-strong)]",
                                "bg-white px-3",
                                "text-[11px] font-semibold",
                                "text-[var(--flow-text-secondary)]",
                                "outline-none",
                                "transition-[border-color,box-shadow,opacity]",
                                "focus:border-[var(--flow-primary)]",
                                "focus:ring-4 focus:ring-[var(--flow-focus-ring)]",
                                "disabled:cursor-not-allowed disabled:opacity-55",
                              ].join(" ")}
                              onChange={(event) => {
                                setMovePosition(event.target.value as MovePositionValue);
                              }}
                            >
                              <option value="TOP">맨 위</option>

                              {moveTargetCards.map((targetCard) => (
                                <option key={targetCard.id} value={`BEFORE:${targetCard.id}`}>
                                  #{targetCard.id} {targetCard.title} 앞
                                </option>
                              ))}

                              <option value="BOTTOM">맨 아래</option>
                            </select>

                            <Button
                              type="button"
                              size="sm"
                              loading={columnMoveMutation.isPending}
                              disabled={
                                columnMoveMutation.isPending ||
                                moveTargetColumnId === null ||
                                moveTargetCardsQuery.isLoading ||
                                moveTargetCardsQuery.isError
                              }
                              onClick={() => {
                                if (moveTargetColumnId === null) {
                                  return;
                                }

                                columnMoveMutation.mutate({
                                  targetColumnId: moveTargetColumnId,
                                  position: movePosition,
                                });
                              }}
                            >
                              이동
                            </Button>
                          </div>

                          <div className="min-h-5">
                            {moveTargetCardsQuery.isLoading ? (
                              <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-[var(--flow-text-muted)]">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--flow-primary)]" />
                                이동 위치 불러오는 중
                              </span>
                            ) : moveTargetCardsQuery.isError ? (
                              <button
                                type="button"
                                className="text-[9px] font-semibold text-[var(--flow-danger)] hover:underline"
                                onClick={() => void moveTargetCardsQuery.refetch()}
                              >
                                위치를 불러오지 못했습니다. 다시 시도
                              </button>
                            ) : (
                              <span className="text-[9px] leading-5 text-[var(--flow-text-placeholder)]">
                                컬럼과 위치를 고른 뒤 이동을 누르면 정확한 순서로 배치됩니다.
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="pt-2 text-[11px] font-medium text-[var(--flow-text-placeholder)]">
                          VIEWER는 카드를 이동할 수 없습니다.
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-4 px-4 py-3.5">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--flow-text-muted)]">
                        <ClockIcon />
                        등록일
                      </div>

                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <span className="truncate text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                          {formatCompactDateTime(card.createdAt)}
                        </span>

                        <span className="shrink-0 text-[9px] font-medium text-[var(--flow-text-placeholder)]">
                          시스템 기록 · 수정 불가
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-4 px-4 py-3.5">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--flow-text-muted)]">
                        <CalendarIcon />
                        작업 시작일
                      </div>

                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <span className="truncate text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                          {formatDateTime(card.startDate)}
                        </span>

                        {canEdit && (
                          <button
                            type="button"
                            className="shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold text-[var(--flow-primary)] transition-colors hover:bg-[var(--flow-primary-50)]"
                            onClick={startEdit}
                          >
                            날짜 수정
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-4 px-4 py-3.5">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--flow-text-muted)]">
                        <CalendarIcon />
                        마감일
                      </div>

                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span
                          className={[
                            "text-[12px] font-semibold",
                            isPastDue(card.dueDate)
                              ? "text-[var(--flow-danger)]"
                              : "text-[var(--flow-text-secondary)]",
                          ].join(" ")}
                        >
                          {formatDateTime(card.dueDate)}
                        </span>

                        {isPastDue(card.dueDate) && (
                          <span className="rounded-md bg-[var(--flow-danger-soft)] px-2 py-1 text-[9px] font-bold text-[var(--flow-danger)]">
                            마감 지남
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-4 px-4 py-3.5">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--flow-text-muted)]">
                        <ClockIcon />
                        최근 수정
                      </div>

                      <span className="truncate text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                        {formatCompactDateTime(card.updatedAt)}
                      </span>
                    </div>
                  </div>
                </section>

                {card.taskType === "TEST_CASE" && (
                  <section className="border-b border-[var(--flow-border)] px-8 py-6">
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-bold text-[var(--flow-text)]">
                            테스트 케이스
                          </h3>

                          <span className="rounded-md bg-[var(--flow-primary-50)] px-2 py-1 text-[9px] font-bold tracking-[0.05em] text-[var(--flow-primary)]">
                            QA
                          </span>
                        </div>

                        <p className="mt-1.5 text-[11px] leading-5 text-[var(--flow-text-muted)]">
                          테스트 유형과 현재 실행 결과를 관리합니다.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4">
                      <div className="rounded-xl bg-[var(--flow-gray-50)] p-4">
                        <p className="mb-2 text-[10px] font-semibold text-[var(--flow-text-placeholder)]">
                          테스트 유형
                        </p>

                        {canEdit ? (
                          <select
                            value={card.testCaseType ?? "NORMAL"}
                            disabled={
                              testCaseTypeMutation.isPending || testCaseResultMutation.isPending
                            }
                            className={[
                              "h-9 w-full rounded-lg",
                              "border border-[var(--flow-border-strong)]",
                              "bg-white px-3",
                              "text-[11px] font-semibold",
                              "text-[var(--flow-text-secondary)]",
                              "outline-none",
                              "transition-[border-color,box-shadow,opacity]",
                              "focus:border-[var(--flow-primary)]",
                              "focus:ring-4 focus:ring-[var(--flow-focus-ring)]",
                              testCaseTypeMutation.isPending
                                ? "cursor-wait opacity-50"
                                : "cursor-pointer",
                            ].join(" ")}
                            onChange={(event) =>
                              testCaseTypeMutation.mutate(event.target.value as TestCaseType)
                            }
                          >
                            <option value="NORMAL">정상</option>

                            <option value="EXCEPTION">예외</option>

                            <option value="BOUNDARY">경계값</option>

                            <option value="PERMISSION">권한</option>

                            <option value="SECURITY">보안</option>

                            <option value="RECOVERY">복구</option>

                            <option value="INTEGRATION">통합</option>

                            <option value="E2E">E2E</option>
                          </select>
                        ) : (
                          <div className="flex h-9 items-center rounded-lg border border-[var(--flow-border)] bg-white px-3">
                            <span className="text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                              {card.testCaseType
                                ? getTestCaseTypeLabel(card.testCaseType)
                                : "미지정"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl bg-[var(--flow-gray-50)] p-4">
                        <p className="mb-2 text-[10px] font-semibold text-[var(--flow-text-placeholder)]">
                          테스트 결과
                        </p>

                        {canEdit ? (
                          <select
                            value={card.testCaseResult ?? "NOT_RUN"}
                            disabled={
                              testCaseTypeMutation.isPending || testCaseResultMutation.isPending
                            }
                            className={[
                              "h-9 w-full rounded-lg border px-3",
                              "text-[11px] font-bold",
                              "outline-none",
                              "transition-[border-color,box-shadow,opacity]",
                              "focus:ring-4 focus:ring-[var(--flow-focus-ring)]",

                              card.testCaseResult === "PASS"
                                ? "border-emerald-200 bg-[var(--flow-success-soft)] text-[var(--flow-success-dark)]"
                                : "",

                              card.testCaseResult === "FAIL"
                                ? "border-red-200 bg-[var(--flow-danger-soft)] text-[var(--flow-danger-dark)]"
                                : "",

                              card.testCaseResult === "BLOCKED"
                                ? "border-amber-200 bg-[var(--flow-warning-soft)] text-[var(--flow-warning-dark)]"
                                : "",

                              !card.testCaseResult || card.testCaseResult === "NOT_RUN"
                                ? "border-[var(--flow-border-strong)] bg-white text-[var(--flow-text-secondary)]"
                                : "",

                              testCaseResultMutation.isPending
                                ? "cursor-wait opacity-50"
                                : "cursor-pointer",
                            ].join(" ")}
                            onChange={(event) =>
                              testCaseResultMutation.mutate(event.target.value as TestCaseResult)
                            }
                          >
                            <option value="NOT_RUN">미실행</option>

                            <option value="PASS">PASS</option>

                            <option value="FAIL">FAIL</option>

                            <option value="BLOCKED">BLOCKED</option>
                          </select>
                        ) : (
                          <div className="flex h-9 items-center rounded-lg border border-[var(--flow-border)] bg-white px-3">
                            <span className="text-[11px] font-bold text-[var(--flow-text-secondary)]">
                              {card.testCaseResult
                                ? getTestCaseResultLabel(card.testCaseResult)
                                : "미실행"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {card.taskType === "SECURITY_REVIEW" && (
                  <section className="border-b border-[var(--flow-border)] px-8 py-6">
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-bold text-[var(--flow-text)]">
                            보안 점검
                          </h3>

                          <span className="rounded-md bg-[var(--flow-warning-soft)] px-2 py-1 text-[9px] font-bold tracking-[0.05em] text-[var(--flow-warning-dark)]">
                            SECURITY
                          </span>
                        </div>

                        <p className="mt-1.5 text-[11px] leading-5 text-[var(--flow-text-muted)]">
                          심각도, 영향 범위, 재검증 상태를 카드 상세에서도 바로 관리합니다.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4">
                      <div className="rounded-xl bg-[var(--flow-gray-50)] p-4">
                        <p className="mb-2 text-[10px] font-semibold text-[var(--flow-text-placeholder)]">
                          심각도
                        </p>

                        {canEdit ? (
                          <select
                            value={card.securitySeverity ?? "MEDIUM"}
                            disabled={securityReviewMutation.isPending}
                            className={[
                              "h-9 w-full rounded-lg border px-3",
                              "text-[11px] font-bold",
                              "outline-none",
                              "transition-[border-color,box-shadow,opacity]",
                              "focus:ring-4 focus:ring-[var(--flow-focus-ring)]",
                              getSecuritySeverityClassName(card.securitySeverity ?? "MEDIUM"),
                              securityReviewMutation.isPending
                                ? "cursor-wait opacity-50"
                                : "cursor-pointer",
                            ].join(" ")}
                            onChange={(event) =>
                              securityReviewMutation.mutate({
                                securitySeverity: event.target.value as SecuritySeverity,
                              })
                            }
                          >
                            <option value="CRITICAL">CRITICAL</option>

                            <option value="HIGH">HIGH</option>

                            <option value="MEDIUM">MEDIUM</option>

                            <option value="LOW">LOW</option>
                          </select>
                        ) : (
                          <div
                            className={[
                              "flex h-9 items-center rounded-lg border px-3",
                              getSecuritySeverityClassName(card.securitySeverity ?? "MEDIUM"),
                            ].join(" ")}
                          >
                            <span className="text-[11px] font-bold">
                              {getSecuritySeverityLabel(card.securitySeverity ?? "MEDIUM")}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl bg-[var(--flow-gray-50)] p-4">
                        <p className="mb-2 text-[10px] font-semibold text-[var(--flow-text-placeholder)]">
                          검증 상태
                        </p>

                        {canEdit ? (
                          <select
                            value={card.securityVerificationStatus ?? "PENDING"}
                            disabled={securityReviewMutation.isPending}
                            className={[
                              "h-9 w-full rounded-lg",
                              "border border-[var(--flow-border-strong)]",
                              "bg-white px-3",
                              "text-[11px] font-semibold",
                              "text-[var(--flow-text-secondary)]",
                              "outline-none",
                              "transition-[border-color,box-shadow,opacity]",
                              "focus:border-[var(--flow-primary)]",
                              "focus:ring-4 focus:ring-[var(--flow-focus-ring)]",
                              securityReviewMutation.isPending
                                ? "cursor-wait opacity-50"
                                : "cursor-pointer",
                            ].join(" ")}
                            onChange={(event) =>
                              securityReviewMutation.mutate({
                                securityVerificationStatus: event.target
                                  .value as SecurityVerificationStatus,
                              })
                            }
                          >
                            <option value="PENDING">대기</option>

                            <option value="IN_PROGRESS">검증 중</option>

                            <option value="RETEST_REQUIRED">재검증 필요</option>

                            <option value="VERIFIED">검증 완료</option>
                          </select>
                        ) : (
                          <div className="flex h-9 items-center rounded-lg border border-[var(--flow-border)] bg-white px-3">
                            <span className="text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                              {getSecurityVerificationLabel(
                                card.securityVerificationStatus ?? "PENDING",
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-[var(--flow-gray-50)] p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold text-[var(--flow-text-placeholder)]">
                            영향 범위
                          </p>

                          <p className="mt-1 text-[10px] leading-4 text-[var(--flow-text-muted)]">
                            영향을 받는 화면, API, 기능 또는 컴포넌트를 기록합니다.
                          </p>
                        </div>
                      </div>

                      {canEdit ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={securityImpactScope}
                            maxLength={255}
                            placeholder="예: Web /api/auth/login"
                            disabled={securityReviewMutation.isPending}
                            className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--flow-border-strong)] bg-white px-3 text-[12px] text-[var(--flow-text)] outline-none placeholder:text-[var(--flow-text-placeholder)] focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)] disabled:opacity-60"
                            onChange={(event) => setSecurityImpactScope(event.target.value)}
                          />

                          <Button
                            type="button"
                            size="sm"
                            loading={securityReviewMutation.isPending}
                            disabled={
                              securityReviewMutation.isPending ||
                              securityImpactScope.trim() === (card.securityImpactScope ?? "").trim()
                            }
                            onClick={() =>
                              securityReviewMutation.mutate({
                                securityImpactScope: securityImpactScope.trim(),
                              })
                            }
                          >
                            저장
                          </Button>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-[var(--flow-border)] bg-white px-3.5 py-3 text-[12px] leading-5 text-[var(--flow-text-secondary)]">
                          {card.securityImpactScope || "영향 범위가 아직 등록되지 않았습니다."}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                <section className="border-b border-[var(--flow-border)] px-7 py-6">
                  <div className="mb-5 flex items-center justify-between gap-5">
                    <h3 className="text-[14px] font-bold text-[var(--flow-text)]">설명</h3>

                    {canEdit && !descriptionEditMode && (
                      <button
                        type="button"
                        className="shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold text-[var(--flow-primary)] transition-colors hover:bg-[var(--flow-primary-50)]"
                        onClick={startDescriptionEdit}
                      >
                        설명 수정
                      </button>
                    )}
                  </div>

                  {descriptionEditMode ? (
                    <div className="rounded-xl bg-[var(--flow-gray-50)] p-5">
                      <Textarea
                        id="card-quick-description"
                        value={description}
                        autoFocus
                        className="min-h-64"
                        placeholder="작업의 배경, 요구사항, 테스트 내용, 참고 사항 등을 자유롭게 작성해주세요."
                        disabled={descriptionUpdateMutation.isPending}
                        onChange={(event) => setDescription(event.target.value)}
                      />

                      <div className="mt-4 flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={descriptionUpdateMutation.isPending}
                          onClick={cancelDescriptionEdit}
                        >
                          취소
                        </Button>

                        <Button
                          type="button"
                          loading={descriptionUpdateMutation.isPending}
                          onClick={saveDescription}
                        >
                          설명 저장
                        </Button>
                      </div>
                    </div>
                  ) : card.description ? (
                    <div className="rounded-xl bg-[var(--flow-gray-50)] px-5 py-5">
                      <StructuredDescription description={card.description} />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[var(--flow-border-strong)] bg-[var(--flow-gray-50)] px-5 py-8 text-center">
                      <p className="text-[13px] text-[var(--flow-text-muted)]">
                        등록된 설명이 없습니다.
                      </p>

                      {canEdit && (
                        <button
                          type="button"
                          className="mt-3 text-[13px] font-semibold text-[var(--flow-primary)] hover:underline"
                          onClick={startDescriptionEdit}
                        >
                          설명 추가하기
                        </button>
                      )}
                    </div>
                  )}
                </section>

                {card.taskType === "REQUIREMENT" && (
                  <RequirementCardSection cardId={card.id} canEdit={canEdit} />
                )}

                {card.taskType === "DESIGN_REVIEW" && (
                  <DesignReviewCardSection cardId={card.id} canEdit={canEdit} />
                )}

                {card.taskType === "RELEASE_CHECK" && (
                  <ReleaseCheckCardSection cardId={card.id} canEdit={canEdit} />
                )}

                <section className="border-b border-[var(--flow-border)] px-7 py-6">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <h3 className="text-[14px] font-bold text-[var(--flow-text)]">담당자</h3>
                    </div>

                    {!assigneesQuery.isLoading && (
                      <span className="rounded-lg bg-[var(--flow-primary-50)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--flow-primary)]">
                        {assignees.length}명
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    {assigneesQuery.isLoading ? (
                      <p className="py-3 text-[13px] text-[var(--flow-text-muted)]">
                        담당자를 불러오는 중...
                      </p>
                    ) : assigneesQuery.isError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                        <p className="text-[13px] text-red-600">
                          담당자 정보를 불러오지 못했습니다.
                        </p>

                        <button
                          type="button"
                          className="mt-3 text-[13px] font-semibold text-[var(--flow-primary)]"
                          onClick={() => void assigneesQuery.refetch()}
                        >
                          다시 불러오기
                        </button>
                      </div>
                    ) : assignees.length === 0 ? (
                      <p className="rounded-xl bg-[var(--flow-gray-50)] px-5 py-5 text-[13px] text-[var(--flow-text-muted)]">
                        아직 지정된 담당자가 없습니다.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {assignees.map((assignee) => (
                          <div
                            key={assignee.id}
                            className="flex items-center gap-3.5 rounded-xl border border-[var(--flow-border)] bg-white py-2 pr-3 pl-2"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--flow-primary)] text-[11px] font-bold text-white">
                              {assignee.nickname.charAt(0).toUpperCase()}
                            </span>

                            <div className="min-w-0">
                              <p className="max-w-36 truncate text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                                {assignee.nickname}
                              </p>

                              <p className="max-w-36 truncate text-[10px] text-[var(--flow-text-placeholder)]">
                                {assignee.email}
                              </p>
                            </div>

                            {canEdit && (
                              <button
                                type="button"
                                disabled={isAssigneeBusy}
                                aria-label={`${assignee.nickname} 담당자 제거`}
                                className="ml-1 flex h-6 w-6 items-center justify-center rounded text-sm text-[var(--flow-text-placeholder)] transition-colors hover:bg-[var(--flow-danger-soft)] hover:text-[var(--flow-danger)] disabled:opacity-40"
                                onClick={() => removeAssigneeMutation.mutate(assignee.userId)}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {canEdit && (
                      <div className="mt-5 flex items-end gap-3">
                        <div className="min-w-0 flex-1">
                          {membersQuery.isLoading ? (
                            <p className="py-2 text-[13px] text-[var(--flow-text-muted)]">
                              보드 멤버를 불러오는 중...
                            </p>
                          ) : membersQuery.isError ? (
                            <button
                              type="button"
                              className="text-xs font-semibold text-[var(--flow-primary)]"
                              onClick={() => void membersQuery.refetch()}
                            >
                              보드 멤버 다시 불러오기
                            </button>
                          ) : availableMembers.length === 0 ? (
                            <p className="py-2 text-[13px] text-[var(--flow-text-muted)]">
                              추가할 수 있는 멤버가 없습니다.
                            </p>
                          ) : (
                            <select
                              value={selectedAssigneeUserId}
                              disabled={isAssigneeBusy}
                              className="h-10 w-full rounded-xl border border-[var(--flow-border-strong)] bg-white px-3.5 text-[13px] text-[var(--flow-text-secondary)] transition-[border-color,box-shadow] outline-none focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)]"
                              onChange={(event) => setSelectedAssigneeUserId(event.target.value)}
                            >
                              <option value="">담당자 선택</option>

                              {availableMembers.map((member) => (
                                <option key={member.id} value={member.userId}>
                                  {member.nickname} · {getRoleLabel(member.role)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {availableMembers.length > 0 &&
                          !membersQuery.isLoading &&
                          !membersQuery.isError && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={!selectedAssigneeUserId || isAssigneeBusy}
                              loading={addAssigneeMutation.isPending}
                              onClick={handleAddAssignee}
                            >
                              추가
                            </Button>
                          )}
                      </div>
                    )}
                  </div>
                </section>

                <section className="border-b border-[var(--flow-border)] px-8 py-8">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <h3 className="text-base font-bold text-[var(--flow-text)]">태그</h3>

                      <p className="mt-1.5 text-[12px] leading-5 text-[var(--flow-text-muted)]">
                        작업 종류, 분야, 우선순위 등을 자유롭게 구분합니다.
                      </p>
                    </div>

                    {!cardTagsQuery.isLoading && (
                      <span className="rounded-lg bg-[var(--flow-gray-100)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--flow-text-muted)]">
                        {cardTags.length}개
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    {cardTagsQuery.isLoading ? (
                      <p className="py-3 text-[13px] text-[var(--flow-text-muted)]">
                        태그를 불러오는 중...
                      </p>
                    ) : cardTagsQuery.isError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                        <p className="text-[13px] text-red-600">태그를 불러오지 못했습니다.</p>

                        <button
                          type="button"
                          className="mt-3 text-[13px] font-semibold text-[var(--flow-primary)]"
                          onClick={() => void cardTagsQuery.refetch()}
                        >
                          다시 불러오기
                        </button>
                      </div>
                    ) : cardTags.length === 0 ? (
                      <p className="rounded-xl bg-[var(--flow-gray-50)] px-5 py-5 text-[13px] text-[var(--flow-text-muted)]">
                        아직 등록된 태그가 없습니다.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {cardTags.map((tag) => (
                          <div
                            key={tag.id}
                            className="inline-flex items-center gap-3 rounded-md border border-[var(--flow-border)] bg-white py-1.5 pr-1.5 pl-2"
                          >
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor: tag.color,
                              }}
                            />

                            <span className="max-w-40 truncate text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                              {tag.name}
                            </span>

                            {canEdit && (
                              <button
                                type="button"
                                disabled={isTagBusy}
                                aria-label={`${tag.name} 태그 제거`}
                                className="flex h-6 w-6 items-center justify-center rounded text-sm text-[var(--flow-text-placeholder)] hover:bg-[var(--flow-danger-soft)] hover:text-[var(--flow-danger)] disabled:opacity-40"
                                onClick={() => removeTagMutation.mutate(tag.id)}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {canEdit && (
                      <div className="mt-5 space-y-4 rounded-xl bg-[var(--flow-gray-50)] p-5">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            {boardTagsQuery.isLoading ? (
                              <p className="py-2 text-[13px] text-[var(--flow-text-muted)]">
                                보드 태그를 불러오는 중...
                              </p>
                            ) : boardTagsQuery.isError ? (
                              <button
                                type="button"
                                className="text-xs font-semibold text-[var(--flow-primary)]"
                                onClick={() => void boardTagsQuery.refetch()}
                              >
                                보드 태그 다시 불러오기
                              </button>
                            ) : availableTags.length === 0 ? (
                              <p className="py-2 text-[13px] text-[var(--flow-text-muted)]">
                                추가 가능한 기존 태그가 없습니다.
                              </p>
                            ) : (
                              <select
                                value={selectedTagId}
                                disabled={isTagBusy}
                                className="h-10 w-full rounded-xl border border-[var(--flow-border-strong)] bg-white px-3.5 text-[13px] text-[var(--flow-text-secondary)] transition-[border-color,box-shadow] outline-none focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)]"
                                onChange={(event) => setSelectedTagId(event.target.value)}
                              >
                                <option value="">기존 태그 선택</option>

                                {availableTags.map((tag) => (
                                  <option key={tag.id} value={tag.id}>
                                    {tag.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {availableTags.length > 0 &&
                            !boardTagsQuery.isLoading &&
                            !boardTagsQuery.isError && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={!selectedTagId || isTagBusy}
                                loading={addTagMutation.isPending}
                                onClick={handleAddTag}
                              >
                                추가
                              </Button>
                            )}
                        </div>

                        <div className="border-t border-[var(--flow-border)] pt-4">
                          <p className="mb-3 text-[11px] font-semibold text-[var(--flow-text-muted)]">
                            새 태그 만들기
                          </p>

                          <div className="grid grid-cols-[1fr_48px_auto] gap-3">
                            <input
                              type="text"
                              value={newTagName}
                              maxLength={30}
                              placeholder="예: QA, 보안, 디자인"
                              disabled={isTagBusy}
                              className="h-10 min-w-0 rounded-xl border border-[var(--flow-border-strong)] bg-white px-3.5 text-[13px] text-[var(--flow-text)] outline-none placeholder:text-[var(--flow-text-placeholder)] focus:border-[var(--flow-primary)] focus:ring-4 focus:ring-[var(--flow-focus-ring)]"
                              onChange={(event) => setNewTagName(event.target.value)}
                            />

                            <input
                              type="color"
                              value={newTagColor}
                              disabled={isTagBusy}
                              aria-label="새 태그 색상"
                              className="h-10 w-12 cursor-pointer rounded-xl border border-[var(--flow-border-strong)] bg-white p-1"
                              onChange={(event) => setNewTagColor(event.target.value)}
                            />

                            <Button
                              type="button"
                              size="sm"
                              disabled={!newTagName.trim() || isTagBusy}
                              loading={createTagMutation.isPending}
                              onClick={handleCreateTag}
                            >
                              만들기
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section className="border-b border-[var(--flow-border)] px-8 py-8">
                  <div className="mb-5">
                    <h3 className="text-base font-bold text-[var(--flow-text)]">체크리스트</h3>
                  </div>

                  <ChecklistSection cardId={card.id} canEdit={canEdit} />
                </section>

                <section className="px-6 py-6">
                  <div className="mb-5">
                    <h3 className="text-base font-bold text-[var(--flow-text)]">댓글</h3>
                  </div>

                  <CommentSection boardId={boardId} cardId={card.id} canEdit={canEdit} />
                </section>
              </>
            )}
          </div>

          {!editMode && card && (
            <footer className="flex h-[72px] shrink-0 items-center justify-between gap-4 border-t border-[var(--flow-border)] bg-white px-8">
              <div>
                {canEdit && (
                  <button
                    type="button"
                    className="inline-flex h-10 items-center rounded-xl px-4 text-[13px] font-semibold text-[var(--flow-danger)] transition-colors hover:bg-[var(--flow-danger-soft)]"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    작업 삭제
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                  닫기
                </Button>
              </div>
            </footer>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="작업 삭제"
        description={
          card
            ? `'${card.title}' 작업을 삭제합니다. 연결된 데이터도 함께 삭제될 수 있으며 되돌릴 수 없습니다.`
            : "작업을 삭제합니다. 되돌릴 수 없습니다."
        }
        confirmText="삭제"
        cancelText="취소"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </>
  );
}
