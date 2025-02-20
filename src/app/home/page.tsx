// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { CustomCard } from "@/components/CustomCard";
import { auth, db } from "@/firebase.config";
import { useRouter } from "next/navigation";
import { User, Calendar, ClipboardCheck, Users } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";

// Define os tipos possíveis para o perfil do usuário
type Role = "admin" | "super-user" | "user";

export default function Home() {
    const router = useRouter();
    const [role, setRole] = useState<Role | null>(null);

    useEffect(() => {
        const fetchUserRole = async () => {
            // Se não houver usuário logado, redireciona para a página de login
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

    // Enquanto o perfil não for carregado, mostra uma tela de loading
    if (role === null) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                Carregando...
            </div>
        );
    }

    // Função para montar os cards de acordo com o perfil do usuário
    const getCards = () => {
        if (role === "user") {
            return [
                <CustomCard
                    key="marcar-faltas"
                    title="Marcar Faltas"
                    icon={ClipboardCheck}
                    href="/marcar-faltas"
                />,
            ];
        }

        if (role === "super-user") {
            return [
                <CustomCard
                    key="cadastro-estudante"
                    title="Cadastro de Estudante"
                    icon={User}
                    href="/cadastrar-estudante"
                />,
                <CustomCard
                    key="cadastro-ano-letivo"
                    title="Cadastro Ano Letivo"
                    icon={Calendar}
                    href="/cadastrar-ano-letivo"
                />,
                <CustomCard
                    key="marcar-faltas"
                    title="Marcar Faltas"
                    icon={ClipboardCheck}
                    href="/marcar-faltas"
                />,
                <CustomCard
                    key="controlar-faltas"
                    title="Controle de Faltas"
                    icon={Users}
                    href="/controlar-faltas"
                />,
            ];
        }

        if (role === "admin") {
            return [
                <CustomCard
                    key="cadastro-estudante"
                    title="Cadastro de Estudante"
                    icon={User}
                    href="/cadastrar-estudante"
                />,
                <CustomCard
                    key="cadastro-ano-letivo"
                    title="Cadastro Ano Letivo"
                    icon={Calendar}
                    href="/cadastrar-ano-letivo"
                />,
                <CustomCard
                    key="marcar-faltas"
                    title="Marcar Faltas"
                    icon={ClipboardCheck}
                    href="/marcar-faltas"
                />,
                <CustomCard
                    key="gerenciar-usuarios"
                    title="Gerenciar Usuários"
                    icon={Users}
                    href="/gerenciar-usuarios"
                />,
                <CustomCard
                    key="controlar-faltas"
                    title="Controle de Faltas"
                    icon={Users}
                    href="/controlar-faltas"
                />,
            ];
        }

        return null;
    };

    return (
        <section
            aria-label="Cards de Acesso"
            className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
            {getCards()}
        </section>
    );
}