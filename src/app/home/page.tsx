"use client";

import { useState, useEffect } from "react";
import { CustomCard } from "@/components/CustomCard";
import { auth, db } from "@/firebase.config";
import { useRouter } from "next/navigation";
import { CheckCircle, UserPlus, Calendar, BarChart, UserCheck, Shield, CalendarX, Accessibility } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";

// Define os tipos possíveis para o perfil do usuário
type Role = "admin" | "super-user" | "user";

export default function Home() {
    const router = useRouter();
    const [role, setRole] = useState<Role | null>(null);

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
                } else {
                    setRole("user");
                }
            } catch (error) {
                console.error("Erro ao buscar usuário:", error);
                setRole("user");
            }
        };

        fetchUserRole();
    }, [router]);

    if (role === null) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                Carregando...
            </div>
        );
    }

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
        <section
            aria-label="Cards de Acesso"
            className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
            {getCards()}
        </section>
    );
}