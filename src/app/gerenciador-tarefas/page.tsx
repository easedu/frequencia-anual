"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/firebase.config";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { logger } from "@/utils/logger";
import TaskManager from "@/components/TaskManager";

type Role = "admin" | "super-user" | "user" | "user-pcd";

export default function GerenciadorTarefas() {
    const router = useRouter();
    const [role, setRole] = useState<Role | null>(null);
    const [userId, setUserId] = useState<string>("");

    useEffect(() => {
        const fetchUserRole = async () => {
            if (!auth.currentUser) {
                router.push("/login");
                return;
            }

            try {
                const uid = auth.currentUser.uid;
                setUserId(uid);
                const q = query(collection(db, "users"), where("uid", "==", uid));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const data = querySnapshot.docs[0].data();
                    const userRole = (data.perfil as Role) || "user";
                    setRole(userRole);
                } else {
                    setRole("user");
                }
            } catch (error) {
                logger.error("Erro ao buscar usuário", error as Error);
                setRole("user");
            }
        };

        fetchUserRole();
    }, [router]);

    if (role === null) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 flex items-center justify-center">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Carregando...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Usuários PcD não têm acesso ao gerenciador de tarefas
    if (role === "user-pcd") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 flex items-center justify-center">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl text-center">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                        Acesso Restrito
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Este módulo não está disponível para seu perfil de usuário.
                    </p>
                    <button
                        onClick={() => router.push("/home")}
                        className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25"></div>

            <div className="relative container mx-auto px-4 py-8">
                {/* Task Manager */}
                {userId && (
                    <TaskManager userId={userId} userRole={role} />
                )}
            </div>
        </div>
    );
}