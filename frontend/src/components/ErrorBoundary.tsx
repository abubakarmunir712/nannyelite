import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <div className="min-h-screen bg-secondary flex items-center justify-center px-6">
    <div className="bg-card rounded-xl border border-border p-8 max-w-md w-full text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <h1 className="font-display text-xl font-bold text-foreground">
        Something went wrong
      </h1>
      <p className="text-sm text-muted-foreground">
        We've been notified and are working to fix this issue. Please try again.
      </p>
      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={resetErrorBoundary} className="rounded-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
        <Button
          variant="ghost"
          className="rounded-full"
          onClick={() => (window.location.href = "/")}
        >
          Go to Homepage
        </Button>
      </div>
      {import.meta.env.DEV && (
        <details className="mt-4 text-left">
          <summary className="text-xs text-muted-foreground cursor-pointer">
            Error details (dev only)
          </summary>
          <pre className="mt-2 text-xs text-destructive bg-destructive/5 rounded p-3 overflow-auto max-h-40 whitespace-pre-wrap">
            {error.message}
            {"\n\n"}
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  </div>
);

export const AppErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <Sentry.ErrorBoundary
    fallback={({ error, resetError }) => (
      <ErrorFallback error={error as Error} resetErrorBoundary={resetError} />
    )}
    showDialog={import.meta.env.PROD}
  >
    {children}
  </Sentry.ErrorBoundary>
);

export default AppErrorBoundary;
