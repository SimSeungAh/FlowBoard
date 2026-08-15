import { Link } from "react-router";

import { useAuthStore } from "@/store/authStore";

const features = [
  {
    number: "01",
    title: "실시간 칸반",
    description:
      "카드 생성, 수정, 이동이 참여자의 화면에 실시간으로 반영됩니다.",
  },
  {
    number: "02",
    title: "Drag & Drop · LexoRank",
    description:
      "직관적인 드래그 앤 드롭과 효율적인 순서 관리로 업무 흐름을 정리합니다.",
  },
  {
    number: "03",
    title: "팀 협업과 권한 관리",
    description:
      "OWNER, MEMBER, VIEWER 권한을 나누어 안전하게 보드를 함께 관리합니다.",
  },
  {
    number: "04",
    title: "실시간 화이트보드",
    description:
      "업무 보드 안에서 아이디어를 그리고 참여자와 즉시 공유할 수 있습니다.",
  },
];

const demoColumns = [
  {
    title: "할 일",
    count: 3,
    cards: [
      {
        title: "로그인 화면 개선",
        tag: "Design",
        tagClassName:
          "bg-violet-50 text-violet-700",
      },
      {
        title: "검색 필터 연결",
        tag: "Frontend",
        tagClassName:
          "bg-blue-50 text-blue-700",
      },
      {
        title: "팀원 초대 UX",
        tag: "UX",
        tagClassName:
          "bg-amber-50 text-amber-700",
      },
    ],
  },
  {
    title: "진행 중",
    count: 2,
    cards: [
      {
        title: "카드 이동 실시간 동기화",
        tag: "WebSocket",
        tagClassName:
          "bg-emerald-50 text-emerald-700",
      },
      {
        title: "화이트보드 구현",
        tag: "Canvas",
        tagClassName:
          "bg-cyan-50 text-cyan-700",
      },
    ],
  },
  {
    title: "완료",
    count: 2,
    cards: [
      {
        title: "ERD 설계",
        tag: "Backend",
        tagClassName:
          "bg-slate-100 text-slate-700",
      },
      {
        title: "JWT 인증",
        tag: "Security",
        tagClassName:
          "bg-rose-50 text-rose-700",
      },
    ],
  },
];

