import type { FallbackProps } from "react-error-boundary";

import Button from "@/components/ui/Button";

export default function ErrorFallback(props: FallbackProps) {
  const { error, resetErrorBoundary } = props;

  return (
    <>
      <p>{error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."}</p>

      <Button onClick={resetErrorBoundary}>다시 시도</Button>
    </>
  );
}
