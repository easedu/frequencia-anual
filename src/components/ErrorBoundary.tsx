'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackUI?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 *
 * Captura erros no React tree e exibe UI de fallback
 * Previne que a aplicação inteira quebre por erros isolados
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * @example Com UI customizada
 * ```tsx
 * <ErrorBoundary fallbackUI={<CustomError />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error details:', errorInfo);
    }

    // Call optional error callback
    this.props.onError?.(error, errorInfo);

    // Update state with error details
    this.setState({
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/home';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallbackUI, showDetails = process.env.NODE_ENV === 'development' } = this.props;

    if (hasError) {
      // Use custom fallback UI if provided
      if (fallbackUI) {
        return fallbackUI;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8" />
                <CardTitle className="text-2xl">Ops! Algo deu errado</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <p className="text-slate-700 text-lg">
                  Ocorreu um erro inesperado ao carregar esta página.
                </p>
                <p className="text-slate-600">
                  Nossa equipe foi notificada e está trabalhando para resolver o problema.
                </p>
              </div>

              {/* Error details (only in development) */}
              {showDetails && error && (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Detalhes do Erro (apenas em desenvolvimento):
                  </p>
                  <pre className="text-xs text-red-600 dark:text-red-400 overflow-x-auto whitespace-pre-wrap break-words">
                    {error.toString()}
                  </pre>
                  {errorInfo && (
                    <details className="text-xs text-slate-600 dark:text-slate-400">
                      <summary className="cursor-pointer hover:text-slate-800 dark:hover:text-slate-200">
                        Ver Stack Trace
                      </summary>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={this.handleReset}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                  size="lg"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Tentar Novamente
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Voltar ao Início
                </Button>
              </div>

              <div className="text-center text-sm text-slate-500">
                Se o problema persistir, entre em contato com o suporte.
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook-based wrapper for functional components
 * Nota: ErrorBoundary deve ser um class component, mas podemos criar
 * um wrapper funcional para melhor DX
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}
