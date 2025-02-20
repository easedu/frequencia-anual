"use client";

import { useState, useEffect, useCallback } from "react";
import {
    createUserWithEmailAndPassword,
    updateProfile,
} from "firebase/auth";
import { doc, getDocs, collection, addDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/firebase.config";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast, Toaster } from "sonner";

interface UserProfile {
    id: string;
    nome: string;
    email: string;
    perfil: "admin" | "user" | "super-user";
    status: "ativo" | "desabilitado";
}

export default function UserManagementPage() {
    // Estados para listagem de usuários e feedback
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    // Estados para controle do diálogo de criação/edição
    const [openDialog, setOpenDialog] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

    // Estados dos campos do formulário
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [perfil, setPerfil] = useState<"admin" | "super-user" | "user">("user");
    const [status, setStatus] = useState<"ativo" | "desabilitado">("ativo");
    const [saving, setSaving] = useState<boolean>(false);

    // Função para buscar os usuários do Firestore
    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            const userList: UserProfile[] = querySnapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    nome: data.nome,
                    email: data.email,
                    perfil: data.perfil,
                    status: data.status,
                };
            });
            setUsers(userList);
            setError("");
        } catch (err) {
            console.error("Erro ao carregar usuários:", err);
            setError("Erro ao carregar usuários.");
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const openCreateDialog = () => {
        setEditingUser(null);
        setNome("");
        setEmail("");
        setPerfil("user");
        setStatus("ativo");
        setOpenDialog(true);
    };

    const openEditDialog = (user: UserProfile) => {
        setEditingUser(user);
        setNome(user.nome);
        setEmail(user.email);
        setPerfil(user.perfil);
        setStatus(user.status);
        setOpenDialog(true);
    };

    const handleSaveUser = async () => {
        if (!nome || !email) {
            toast.error("Nome e Email são obrigatórios.");
            return;
        }
        setSaving(true);
        try {
            if (editingUser) {
                // Atualização do usuário
                await updateDoc(doc(db, "users", editingUser.id), {
                    nome,
                    perfil,
                    status,
                });
                toast.success("Usuário atualizado com sucesso!");
            } else {
                // Criação do usuário
                const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    email,
                    "#Mudar123!"
                );
                const newUser = userCredential.user;
                await updateProfile(newUser, { displayName: nome });
                await addDoc(collection(db, "users"), {
                    nome,
                    email,
                    perfil,
                    status,
                    uid: newUser.uid,
                });
                toast.success("Usuário criado com sucesso!");
            }
            await fetchUsers();
            setOpenDialog(false);
        } catch (err) {
            console.error("Erro ao salvar usuário:", err);
            toast.error("Erro ao salvar usuário.");
        } finally {
            setSaving(false);
        }
    };

    const handleDisableUser = async (userId: string) => {
        try {
            await updateDoc(doc(db, "users", userId), {
                status: "desabilitado",
            });
            toast.success("Usuário desabilitado!");
            setUsers((prevUsers) =>
                prevUsers.map((user) =>
                    user.id === userId ? { ...user, status: "desabilitado" } : user
                )
            );
        } catch (err) {
            console.error("Erro ao desabilitar usuário:", err);
            toast.error("Erro ao desabilitar usuário.");
        }
    };

    return (
        <div className="min-h-screen p-4">
            <Toaster />

            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold mb-4 sm:mb-0">
                        Gerenciamento de Usuários
                    </h1>
                    <div className="flex items-center gap-4">
                        <Button variant="default" onClick={openCreateDialog}>
                            Novo Usuário
                        </Button>
                    </div>
                </header>

                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Lista de Usuários</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingUsers ? (
                            <p>Carregando usuários...</p>
                        ) : error ? (
                            <p className="text-red-500">{error}</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-100 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">
                                                Nome
                                            </th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">
                                                Email
                                            </th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">
                                                Perfil
                                            </th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">
                                                Status
                                            </th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">
                                                Ações
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900">
                                        {users.map((user, idx) => (
                                            <tr
                                                key={user.id}
                                                className={idx % 2 === 0 ? "bg-gray-50 dark:bg-gray-800" : ""}
                                            >
                                                <td className="px-4 py-2">{user.nome}</td>
                                                <td className="px-4 py-2">{user.email}</td>
                                                <td className="px-4 py-2">{user.perfil}</td>
                                                <td className="px-4 py-2">{user.status}</td>
                                                <td className="px-4 py-2 space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => openEditDialog(user)}
                                                    >
                                                        Editar
                                                    </Button>
                                                    {user.status !== "desabilitado" && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => handleDisableUser(user.id)}
                                                        >
                                                            Desabilitar
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Diálogo para criação/edição de usuário */}
                <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingUser ? "Editar Usuário" : "Novo Usuário"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Nome</label>
                                <Input
                                    type="text"
                                    placeholder="Digite o nome"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Email</label>
                                <Input
                                    type="email"
                                    placeholder="Digite o email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={!!editingUser}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Perfil</label>
                                <Select
                                    onValueChange={(val) =>
                                        setPerfil(val as "admin" | "super-user" | "user")
                                    }
                                    value={perfil}
                                >
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Selecione o perfil" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                        <SelectItem value="super-user">Super Usuário</SelectItem>
                                        <SelectItem value="user">Usuário</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Status</label>
                                <Select
                                    onValueChange={(val) =>
                                        setStatus(val as "ativo" | "desabilitado")
                                    }
                                    value={status}
                                >
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Selecione o status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ativo">Ativo</SelectItem>
                                        <SelectItem value="desabilitado">Desabilitado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <Button variant="outline" onClick={() => setOpenDialog(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSaveUser} disabled={saving}>
                                {saving ? "Salvando..." : "Salvar"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}