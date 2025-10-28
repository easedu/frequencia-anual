/**
 * Error Boundary para captura e tratamento de erros React
 * Implementa fallback UI e logging de erros
 */

"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log do erro
    logger.error('React Error Boundary caught an error', {
      errorId: this.state.errorId,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    }, error);

    // Callback customizado se fornecido
    this.props.onError?.(error, errorInfo);

    // Em desenvolvimento, também logar no console para debug
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary');
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: '',
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/home';
  };

  render() {
    if (this.state.hasError) {
      // Usar fallback customizado se fornecido
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback padrão
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-red-900">Oops! Algo deu errado</CardTitle>
              <CardDescription>
                Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada automaticamente.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    Detalhes do Erro (Desenvolvimento):
                  </h4>
                  <pre className="text-xs text-red-700 overflow-auto">
                    {this.state.error?.message}
                  </pre>
                  <p className="text-xs text-red-600 mt-2">
                    ID: {this.state.errorId}
                  </p>
                </div>
              )}

              <div className="flex flex-col space-y-2">
                <Button onClick={this.handleRetry} className="w-full" variant="default">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
                
                <Button onClick={this.handleReload} className="w-full" variant="outline">
                  Recarregar Página
                </Button>
                
                <Button onClick={this.handleGoHome} className="w-full" variant="ghost">
                  <Home className="w-4 h-4 mr-2" />
                  Ir para Início
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Se o problema persistir, entre em contato com o suporte técnico.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook para capturar erros assíncronos que não são capturados pelo Error Boundary
 */
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, context?: Record<string, unknown>) => {
    logger.error('Unhandled async error', context, error);

    // Em desenvolvimento, também mostrar no console
    if (process.env.NODE_ENV === 'development') {
      console.error('Unhandled async error:', error, context);
    }
  }, []);

  return { handleError };
};

/**
 * Componente de fallback mais simples para uso em componentes específicos
 */
export const ErrorFallback: React.FC<{
  error: Error;
  resetErrorBoundary: () => void;
}> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
      <div className="flex items-center mb-2">
        <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
        <h3 className="text-sm font-medium text-red-800">
          Erro ao carregar componente
        </h3>
      </div>
      
      {process.env.NODE_ENV === 'development' && (
        <p className="text-xs text-red-700 mb-3">
          {error.message}
        </p>
      )}
      
      <Button 
        onClick={resetErrorBoundary}
        size="sm"
        variant="outline"
        className="border-red-300 text-red-700 hover:bg-red-100"
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        Tentar Novamente
      </Button>
    </div>
  );
};