export default function HomePage() {
  const isLogin = useAuthStore(
    (state) => state.isLogin,
  );

  return (
    <div className="w-full bg-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="pointer-events-none absolute left-[18%] top-[8%] h-[420px] w-[420px] rounded-full bg-blue-100/50 blur-[110px]" />

        <div className="pointer-events-none absolute right-[8%] top-[18%] h-[360px] w-[360px] rounded-full bg-sky-100/60 blur-[120px]" />

        <div className="relative mx-auto grid min-h-[680px] w-full max-w-[1320px] grid-cols-[0.82fr_1.18fr] items-center gap-20 px-10 py-24">
          {/* HERO TEXT */}
          <div className="max-w-[520px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              실시간 협업 칸반보드
            </div>

            <h1 className="mt-8 text-[58px] font-bold leading-[1.12] tracking-[-0.045em] text-slate-950">
              팀의 흐름을
              <br />
              한눈에,
              <br />
              <span className="text-blue-600">
                실시간으로.
              </span>
            </h1>

            <p className="mt-7 max-w-[500px] text-[17px] leading-8 text-slate-500">
              카드 기반 업무 관리부터 실시간
              동기화와 화이트보드까지.
              <br />
              팀의 작업과 아이디어를 하나의
              보드에서 관리하세요.
            </p>

            <div className="mt-9 flex items-center gap-3">
              {isLogin ? (
                <>
                  <Link
                    to="/boards"
                    className="inline-flex h-12 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                  >
                    내 보드 보기

                    <span
                      className="ml-2"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </Link>

                  <a
                    href="#features"
                    className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
                  >
                    주요 기능 보기
                  </a>
                </>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="inline-flex h-12 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                  >
                    무료로 시작하기

                    <span
                      className="ml-2"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </Link>

                  <Link
                    to="/login"
                    className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
                  >
                    로그인
                  </Link>
                </>
              )}
            </div>

            <div className="mt-10 flex items-center gap-6 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-2">
                <span className="text-blue-600">
                  ✓
                </span>
                실시간 카드 동기화
              </span>

              <span className="flex items-center gap-2">
                <span className="text-blue-600">
                  ✓
                </span>
                권한별 협업
              </span>

              <span className="flex items-center gap-2">
                <span className="text-blue-600">
                  ✓
                </span>
                Canvas 화이트보드
              </span>
            </div>
          </div>

          {/* DEMO BOARD */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[40px] bg-gradient-to-br from-blue-100/70 via-sky-50 to-slate-50 blur-3xl" />

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
              <div className="flex h-[74px] items-center justify-between border-b border-slate-200 px-6">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    FlowBoard 개발
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Product Development
                  </p>
                </div>

                <div className="flex -space-x-2">
                  {["S", "J", "M"].map(
                    (name) => (
                      <span
                        key={name}
                        className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-slate-800 text-xs font-bold text-white"
                      >
                        {name}
                      </span>
                    ),
                  )}

                  <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-blue-50 text-xs font-bold text-blue-700">
                    +2
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-5">
                <div className="grid grid-cols-3 gap-4">
                  {demoColumns.map(
                    (column) => (
                      <div
                        key={
                          column.title
                        }
                        className="rounded-xl bg-slate-100/80 p-3.5"
                      >
                        <div className="mb-3 flex items-center justify-between px-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">
                              {
                                column.title
                              }
                            </span>

                            <span className="text-[10px] font-medium text-slate-400">
                              {
                                column.count
                              }
                            </span>
                          </div>

                          <span className="text-sm leading-none text-slate-400">
                            ···
                          </span>
                        </div>

                        <div className="space-y-3">
                          {column.cards.map(
                            (card) => (
                              <div
                                key={
                                  card.title
                                }
                                className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
                              >
                                <span
                                  className={`inline-flex rounded-md px-2 py-1 text-[9px] font-semibold ${card.tagClassName}`}
                                >
                                  {
                                    card.tag
                                  }
                                </span>

                                <p className="mt-2.5 text-[12px] font-bold leading-5 text-slate-800">
                                  {
                                    card.title
                                  }
                                </p>

                                <div className="mt-4 flex items-center justify-between">
                                  <div className="flex -space-x-1">
                                    <span className="h-5 w-5 rounded-full border-2 border-white bg-blue-500" />
                                    <span className="h-5 w-5 rounded-full border-2 border-white bg-sky-400" />
                                  </div>

                                  <span className="text-[9px] text-slate-400">
                                    오늘
                                  </span>
                                </div>
                              </div>
                            ),
                          )}

                          {column.title !==
                            "완료" && (
                            <button
                              type="button"
                              tabIndex={-1}
                              className="h-9 w-full rounded-lg border border-dashed border-slate-300 bg-white/50 text-[10px] font-medium text-slate-400"
                            >
                              + 카드 추가
                            </button>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="flex h-[48px] items-center justify-between border-t border-slate-200 bg-white px-6">
                <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  실시간 연결됨
                </div>

                <span className="text-[10px] text-slate-400">
                  모든 변경사항 저장됨
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="bg-white"
      >
        <div className="mx-auto w-full max-w-[1240px] px-10 py-28">
          <div className="max-w-[660px]">
            <p className="text-xs font-bold tracking-[0.14em] text-blue-600">
              WHY FLOWBOARD
            </p>

            <h2 className="mt-5 text-[38px] font-bold leading-[1.28] tracking-[-0.035em] text-slate-950">
              협업에 필요한 흐름을
              <br />
              하나의 보드에 담았습니다.
            </h2>

            <p className="mt-5 text-[15px] leading-7 text-slate-500">
              업무 관리와 실시간 커뮤니케이션을
              따로 나누지 않고,
              <br />
              보드를 중심으로 자연스럽게
              이어집니다.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-6">
            {features.map(
              (feature) => (
                <article
                  key={
                    feature.number
                  }
                  className="min-h-[220px] rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-600">
                    {
                      feature.number
                    }
                  </div>

                  <h3 className="mt-7 text-xl font-bold tracking-[-0.02em] text-slate-900">
                    {
                      feature.title
                    }
                  </h3>

                  <p className="mt-3 max-w-[460px] text-sm leading-7 text-slate-500">
                    {
                      feature.description
                    }
                  </p>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      {/* REALTIME */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid min-h-[600px] w-full max-w-[1240px] grid-cols-[0.9fr_1.1fr] items-center gap-24 px-10 py-28">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-blue-600">
              REAL-TIME COLLABORATION
            </p>

            <h2 className="mt-5 text-[38px] font-bold leading-[1.28] tracking-[-0.035em] text-slate-950">
              다른 사람이 움직인
              카드가
              <br />
              내 화면에도 바로.
            </h2>

            <p className="mt-6 max-w-[500px] text-[15px] leading-8 text-slate-500">
              WebSocket을 기반으로 카드 생성,
              수정, 삭제와 이동을 실시간으로
              공유합니다.
              <br />
              댓글과 화이트보드 역시 같은 보드의
              참여자와 즉시 동기화됩니다.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
            <div className="space-y-0">
              <div className="flex items-center gap-5 rounded-xl bg-blue-50 px-5 py-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  1
                </span>

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    사용자가 카드를 이동
                  </p>

                  <p className="mt-1.5 text-xs leading-5 text-slate-500">
                    Drag & Drop으로 위치와 순서를
                    변경합니다.
                  </p>
                </div>
              </div>

              <div className="ml-[41px] h-8 border-l-2 border-dashed border-blue-200" />

              <div className="flex items-center gap-5 rounded-xl bg-slate-50 px-5 py-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">
                  2
                </span>

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    서버에 변경사항 저장
                  </p>

                  <p className="mt-1.5 text-xs leading-5 text-slate-500">
                    LexoRank를 계산하고 변경
                    이벤트를 발행합니다.
                  </p>
                </div>
              </div>

              <div className="ml-[41px] h-8 border-l-2 border-dashed border-blue-200" />

              <div className="flex items-center gap-5 rounded-xl bg-emerald-50 px-5 py-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                  3
                </span>

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    참여자 화면에 즉시 반영
                  </p>

                  <p className="mt-1.5 text-xs leading-5 text-slate-500">
                    페이지 새로고침 없이 동일한
                    상태를 확인합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-[1240px] px-10 py-28">
          <div className="relative overflow-hidden rounded-[24px] bg-slate-950 px-12 py-20 text-center">
            <div className="pointer-events-none absolute left-1/2 top-0 h-[260px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[100px]" />

            <div className="relative">
              <p className="text-xs font-bold tracking-[0.14em] text-blue-400">
                FLOWBOARD
              </p>

              <h2 className="mt-5 text-[38px] font-bold leading-[1.3] tracking-[-0.035em] text-white">
                아이디어부터 완료까지,
                <br />
                하나의 보드에서.
              </h2>

              <p className="mx-auto mt-5 max-w-[560px] text-sm leading-7 text-slate-400">
                업무의 진행 상황과 팀의 아이디어를
                한눈에 확인하고
                <br />
                같은 공간에서 함께 업데이트하세요.
              </p>

              <div className="mt-9">
                <Link
                  to={
                    isLogin
                      ? "/boards"
                      : "/signup"
                  }
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-blue-600 px-7 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  {isLogin
                    ? "내 보드로 이동"
                    : "FlowBoard 시작하기"}

                  <span
                    className="ml-2"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}