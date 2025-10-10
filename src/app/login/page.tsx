"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase.config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFriendlyErrorMessage } from "@/utils/errorMessages";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Lock, Eye, EyeOff, GraduationCap } from "lucide-react";
import { useAuth } from "@/components/layout/AuthProvider";
import { logger } from "@/utils/logger";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { isAuthenticated } = useAuth();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("Por favor, preencha todos os campos.");
            return;
        }

        setLoading(true);
        try {
            logger.info('🔐 Tentando fazer login...', { email });
            await signInWithEmailAndPassword(auth, email, password);
            logger.info('✅ Login realizado com sucesso');
            // O redirecionamento será feito automaticamente pelo AuthProvider
        } catch (err: unknown) {
            const errorInfo = err as { code?: string; message: string };
            const code = errorInfo.code || errorInfo.message;
            const friendlyError = getFriendlyErrorMessage(code);
            logger.error('❌ Erro no login:', { error: friendlyError, code });
            setError(friendlyError);
        } finally {
            setLoading(false);
        }
    }

    // Se usuário já está logado, não renderizar a página de login
    if (isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Redirecionando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 relative overflow-hidden">
            {/* Elementos decorativos de fundo */}
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25"></div>

            {/* Círculos decorativos flutuantes */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-purple-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>

            {/* Container principal centralizado */}
            <div className="relative flex min-h-screen items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Logo e título centralizados */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-300">
                                <GraduationCap className="w-10 h-10 text-white" />
                            </div>
                            <div className="text-left">
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Habib Control
                                </h1>
                                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                                    Sistema de Gestão Escolar
                                </p>
                            </div>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 mb-2">
                            Bem-vindo de volta!
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Acesse sua conta para continuar
                        </p>
                    </div>

                    {/* Card de login principal */}
                    <Card className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-0 shadow-2xl shadow-blue-500/10 dark:shadow-blue-400/10 rounded-3xl overflow-hidden">
                        {/* Header com gradiente */}
                        <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 p-6 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Lock className="w-5 h-5 text-blue-100" />
                                <h2 className="text-xl font-semibold text-white">
                                    Área Segura
                                </h2>
                            </div>
                            <p className="text-blue-100 text-sm">
                                Digite suas credenciais para acessar o sistema
                            </p>
                        </div>

                        <CardContent className="p-8 space-y-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Campo Email */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="email"
                                        className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"
                                    >
                                        <Mail className="w-4 h-4 text-blue-500" />
                                        Email
                                    </Label>
                                    <div className="relative group">
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="seuemail@exemplo.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="h-14 pl-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 rounded-xl transition-all duration-300 text-lg group-hover:border-blue-300 dark:group-hover:border-blue-500"
                                        />
                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                    </div>
                                </div>

                                {/* Campo Senha */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="password"
                                        className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"
                                    >
                                        <Lock className="w-4 h-4 text-blue-500" />
                                        Senha
                                    </Label>
                                    <div className="relative group">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Sua senha"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="h-14 pl-4 pr-12 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 rounded-xl transition-all duration-300 text-lg group-hover:border-blue-300 dark:group-hover:border-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                    </div>
                                </div>

                                {/* Mensagem de erro */}
                                {error && (
                                    <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-l-4 border-red-500 rounded-xl">
                                        <p className="text-sm text-red-700 dark:text-red-400 font-medium text-center">
                                            {error}
                                        </p>
                                    </div>
                                )}

                                {/* Botão de login */}
                                <Button
                                    type="submit"
                                    className="w-full h-14 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl hover:shadow-blue-500/25 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Entrando...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span>Entrar</span>
                                        </div>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Footer minimalista */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            © 2025 Habib Control • Sistema de Gestão Escolar • Power by EAS
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}