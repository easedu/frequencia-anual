"use client";

import { useState, useEffect, useCallback } from "react";
import {
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDocs, collection, addDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/firebase.config";
import { logger } from "@/utils/logger";
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
import {
    Eye,
    EyeOff,
    Users,
    UserPlus,
    Edit,
    UserX,
    RotateCcw,
    Shield,
    ShieldCheck,
    ShieldAlert,
    CheckCircle2,
    XCircle,
    Badge,
    Heart
} from "lucide-react";

interface UserProfile {
    id: string;
    nome: string;
    email: string;
    perfil: "admin" | "user" | "super-user" | "user-pcd";
    status: "ativo" | "desabilitado";
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [openDialog, setOpenDialog] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [perfil, setPerfil] = useState<"admin" | "super-user" | "user" | "user-pcd">("user");
    const [status, setStatus] = useState<"ativo" | "desabilitado">("ativo");
    const [saving, setSaving] = useState<boolean>(false);
    const [resettingPassword, setResettingPassword] = useState<boolean>(false);

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
            // Ordena usuários: ativos primeiro, desabilitados por último
            const sortedUsers = userList.sort((a, b) => {
                if (a.status === "ativo" && b.status === "desabilitado") return -1;
                if (a.status === "desabilitado" && b.status === "ativo") return 1;
                return 0;
            });
            setUsers(sortedUsers);
            setError("");
        } catch (err) {
            logger.error("Erro ao carregar usuários", err as Error);
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
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setPerfil("user");
        setStatus("ativo");
        setOpenDialog(true);
    };

    const openEditDialog = (user: UserProfile) => {
        setEditingUser(user);
        setNome(user.nome);
        setEmail(user.email);
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setPerfil(user.perfil);
        setStatus(user.status);
        setOpenDialog(true);
    };

    const validatePassword = () => {
        if (!password) return "A senha é obrigatória.";
        if (password.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
        if (!/(?=.*[a-z])/.test(password)) return "A senha deve conter pelo menos uma letra minúscula.";
        if (!/(?=.*[A-Z])/.test(password)) return "A senha deve conter pelo menos uma letra maiúscula.";
        if (!/(?=.*\d)/.test(password)) return "A senha deve conter pelo menos um número.";
        if (!/(?=.*[@$!%*?&])/.test(password)) return "A senha deve conter pelo menos um caractere especial (@$!%*?&).";
        if (password !== confirmPassword) return "As senhas digitadas não coincidem.";
        return "";
    };

    const hasMinLength = password.length >= 8;
    const hasLowercase = /(?=.*[a-z])/.test(password);
    const hasUppercase = /(?=.*[A-Z])/.test(password);
    const hasNumber = /(?=.*\d)/.test(password);
    const hasSpecialChar = /(?=.*[@$!%*?&])/.test(password);

    const handleSaveUser = async () => {
        if (!nome || !email) {
            toast.error("Nome e Email são obrigatórios.");
            return;
        }
        if (!editingUser) {
            const passwordError = validatePassword();
            if (passwordError) {
                toast.error(passwordError);
                return;
            }
        }
        setSaving(true);
        try {
            if (editingUser) {
                await updateDoc(doc(db, "users", editingUser.id), {
                    nome,
                    perfil,
                    status,
                });
                toast.success("Usuário atualizado com sucesso!");
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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
            logger.error("Erro ao salvar usuário", err as Error);
            toast.error("Erro ao salvar usuário.");
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = async () => {
        if (!editingUser?.email) return;
        setResettingPassword(true);
        try {
            await sendPasswordResetEmail(auth, editingUser.email);
            toast.success("Email de redefinição de senha enviado com sucesso!");
        } catch (err) {
            logger.error("Erro ao enviar email de redefinição", err as Error);
            toast.error("Erro ao enviar email de redefinição.");
        } finally {
            setResettingPassword(false);
        }
    };

    const handleDisableUser = async (userId: string) => {
        try {
            await updateDoc(doc(db, "users", userId), {
                status: "desabilitado",
            });
            toast.success("Usuário desabilitado!");
            await fetchUsers(); // Re-carrega e re-ordena a lista
        } catch (err) {
            logger.error("Erro ao desabilitar usuário", err as Error);
            toast.error("Erro ao desabilitar usuário.");
        }
    };

    const getPerfilIcon = (perfil: string) => {
        switch (perfil) {
            case "super-user":
                return <ShieldCheck className="w-4 h-4 text-purple-600" />;
            case "admin":
                return <Shield className="w-4 h-4 text-blue-600" />;
            case "user-pcd":
                return <Heart className="w-4 h-4 text-pink-600" />;
            default:
                return <ShieldAlert className="w-4 h-4 text-gray-600" />;
        }
    };

    const getPerfilBadge = (perfil: string) => {
        const baseClasses = "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium";
        switch (perfil) {
            case "super-user":
                return `${baseClasses} bg-purple-100 text-purple-800`;
            case "admin":
                return `${baseClasses} bg-blue-100 text-blue-800`;
            case "user-pcd":
                return `${baseClasses} bg-pink-100 text-pink-800`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800`;
        }
    };

    const getPerfilLabel = (perfil: string) => {
        switch (perfil) {
            case "super-user":
                return "Super Usuário";
            case "admin":
                return "Administrador";
            case "user-pcd":
                return "Usuário PcD";
            default:
                return "Usuário";
        }
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium";
        return status === "ativo"
            ? `${baseClasses} bg-green-100 text-green-800`
            : `${baseClasses} bg-red-100 text-red-800`;
    };

    const activeUsers = users.filter(user => user.status === "ativo").length;
    const totalUsers = users.length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <Toaster />

            <div className="container mx-auto p-6 max-w-7xl">
                {/* Header moderno */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-800">Gerenciamento de Usuários</h1>
                                    <p className="text-slate-600 mt-1">Administre usuários e permissões do sistema</p>
                                </div>
                            </div>

                            {/* Stats integrado */}
                            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <Badge className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600">Usuários Ativos</p>
                                    <p className="text-2xl font-bold text-green-600">{activeUsers} / {totalUsers}</p>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={openCreateDialog}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 
                                     text-white rounded-lg hover:from-blue-700 hover:to-blue-800 
                                     transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <UserPlus className="w-4 h-4" />
                            Novo Usuário
                        </Button>
                    </div>
                </div>

                {/* Card da tabela */}
                <Card className="bg-white shadow-sm border border-slate-200 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <Users className="w-5 h-5" />
                            Lista de Usuários
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loadingUsers ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="text-slate-600">Carregando usuários...</p>
                            </div>
                        ) : error ? (
                            <div className="p-8 text-center">
                                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <p className="text-red-600">{error}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-800">Nome</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-800">Email</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-800">Perfil</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-800">Status</th>
                                            <th className="px-6 py-4 text-center text-sm font-semibold text-slate-800">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {users.map((user) => (
                                            <tr
                                                key={user.id}
                                                className={`hover:bg-slate-50 transition-colors ${user.status === "desabilitado" ? "opacity-60" : ""
                                                    }`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">{user.nome}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-slate-600">{user.email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={getPerfilBadge(user.perfil)}>
                                                        {getPerfilIcon(user.perfil)}
                                                        {getPerfilLabel(user.perfil)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={getStatusBadge(user.status)}>
                                                        {user.status === "ativo" ? (
                                                            <>
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Ativo
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle className="w-3 h-3" />
                                                                Desabilitado
                                                            </>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEditDialog(user)}
                                                            className="flex items-center gap-1 hover:bg-blue-50 hover:border-blue-300"
                                                        >
                                                            <Edit className="w-3 h-3" />
                                                            Editar
                                                        </Button>
                                                        {user.status !== "desabilitado" && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDisableUser(user.id)}
                                                                className="flex items-center gap-1 hover:bg-red-50 hover:border-red-300"
                                                            >
                                                                <UserX className="w-3 h-3" />
                                                                Desabilitar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Dialog moderno */}
                <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                {editingUser ? (
                                    <>
                                        <Edit className="w-5 h-5 text-blue-600" />
                                        Editar Usuário
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-5 h-5 text-green-600" />
                                        Novo Usuário
                                    </>
                                )}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 mt-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Nome Completo</label>
                                <Input
                                    type="text"
                                    placeholder="Digite o nome completo"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    className="focus:ring-2 focus:ring-blue-500 border-slate-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Email</label>
                                <Input
                                    type="email"
                                    placeholder="Digite o email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={!!editingUser}
                                    className="focus:ring-2 focus:ring-blue-500 border-slate-300"
                                />
                            </div>

                            {!editingUser && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Senha</label>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Digite a senha inicial"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="focus:ring-2 focus:ring-blue-500 border-slate-300 pr-10"
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Confirmar Senha</label>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Confirme a senha"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="focus:ring-2 focus:ring-blue-500 border-slate-300 pr-10"
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <p className="text-sm font-medium text-slate-700 mb-3">Requisitos da senha:</p>
                                        <div className="space-y-2">
                                            <div className={`flex items-center gap-2 text-xs ${hasMinLength ? "text-green-600" : "text-slate-500"}`}>
                                                <CheckCircle2 className={`w-3 h-3 ${hasMinLength ? "text-green-600" : "text-slate-400"}`} />
                                                No mínimo 8 caracteres
                                            </div>
                                            <div className={`flex items-center gap-2 text-xs ${hasUppercase ? "text-green-600" : "text-slate-500"}`}>
                                                <CheckCircle2 className={`w-3 h-3 ${hasUppercase ? "text-green-600" : "text-slate-400"}`} />
                                                Letras maiúsculas (A-Z)
                                            </div>
                                            <div className={`flex items-center gap-2 text-xs ${hasLowercase ? "text-green-600" : "text-slate-500"}`}>
                                                <CheckCircle2 className={`w-3 h-3 ${hasLowercase ? "text-green-600" : "text-slate-400"}`} />
                                                Letras minúsculas (a-z)
                                            </div>
                                            <div className={`flex items-center gap-2 text-xs ${hasNumber ? "text-green-600" : "text-slate-500"}`}>
                                                <CheckCircle2 className={`w-3 h-3 ${hasNumber ? "text-green-600" : "text-slate-400"}`} />
                                                Números (0-9)
                                            </div>
                                            <div className={`flex items-center gap-2 text-xs ${hasSpecialChar ? "text-green-600" : "text-slate-500"}`}>
                                                <CheckCircle2 className={`w-3 h-3 ${hasSpecialChar ? "text-green-600" : "text-slate-400"}`} />
                                                Caracteres especiais (@$!%*?&)
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Perfil</label>
                                    <Select
                                        onValueChange={(val) => setPerfil(val as "admin" | "super-user" | "user" | "user-pcd")}
                                        value={perfil}
                                    >
                                        <SelectTrigger className="focus:ring-2 focus:ring-blue-500 border-slate-300">
                                            <SelectValue placeholder="Selecione o perfil" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                            <SelectItem value="super-user">Super Usuário</SelectItem>
                                            <SelectItem value="user">Usuário</SelectItem>
                                            <SelectItem value="user-pcd">Usuário PcD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Status</label>
                                    <Select
                                        onValueChange={(val) => setStatus(val as "ativo" | "desabilitado")}
                                        value={status}
                                    >
                                        <SelectTrigger className="focus:ring-2 focus:ring-blue-500 border-slate-300">
                                            <SelectValue placeholder="Selecione o status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ativo">Ativo</SelectItem>
                                            <SelectItem value="desabilitado">Desabilitado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200">
                            {editingUser && (
                                <Button
                                    variant="outline"
                                    onClick={handleResetPassword}
                                    disabled={resettingPassword}
                                    className="flex items-center gap-2"
                                >
                                    <RotateCcw className={`w-4 h-4 ${resettingPassword ? "animate-spin" : ""}`} />
                                    {resettingPassword ? "Enviando..." : "Redefinir Senha"}
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => setOpenDialog(false)}
                                className="px-6"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSaveUser}
                                disabled={saving}
                                className="px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                            >
                                {saving ? "Salvando..." : "Salvar"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}