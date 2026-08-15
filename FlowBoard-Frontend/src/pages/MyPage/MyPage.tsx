import {
  useQuery,
} from "@tanstack/react-query";

import {
  getMyInfo,
} from "@/api/auth";
import ThemePicker from "@/components/theme/ThemePicker";
import Skeleton from "@/components/ui/Skeleton";

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="12"
        cy="8"
        r="3.25"
      />

      <path d="M5.75 19c.75-3.3 3-5 6.25-5s5.5 1.7 6.25 5" />
    </svg>
  );
}

function AccountRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[150px_1fr] items-center border-b border-[var(--flow-border)] py-4 last:border-b-0">
      <dt className="text-xs font-semibold text-[var(--flow-text-muted)]">
        {label}
      </dt>

      <dd className="text-sm font-medium text-[var(--flow-text)]">
        {value}
      </dd>
    </div>
  );
}

function MyPageSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[1120px] px-8 py-10">
      <Skeleton className="h-7 w-32" />

      <Skeleton className="mt-3 h-4 w-64" />

      <div className="mt-8 rounded-xl border border-[var(--flow-border)] bg-white p-6">
        <Skeleton className="h-5 w-28" />

        <div className="mt-6 space-y-5">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-[var(--flow-border)] bg-white p-6">
        <Skeleton className="h-5 w-24" />

        <Skeleton className="mt-3 h-4 w-96" />

        <div className="mt-6 grid grid-cols-4 gap-4">
          {Array.from({
            length: 8,
          }).map(
            (
              _,
              index,
            ) => (
              <Skeleton
                key={
                  index
                }
                className="h-[155px] w-full rounded-xl"
              />
            ),
          )}
        </div>
      </div>
    </section>
  );
}

export default function MyPage() {
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "me",
    ],
    queryFn:
      getMyInfo,
  });

  if (isLoading) {
    return (
      <MyPageSkeleton />
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1120px] px-8 py-10">
      <div>
        <p className="text-xs font-semibold text-[var(--flow-primary)]">
          SETTINGS
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-[-0.025em] text-[var(--flow-text)]">
          마이페이지
        </h1>

        <p className="mt-2 text-sm text-[var(--flow-text-muted)]">
          계정 정보를 확인하고
          FlowBoard의 화면 테마를
          설정할 수 있습니다.
        </p>
      </div>

      {isError ||
      !data ? (
        <div className="mt-8 rounded-xl border border-red-200 bg-white px-6 py-5">
          <p className="text-sm font-semibold text-[var(--flow-text)]">
            사용자 정보를 불러오지
            못했습니다.
          </p>

          <p className="mt-1 text-xs text-[var(--flow-text-muted)]">
            잠시 후 다시
            시도해주세요.
          </p>

          <button
            type="button"
            onClick={() =>
              void refetch()
            }
            className="mt-4 text-xs font-semibold text-[var(--flow-primary)] hover:underline"
          >
            다시 불러오기
          </button>
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-[var(--flow-border)] bg-white px-6 py-5 shadow-[var(--flow-shadow-xs)]">
          <div className="flex items-center gap-3 border-b border-[var(--flow-border)] pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--flow-primary-50)] text-[var(--flow-primary)]">
              <UserIcon />
            </div>

            <div>
              <h2 className="text-base font-bold text-[var(--flow-text)]">
                계정 정보
              </h2>

              <p className="mt-0.5 text-xs text-[var(--flow-text-muted)]">
                현재 로그인된
                FlowBoard 계정입니다.
              </p>
            </div>
          </div>

          <dl>
            <AccountRow
              label="이메일"
              value={
                data.email
              }
            />

            <AccountRow
              label="닉네임"
              value={
                data.nickname
              }
            />

            <AccountRow
              label="계정 권한"
              value={
                data.role
              }
            />
          </dl>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-[var(--flow-border)] bg-white p-6 shadow-[var(--flow-shadow-xs)]">
        <ThemePicker />
      </div>
    </section>
  );
}