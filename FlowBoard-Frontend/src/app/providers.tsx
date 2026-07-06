import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import "@/api/interceptors";

import { queryClient } from "@/api/queryClient";

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
