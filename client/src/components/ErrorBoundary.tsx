import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs them, and displays a fallback UI instead of crashing the whole app.
 */
class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);

        // Call optional error handler
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // In production, you could send this to an error tracking service
        // Example: Sentry.captureException(error, { extra: errorInfo });
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            // Custom fallback provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="min-h-[200px] flex flex-col items-center justify-center p-8 bg-black/20 rounded-lg border border-white/10">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                    <h2 className="text-lg font-semibold text-white mb-2">
                        Algo deu errado
                    </h2>
                    <p className="text-sm text-white/60 mb-4 text-center max-w-md">
                        Ocorreu um erro inesperado. Você pode tentar novamente ou recarregar a página.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={this.handleReset}
                            className="border-white/20 hover:bg-white/10"
                        >
                            Tentar Novamente
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={this.handleReload}
                            className="gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Recarregar Página
                        </Button>
                    </div>
                    {process.env.NODE_ENV === "development" && this.state.error && (
                        <details className="mt-4 w-full max-w-lg">
                            <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60">
                                Detalhes técnicos
                            </summary>
                            <pre className="mt-2 p-3 bg-black/40 rounded text-xs text-red-400 overflow-auto">
                                {this.state.error.message}
                                {"\n\n"}
                                {this.state.error.stack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
