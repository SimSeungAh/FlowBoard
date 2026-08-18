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

const toggleNumber = (
  values: number[],
  value: number,
) =>
  values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];

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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="min-w-0">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-[var(--flow-text-secondary)]">
              담당자
            </h3>

            <p className="mt-1 text-[11px] leading-5 text-[var(--flow-text-muted)]">
              필요한 경우 여러 명을 선택할 수 있습니다.
            </p>
          </div>

          {selectedAssigneeUserIds.length > 0 && (
            <span className="shrink-0 text-[11px] font-semibold text-[var(--flow-primary)]">
              {selectedAssigneeUserIds.length}명 선택
            </span>
          )}
        </div>

        <div className="min-h-24 rounded-xl border border-[var(--flow-border)] bg-[var(--flow-gray-50)] p-3">
          {membersLoading ? (
            <p className="py-6 text-center text-xs text-[var(--flow-text-muted)]">
              보드 멤버를 불러오는 중...
            </p>
          ) : membersError ? (
            <div className="flex min-h-20 flex-col items-center justify-center gap-2 text-center">
              <p className="text-xs text-[var(--flow-text-muted)]">
                보드 멤버를 불러오지 못했습니다.
              </p>

              <button
                type="button"
                disabled={disabled}
                className="text-xs font-semibold text-[var(--flow-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onRetryMembers}
              >
                다시 불러오기
              </button>
            </div>
          ) : members.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--flow-text-muted)]">
              선택할 수 있는 보드 멤버가 없습니다.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const selected =
                  selectedAssigneeUserIds.includes(
                    member.userId,
                  );

                return (
                  <button
                    key={member.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    title={`${member.nickname} · ${member.email}`}
                    className={cn(
                      "flex max-w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flow-primary)] focus-visible:ring-offset-2",
                      selected
                        ? "border-[var(--flow-primary)] bg-[var(--flow-primary-50)]"
                        : "border-[var(--flow-border)] bg-white hover:border-[var(--flow-gray-300)]",
                      disabled &&
                        "cursor-not-allowed opacity-60",
                    )}
                    onClick={() =>
                      onAssigneeUserIdsChange(
                        toggleNumber(
                          selectedAssigneeUserIds,
                          member.userId,
                        ),
                      )
                    }
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        selected
                          ? "bg-[var(--flow-primary)] text-white"
                          : "bg-[var(--flow-gray-100)] text-[var(--flow-text-secondary)]",
                      )}
                    >
                      {member.nickname
                        .charAt(0)
                        .toUpperCase()}
                    </span>

                    <span className="min-w-0">
                      <span className="block max-w-36 truncate text-[12px] font-semibold text-[var(--flow-text-secondary)]">
                        {member.nickname}
                      </span>

                      <span className="block text-[10px] text-[var(--flow-text-placeholder)]">
                        {member.role}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="min-w-0">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-[var(--flow-text-secondary)]">
              태그
            </h3>

            <p className="mt-1 text-[11px] leading-5 text-[var(--flow-text-muted)]">
              보드에 이미 만들어진 태그를 선택합니다.
            </p>
          </div>

          {selectedTagIds.length > 0 && (
            <span className="shrink-0 text-[11px] font-semibold text-[var(--flow-primary)]">
              {selectedTagIds.length}개 선택
            </span>
          )}
        </div>

        <div className="min-h-24 rounded-xl border border-[var(--flow-border)] bg-[var(--flow-gray-50)] p-3">
          {tagsLoading ? (
            <p className="py-6 text-center text-xs text-[var(--flow-text-muted)]">
              보드 태그를 불러오는 중...
            </p>
          ) : tagsError ? (
            <div className="flex min-h-20 flex-col items-center justify-center gap-2 text-center">
              <p className="text-xs text-[var(--flow-text-muted)]">
                보드 태그를 불러오지 못했습니다.
              </p>

              <button
                type="button"
                disabled={disabled}
                className="text-xs font-semibold text-[var(--flow-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onRetryTags}
              >
                다시 불러오기
              </button>
            </div>
          ) : tags.length === 0 ? (
            <p className="py-6 text-center text-xs leading-5 text-[var(--flow-text-muted)]">
              아직 보드 태그가 없습니다.
              <br />
              태그는 작업 상세에서 만들 수 있습니다.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected =
                  selectedTagIds.includes(tag.id);

                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    className={cn(
                      "inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border px-3 text-[12px] font-semibold transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flow-primary)] focus-visible:ring-offset-2",
                      selected
                        ? "border-[var(--flow-primary)] bg-[var(--flow-primary-50)] text-[var(--flow-text)]"
                        : "border-[var(--flow-border)] bg-white text-[var(--flow-text-secondary)] hover:border-[var(--flow-gray-300)]",
                      disabled &&
                        "cursor-not-allowed opacity-60",
                    )}
                    onClick={() =>
                      onTagIdsChange(
                        toggleNumber(
                          selectedTagIds,
                          tag.id,
                        ),
                      )
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: tag.color,
                      }}
                    />

                    <span className="truncate">
                      {tag.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}