import { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "../queryClient";  // ⬅️ fixed path
import { Toaster } from "sonner";

export function QueryProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Toast portal */}
      <Toaster richColors position="top-right" />
      {children}
      {!import.meta.env.PROD && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
