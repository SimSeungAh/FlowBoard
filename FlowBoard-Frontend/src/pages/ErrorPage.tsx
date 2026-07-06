import { isRouteErrorResponse, useRouteError } from "react-router";

import Button from "@/components/ui/Button";

export default function ErrorPage() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "알 수 없는 오류가 발생했습니다.";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <h1 className="text-4xl font-bold text-gray-900">Oops!</h1>

      <p className="mt-4 text-gray-600">{message}</p>

      <Button className="mt-8" onClick={() => window.location.replace("/")}>
        홈으로 돌아가기
      </Button>
    </main>
  );
}
