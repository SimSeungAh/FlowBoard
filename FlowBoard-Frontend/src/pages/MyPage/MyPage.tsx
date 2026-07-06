import { useQuery } from "@tanstack/react-query";

import { getMyInfo } from "@/api/auth";

export default function MyPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: getMyInfo,
  });

  if (isLoading) {
    return <p>불러오는 중...</p>;
  }

  if (isError || !data) {
    return <p>사용자 정보를 불러오지 못했습니다.</p>;
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">마이페이지</h1>

      <div className="space-y-3 rounded-lg border p-6">
        <p>
          <strong>이메일</strong> : {data.email}
        </p>

        <p>
          <strong>닉네임</strong> : {data.nickname}
        </p>

        <p>
          <strong>권한</strong> : {data.role}
        </p>
      </div>
    </section>
  );
}
