"use client";

import { useState, useEffect } from "react";
import { CustomCard } from "@/components/CustomCard";
import { auth, db } from "@/firebase.config";
import { useRouter } from "next/navigation";
import { CheckCircle, UserPlus, Calendar, BarChart, UserCheck, Shield, CalendarX, Accessibility, FileSpreadsheet, Clock, Users, GraduationCap, Zap } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";

// Define os tipos possíveis para o perfil do usuário
type Role = "admin" | "super-user" | "user";

export default function Home() {
    const router = useRouter();
    const [role, setRole] = useState<Role | null>(null);
    const [userName, setUserName] = useState<string>("");
    const [currentTime, setCurrentTime] = useState<string>("");

    useEffect(() => {
        const fetchUserRole = async () => {
            if (!auth.currentUser) {
                router.push("/login");
                return;
            }

            try {
                const uid = auth.currentUser.uid;
                const q = query(collection(db, "users"), where("uid", "==", uid));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const data = querySnapshot.docs[0].data();
                    const userRole = (data.perfil as Role) || "user";
                    setRole(userRole);
                    setUserName(data.name || auth.currentUser?.displayName || auth.currentUser?.email || "Usuário");
                } else {
                    setRole("user");
                    setUserName(auth.currentUser?.displayName || auth.currentUser?.email || "Usuário");
                }
            } catch (error) {
                console.error("Erro ao buscar usuário:", error);
                setRole("user");
                setUserName(auth.currentUser?.displayName || auth.currentUser?.email || "Usuário");
            }
        };

        fetchUserRole();
    }, [router]);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }));
        };

        updateTime();
        const interval = setInterval(updateTime, 60000); // Atualiza a cada minuto

        return () => clearInterval(interval);
    }, []);

    const getRoleInfo = () => {
        switch (role) {
            case "admin":
                return {
                    title: "Administrador",
                    description: "Acesso completo ao sistema",
                    color: "from-red-500 to-red-600",
                    icon: Shield
                };
            case "super-user":
                return {
                    title: "Super Usuário",
                    description: "Acesso avançado às funcionalidades",
                    color: "from-purple-500 to-purple-600",
                    icon: Zap
                };
            default:
                return {
                    title: "Usuário",
                    description: "Acesso às funcionalidades básicas",
                    color: "from-blue-500 to-blue-600",
                    icon: Users
                };
        }
    };

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

    const roleInfo = getRoleInfo();

    const getCards = () => {
        if (role === "user") {
            return [
                <CustomCard
                    key="marcar-faltas"
                    title="Registrar Faltas Agora"
                    icon={CheckCircle}
                    href="/marcar-faltas"
                    color="green"
                />,
                <CustomCard
                    key="controlar-faltas"
                    title="Monitorar Faltas da UE"
                    icon={BarChart}
                    href="/controlar-faltas"
                    color="teal"
                />,
                <CustomCard
                    key="perfil-estudante"
                    title="Perfil do Estudante"
                    icon={UserCheck}
                    href="/perfil-estudante"
                    color="blue"
                />,
                <CustomCard
                    key="cadastro-estudante"
                    title="Cadastro de Estudantes"
                    icon={UserPlus}
                    href="/cadastrar-estudante"
                    color="purple"
                />,
            ];
        }

        if (role === "super-user") {
            return [
                <CustomCard
                    key="cadastro-estudante"
                    title="Cadastro de Estudantes"
                    icon={UserPlus}
                    href="/cadastrar-estudante"
                    color="purple"
                />,
                <CustomCard
                    key="cadastro-ano-letivo"
                    title="Criar Ano Letivo"
                    icon={Calendar}
                    href="/cadastrar-ano-letivo"
                    color="orange"
                />,
                <CustomCard
                    key="controlar-faltas"
                    title="Monitorar Faltas da UE"
                    icon={BarChart}
                    href="/controlar-faltas"
                    color="teal"
                />,
                <CustomCard
                    key="marcar-faltas"
                    title="Registrar Faltas Agora"
                    icon={CheckCircle}
                    href="/marcar-faltas"
                    color="green"
                />,
                <CustomCard
                    key="perfil-estudante"
                    title="Perfil do Estudante"
                    icon={UserCheck}
                    href="/perfil-estudante"
                    color="blue"
                />,
                <CustomCard
                    key="relatorio-bolsa-familia"
                    title="Relatório Bolsa Família"
                    icon={CalendarX}
                    href="/relatorio-bolsa-familia"
                    color="blue"
                />,
            ];
        }

        if (role === "admin") {
            return [
                <CustomCard
                    key="cadastro-estudante"
                    title="Cadastro de Estudantes"
                    icon={UserPlus}
                    href="/cadastrar-estudante"
                    color="purple"
                />,
                <CustomCard
                    key="cadastro-ano-letivo"
                    title="Criar Ano Letivo"
                    icon={Calendar}
                    href="/cadastrar-ano-letivo"
                    color="orange"
                />,
                <CustomCard
                    key="controlar-faltas"
                    title="Monitorar Faltas da UE"
                    icon={BarChart}
                    href="/controlar-faltas"
                    color="teal"
                />,
                <CustomCard
                    key="gerenciar-usuarios"
                    title="Gestão de Equipe"
                    icon={Shield}
                    href="/gerenciar-usuarios"
                    color="red"
                />,
                <CustomCard
                    key="marcar-faltas"
                    title="Registrar Faltas Agora"
                    icon={CheckCircle}
                    href="/marcar-faltas"
                    color="green"
                />,
                <CustomCard
                    key="perfil-estudante"
                    title="Perfil do Estudante"
                    icon={UserCheck}
                    href="/perfil-estudante"
                    color="blue"
                />,
                <CustomCard
                    key="prova-sao-paulo"
                    title="Importar Prova São Paulo"
                    icon={FileSpreadsheet}
                    href="/prova-sao-paulo"
                    color="indigo"
                />,
                <CustomCard
                    key="relatorio-bolsa-familia"
                    title="Relatório Bolsa Família"
                    icon={CalendarX}
                    href="/relatorio-bolsa-familia"
                    color="blue"
                />,
                <CustomCard
                    key="perfil-deficiente"
                    title="Perfil Estudante com Deficiência"
                    icon={Accessibility}
                    href="/perfil-deficiente"
                    color="blue"
                />,
            ];
        }

        return null;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
            {/* Elementos decorativos de fundo */}
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25"></div>

            <div className="relative container mx-auto px-4 py-8">
                {/* Header da página */}
                <div className="mb-8">
                    {/* Card de boas-vindas */}
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl shadow-blue-500/10 border border-slate-200/50 dark:border-slate-700/50 mb-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            {/* Informações do usuário */}
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                                    <GraduationCap className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-1">
                                        Olá, {userName.split(' ')[0]}! 👋
                                    </h1>
                                    <p className="text-slate-600 dark:text-slate-400 mb-2">
                                        Bem-vinda(o) de volta ao Habib Control
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                        <Clock className="w-4 h-4" />
                                        <span className="capitalize">{currentTime}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Badge do perfil */}
                            <div className="flex flex-col items-end gap-3">
                                <div className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${roleInfo.color} text-white rounded-xl shadow-lg`}>
                                    <roleInfo.icon className="w-4 h-4" />
                                    <span className="font-medium">{roleInfo.title}</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 text-right">
                                    {roleInfo.description}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seção de módulos */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                            <BarChart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                Módulos do Sistema
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Acesse as funcionalidades disponíveis para seu perfil
                            </p>
                        </div>
                    </div>
                </div>

                {/* Grid de cards */}
                <section
                    aria-label="Cards de Acesso"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    {getCards()}
                </section>
            </div>
        </div>
    );
}