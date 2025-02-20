"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase.config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { getFriendlyErrorMessage } from "@/utils/errorMessages";

// Importando componentes de Card (do shadcn/ui ou customizados)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("Por favor, preencha todos os campos.");
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/home");
        } catch (err: unknown) {
            const errorInfo = err as { code?: string; message: string };
            const code = errorInfo.code || errorInfo.message;
            setError(getFriendlyErrorMessage(code));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
            <Card className="w-full max-w-sm shadow-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Bem-vindo(a)!</CardTitle>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Acesse sua conta
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-1">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seuemail@exemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="transition-colors focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Sua senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="transition-colors focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Entrando..." : "Entrar"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}