"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/firebase.config";
import { useRouter } from "next/navigation";
import { CheckCircle, UserPlus, Calendar, BarChart, UserCheck, Shield, CalendarX, Accessibility, FileSpreadsheet, Clock, Users, GraduationCap, Zap, Star, StarOff, Grid3X3, Heart } from "lucide-react";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { logger } from "@/utils/logger";

// Define os tipos possíveis para o perfil do usuário
type Role = "admin" | "super-user" | "user" | "user-pcd";

interface CardInfo {
    key: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    color: string;
    description?: string;
}

interface RoleInfo {
    title: string;
    description: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface ColorClasses {
    gradient: string;
    hover: string;
    icon: string;
    border: string;
}

export default function Home() {
    const router = useRouter();
    const [role, setRole] = useState<Role | null>(null);
    const [userName, setUserName] = useState<string>("");
    const [currentTime, setCurrentTime] = useState<string>("");
    const [favorites, setFavorites] = useState<string[]>([]);
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

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

                // Buscar favoritos do usuário
                const favDoc = await getDoc(doc(db, "userPreferences", uid));
                if (favDoc.exists()) {
                    setFavorites(favDoc.data().favorites || []);
                }
            } catch (error) {
                logger.error("Erro ao buscar usuário", error as Error);
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
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    const toggleFavorite = async (cardKey: string) => {
        if (!auth.currentUser) return;

        const uid = auth.currentUser.uid;
        const newFavorites = favorites.includes(cardKey)
            ? favorites.filter(fav => fav !== cardKey)
            : [...favorites, cardKey];

        setFavorites(newFavorites);

        try {
            await setDoc(doc(db, "userPreferences", uid), { favorites: newFavorites }, { merge: true });
        } catch (error) {
            logger.error("Erro ao salvar favoritos", error as Error);
        }
    };

    const getRoleInfo = (): RoleInfo => {
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
            case "user-pcd":
                return {
                    title: "Usuário PcD",
                    description: "Acesso ao módulo de acessibilidade",
                    color: "from-pink-500 to-pink-600",
                    icon: Heart
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

    const getAllCards = (): CardInfo[] => {
        // Usuário PcD tem acesso apenas ao módulo específico para PcD
        if (role === "user-pcd") {
            return [
                {
                    key: "perfil-deficiente",
                    title: "Módulo de Acessibilidade",
                    icon: Accessibility,
                    href: "/perfil-deficiente",
                    color: "pink",
                    description: "Sistema especializado para estudantes com deficiência"
                },
            ];
        }

        if (role === "user") {
            return [
                {
                    key: "marcar-faltas",
                    title: "Registrar Faltas",
                    icon: CheckCircle,
                    href: "/marcar-faltas",
                    color: "green",
                    description: "Registre faltas dos estudantes em tempo real"
                },
                {
                    key: "controlar-faltas",
                    title: "Monitorar Faltas",
                    icon: BarChart,
                    href: "/controlar-faltas",
                    color: "teal",
                    description: "Acompanhe estatísticas de frequência"
                },
                {
                    key: "perfil-estudante",
                    title: "Perfil do Estudante",
                    icon: UserCheck,
                    href: "/perfil-estudante",
                    color: "blue",
                    description: "Visualize dados completos dos estudantes"
                },
                {
                    key: "cadastro-estudante",
                    title: "Cadastro de Estudantes",
                    icon: UserPlus,
                    href: "/cadastrar-estudante",
                    color: "purple",
                    description: "Adicione novos estudantes ao sistema"
                },
            ];
        }

        if (role === "super-user") {
            return [
                {
                    key: "cadastro-estudante",
                    title: "Cadastro de Estudantes",
                    icon: UserPlus,
                    href: "/cadastrar-estudante",
                    color: "purple",
                    description: "Adicione novos estudantes ao sistema"
                },
                {
                    key: "cadastro-ano-letivo",
                    title: "Criar Ano Letivo",
                    icon: Calendar,
                    href: "/cadastrar-ano-letivo",
                    color: "orange",
                    description: "Configure períodos e calendário escolar"
                },
                {
                    key: "controlar-faltas",
                    title: "Monitorar Faltas",
                    icon: BarChart,
                    href: "/controlar-faltas",
                    color: "teal",
                    description: "Acompanhe estatísticas de frequência"
                },
                {
                    key: "marcar-faltas",
                    title: "Registrar Faltas",
                    icon: CheckCircle,
                    href: "/marcar-faltas",
                    color: "green",
                    description: "Registre faltas dos estudantes em tempo real"
                },
                {
                    key: "perfil-estudante",
                    title: "Perfil do Estudante",
                    icon: UserCheck,
                    href: "/perfil-estudante",
                    color: "blue",
                    description: "Visualize dados completos dos estudantes"
                },
                {
                    key: "relatorio-bolsa-familia",
                    title: "Relatório Bolsa Família",
                    icon: CalendarX,
                    href: "/relatorio-bolsa-familia",
                    color: "blue",
                    description: "Gere relatórios para programa social"
                },
            ];
        }

        if (role === "admin") {
            return [
                {
                    key: "cadastro-estudante",
                    title: "Cadastro de Estudantes",
                    icon: UserPlus,
                    href: "/cadastrar-estudante",
                    color: "purple",
                    description: "Adicione novos estudantes ao sistema"
                },
                {
                    key: "cadastro-ano-letivo",
                    title: "Criar Ano Letivo",
                    icon: Calendar,
                    href: "/cadastrar-ano-letivo",
                    color: "orange",
                    description: "Configure períodos e calendário escolar"
                },
                {
                    key: "controlar-faltas",
                    title: "Monitorar Faltas",
                    icon: BarChart,
                    href: "/controlar-faltas",
                    color: "teal",
                    description: "Acompanhe estatísticas de frequência"
                },
                {
                    key: "gerenciar-usuarios",
                    title: "Gestão de Equipe",
                    icon: Shield,
                    href: "/gerenciar-usuarios",
                    color: "red",
                    description: "Gerencie usuários e permissões"
                },
                {
                    key: "marcar-faltas",
                    title: "Registrar Faltas",
                    icon: CheckCircle,
                    href: "/marcar-faltas",
                    color: "green",
                    description: "Registre faltas dos estudantes em tempo real"
                },
                {
                    key: "perfil-estudante",
                    title: "Perfil do Estudante",
                    icon: UserCheck,
                    href: "/perfil-estudante",
                    color: "blue",
                    description: "Visualize dados completos dos estudantes"
                },
                {
                    key: "prova-sao-paulo",
                    title: "Prova São Paulo",
                    icon: FileSpreadsheet,
                    href: "/prova-sao-paulo",
                    color: "indigo",
                    description: "Importe dados de avaliações externas"
                },
                {
                    key: "relatorio-bolsa-familia",
                    title: "Relatório Bolsa Família",
                    icon: CalendarX,
                    href: "/relatorio-bolsa-familia",
                    color: "blue",
                    description: "Gere relatórios para programa social"
                },
                {
                    key: "perfil-deficiente",
                    title: "Perfil Estudante PCD",
                    icon: Accessibility,
                    href: "/perfil-deficiente",
                    color: "pink",
                    description: "Acompanhe estudantes com deficiência"
                },
            ];
        }

        return [];
    };

    const getColorClasses = (color: string): ColorClasses => {
        const colorMap: Record<string, ColorClasses> = {
            green: {
                gradient: "from-emerald-500 to-green-600",
                hover: "hover:from-emerald-600 hover:to-green-700",
                icon: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
                border: "border-emerald-200 dark:border-emerald-800"
            },
            teal: {
                gradient: "from-teal-500 to-cyan-600",
                hover: "hover:from-teal-600 hover:to-cyan-700",
                icon: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
                border: "border-teal-200 dark:border-teal-800"
            },
            blue: {
                gradient: "from-blue-500 to-indigo-600",
                hover: "hover:from-blue-600 hover:to-indigo-700",
                icon: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                border: "border-blue-200 dark:border-blue-800"
            },
            purple: {
                gradient: "from-purple-500 to-violet-600",
                hover: "hover:from-purple-600 hover:to-violet-700",
                icon: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
                border: "border-purple-200 dark:border-purple-800"
            },
            orange: {
                gradient: "from-orange-500 to-amber-600",
                hover: "hover:from-orange-600 hover:to-amber-700",
                icon: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
                border: "border-orange-200 dark:border-orange-800"
            },
            red: {
                gradient: "from-red-500 to-pink-600",
                hover: "hover:from-red-600 hover:to-pink-700",
                icon: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                border: "border-red-200 dark:border-red-800"
            },
            indigo: {
                gradient: "from-indigo-500 to-purple-600",
                hover: "hover:from-indigo-600 hover:to-purple-700",
                icon: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
                border: "border-indigo-200 dark:border-indigo-800"
            },
            pink: {
                gradient: "from-pink-500 to-rose-600",
                hover: "hover:from-pink-600 hover:to-rose-700",
                icon: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
                border: "border-pink-200 dark:border-pink-800"
            }
        };
        return colorMap[color] || colorMap.blue;
    };

    const allCards = getAllCards();
    const favoriteCards = allCards.filter(card => favorites.includes(card.key));
    const regularCards = allCards.filter(card => !favorites.includes(card.key));

    const roleInfo = getRoleInfo();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25"></div>

            <div className="relative container mx-auto px-4 py-8">
                {/* Header da página */}
                <div className="mb-8">
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl shadow-blue-500/10 border border-slate-200/50 dark:border-slate-700/50 mb-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                                    <GraduationCap className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-1">
                                        Olá, {userName.split(' ')[0]}! 👋
                                    </h1>
                                    <p className="text-slate-600 dark:text-slate-400 mb-2">
                                        {role === "user-pcd"
                                            ? "Bem-vindo ao módulo de acessibilidade"
                                            : "Bem-vindo de volta ao Habib Control"
                                        }
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                        <Clock className="w-4 h-4" />
                                        <span className="capitalize">{currentTime}</span>
                                    </div>
                                </div>
                            </div>

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

                {/* Seção específica para usuário PcD */}
                {role === "user-pcd" && (
                    <div className="mb-8">
                        <div className="bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20 rounded-2xl p-6 border border-pink-200 dark:border-pink-800">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-pink-500 rounded-xl">
                                    <Accessibility className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-pink-800 dark:text-pink-200">
                                        Módulo de Acessibilidade
                                    </h2>
                                    <p className="text-pink-600 dark:text-pink-300">
                                        Sistema especializado para acompanhamento de estudantes com deficiência
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-pink-700 dark:text-pink-300 leading-relaxed">
                                Este ambiente foi desenvolvido especialmente para profissionais que trabalham com estudantes com deficiência,
                                oferecendo ferramentas específicas para o acompanhamento personalizado e inclusivo.
                            </p>
                        </div>
                    </div>
                )}

                {/* Seção de favoritos (apenas se não for user-pcd ou se houver favoritos) */}
                {favorites.length > 0 && role !== "user-pcd" && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl">
                                    <Heart className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                        Módulos Favoritos
                                    </h2>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Acesso rápido aos seus módulos mais utilizados
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${showOnlyFavorites
                                    ? 'bg-yellow-500 text-white shadow-lg'
                                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                                    }`}
                            >
                                {showOnlyFavorites ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                                <span className="hidden sm:inline">
                                    {showOnlyFavorites ? 'Mostrar Todos' : 'Apenas Favoritos'}
                                </span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                            {favoriteCards.map((card) => {
                                const colors = getColorClasses(card.color);
                                return (
                                    <div
                                        key={`fav-${card.key}`}
                                        className={`group relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 ${colors.border} shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer overflow-hidden`}
                                        onClick={() => router.push(card.href)}
                                    >
                                        {/* Efeito de gradiente no fundo */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

                                        {/* Badge de favorito */}
                                        <div className="absolute top-3 right-3">
                                            <div className="p-1 bg-yellow-500 rounded-full shadow-lg">
                                                <Star className="w-3 h-3 text-white fill-current" />
                                            </div>
                                        </div>

                                        <div className="relative z-10">
                                            <div className={`p-3 ${colors.icon} rounded-xl mb-4 w-fit`}>
                                                <card.icon className="w-6 h-6" />
                                            </div>

                                            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                                                {card.title}
                                            </h3>

                                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                {card.description}
                                            </p>
                                        </div>

                                        {/* Botão de desfavoritar */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite(card.key);
                                            }}
                                            className="absolute bottom-3 right-3 p-2 bg-slate-100 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-200 opacity-0 group-hover:opacity-100"
                                        >
                                            <StarOff className="w-4 h-4 text-slate-600 dark:text-slate-400 hover:text-red-500" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Seção de todos os módulos */}
                {!showOnlyFavorites && (
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                                {role === "user-pcd" ? <Accessibility className="w-5 h-5 text-white" /> : <Grid3X3 className="w-5 h-5 text-white" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                    {role === "user-pcd"
                                        ? 'Acesso Especializado'
                                        : favorites.length > 0
                                            ? 'Outros Módulos'
                                            : 'Módulos do Sistema'
                                    }
                                </h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {role === "user-pcd"
                                        ? 'Seu módulo específico para acompanhamento de estudantes PcD'
                                        : favorites.length > 0
                                            ? 'Explore outros módulos disponíveis'
                                            : 'Acesse as funcionalidades disponíveis para seu perfil'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Grid de cards */}
                <section
                    aria-label="Cards de Acesso"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    {(showOnlyFavorites ? favoriteCards : regularCards).map((card) => {
                        const colors = getColorClasses(card.color);
                        const isFavorite = favorites.includes(card.key);

                        return (
                            <div
                                key={card.key}
                                className={`group relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 ${colors.border} shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer overflow-hidden`}
                                onClick={() => router.push(card.href)}
                            >
                                {/* Efeito de gradiente no fundo */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

                                <div className="relative z-10">
                                    <div className={`p-3 ${colors.icon} rounded-xl mb-4 w-fit`}>
                                        <card.icon className="w-6 h-6" />
                                    </div>

                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                                        {card.title}
                                    </h3>

                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {card.description}
                                    </p>
                                </div>

                                {/* Botão de favoritar (não aparece para user-pcd pois só tem 1 módulo) */}
                                {role !== "user-pcd" && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFavorite(card.key);
                                        }}
                                        className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 ${isFavorite
                                            ? 'bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                                            : 'bg-slate-100 dark:bg-slate-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                                            }`}
                                    >
                                        <Star className={`w-4 h-4 transition-colors ${isFavorite
                                            ? 'text-yellow-500 fill-current'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-yellow-500'
                                            }`} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </section>
            </div>
        </div>
    );
}