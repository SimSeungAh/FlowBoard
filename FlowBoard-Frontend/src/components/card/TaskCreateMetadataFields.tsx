import type { BoardMemberResponse } from "@/api/cardAssignee";
import type { TagResponse } from "@/api/tag";
import { cn } from "@/utils/cn";

interface TaskCreateMetadataFieldsProps {
  members: BoardMemberResponse[];
  tags: TagResponse[];
  selectedAssigneeUserIds: number[];
  selectedTagIds: number[];
  membersLoading: boolean;
  membersError: boolean;
  tagsLoading: boolean;
  tagsError: boolean;
  disabled?: boolean;
  onAssigneeUserIdsChange: (userIds: number[]) => void;
  onTagIdsChange: (tagIds: number[]) => void;
  onRetryMembers: () => void;
  onRetryTags: () => void;
}

const toggleNumber = (values: number[], value: number) =>
  values.includes(value) ? values.filter((current) => current !== value) : [...values, value];

function RetryButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="mt-2 text-[11px] font-semibold text-[var(--flow-primary)] disabled:cursor-not-allowed disabled:opacity-50"
      onClick={onClick}
    >
      다시 불러오기
    </button>
  );
}

export default function TaskCreateMetadataFields({
  members,
  tags,
  selectedAssigneeUserIds,
  selectedTagIds,
  membersLoading,
  membersError,
  tagsLoading,
  tagsError,
  disabled = false,
  onAssigneeUserIdsChange,
  onTagIdsChange,
  onRetryMembers,
  onRetryTags,
}: TaskCreateMetadataFieldsProps) {
  return (
    <div className="space-y-5">
      {/* Assignees */}
      <section>
        <div className="mb-2.5 flex items-center justify-between gap-4">
          <h3 className="text-[12px] font-bold text-[var(--flow-text)]">담당자</h3>

          {selectedAssigneeUserIds.length > 0 && (
            <span className="text-[10px] font-semibold text-[var(--flow-primary)]">
              {selectedAssigneeUserIds.length}명 선택
            </span>
          )}
        </div>

        {membersLoading ? (
          <div className="rounded-xl bg-[var(--flow-gray-50)] px-4 py-4 text-[11px] text-[var(--flow-text-muted)]">
            보드 멤버를 불러오는 중...
          </div>
        ) : membersError ? (
          <div className="rounded-xl border border-[var(--flow-border)] bg-[var(--flow-gray-50)] px-4 py-3">
            <p className="text-[11px] text-[var(--flow-text-muted)]">
              보드 멤버를 불러오지 못했습니다.
            </p>

            <RetryButton disabled={disabled} onClick={onRetryMembers} />
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-xl bg-[var(--flow-gray-50)] px-4 py-4 text-[11px] text-[var(--flow-text-muted)]">
            선택할 수 있는 보드 멤버가 없습니다.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map((member) => {
              const selected = selectedAssigneeUserIds.includes(member.userId);

              return (
                <button
                  key={member.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  title={`${member.nickname} · ${member.email} · ${member.role}`}
                  className={cn(
                    "inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border py-1 pr-3 pl-1",
                    "transition-[border-color,background-color]",
                    "focus-visible:outline-none",
                    "focus-visible:ring-2",
                    "focus-visible:ring-[var(--flow-primary)]",
                    "focus-visible:ring-offset-2",
                    selected
                      ? ["border-[var(--flow-primary)]", "bg-[var(--flow-primary-50)]"]
                      : [
                          "border-[var(--flow-border)]",
                          "bg-white",
                          "hover:border-[var(--flow-primary-200)]",
                        ],
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                  onClick={() =>
                    onAssigneeUserIdsChange(toggleNumber(selectedAssigneeUserIds, member.userId))
                  }
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      "text-[10px] font-bold",
                      selected
                        ? "bg-[var(--flow-primary)] text-white"
                        : "bg-[var(--flow-gray-100)] text-[var(--flow-text-secondary)]",
                    )}
                  >
                    {member.nickname.charAt(0).toUpperCase()}
                  </span>

                  <span className="max-w-28 truncate text-[11px] font-semibold text-[var(--flow-text-secondary)]">
                    {member.nickname}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Tags */}
      <section>
        <div className="mb-2.5 flex items-center justify-between gap-4">
          <h3 className="text-[12px] font-bold text-[var(--flow-text)]">태그</h3>

          {selectedTagIds.length > 0 && (
            <span className="text-[10px] font-semibold text-[var(--flow-primary)]">
              {selectedTagIds.length}개 선택
            </span>
          )}
        </div>

        {tagsLoading ? (
          <div className="rounded-xl bg-[var(--flow-gray-50)] px-4 py-4 text-[11px] text-[var(--flow-text-muted)]">
            태그를 불러오는 중...
          </div>
        ) : tagsError ? (
          <div className="rounded-xl border border-[var(--flow-border)] bg-[var(--flow-gray-50)] px-4 py-3">
            <p className="text-[11px] text-[var(--flow-text-muted)]">
              보드 태그를 불러오지 못했습니다.
            </p>

            <RetryButton disabled={disabled} onClick={onRetryTags} />
          </div>
        ) : tags.length === 0 ? (
          <div className="rounded-xl bg-[var(--flow-gray-50)] px-4 py-4 text-[11px] leading-5 text-[var(--flow-text-muted)]">
            아직 보드에 만들어진 태그가 없습니다.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);

              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  className={cn(
                    "inline-flex min-h-8 max-w-full items-center gap-2 rounded-full border px-3",
                    "text-[11px] font-semibold",
                    "transition-[border-color,background-color]",
                    "focus-visible:outline-none",
                    "focus-visible:ring-2",
                    "focus-visible:ring-[var(--flow-primary)]",
                    "focus-visible:ring-offset-2",
                    selected
                      ? [
                          "border-[var(--flow-primary)]",
                          "bg-[var(--flow-primary-50)]",
                          "text-[var(--flow-text)]",
                        ]
                      : [
                          "border-[var(--flow-border)]",
                          "bg-white",
                          "text-[var(--flow-text-secondary)]",
                          "hover:border-[var(--flow-primary-200)]",
                        ],
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                  onClick={() => onTagIdsChange(toggleNumber(selectedTagIds, tag.id))}
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: tag.color,
                    }}
                  />

                  <span className="truncate">{tag.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
