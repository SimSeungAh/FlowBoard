import { ErrorBoundary } from "react-error-boundary";
import { Toaster } from "sonner";

import ErrorFallback from "@/app/ErrorFallback";
import AppProviders from "@/app/providers";
import AppRouter from "@/routes/AppRouter";

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AppProviders>
        <AppRouter />
        <Toaster richColors position="top-center" />
      </AppProviders>
    </ErrorBoundary>
  );
}
