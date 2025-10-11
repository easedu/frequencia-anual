"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, LogOut, GraduationCap, Menu, X, User, Settings, Wifi, WifiOff } from "lucide-react";
import { useServiceWorkerContext } from "@/components/ServiceWorkerProvider";
import { useAuth } from "@/components/AuthProvider";

export default function Header() {
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { isOnline, offlineStatus } = useServiceWorkerContext();
    const { signOut: authSignOut, user, userProfile } = useAuth();

    const handleSignOut = async () => {
        await authSignOut();
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
        <header className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-900/5 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3">
                <div className="flex justify-between items-center">
                    {/* Logo e Título */}
                    <div className="flex items-center gap-3">
                        <Link href="/home" className="flex items-center gap-3 group">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                                <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Habib Control
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">
                                    Sistema de Gestão Escolar
                                </p>
                            </div>
                        </Link>
                        
                        {/* Indicador Online/Offline */}
                        <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                                isOnline 
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700/50' 
                                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-700/50'
                            }`}>
                                {isOnline ? (
                                    <Wifi className="w-3 h-3" />
                                ) : (
                                    <WifiOff className="w-3 h-3" />
                                )}
                                <span className="hidden sm:inline">
                                    {isOnline ? 'Online' : 'Offline'}
                                </span>
                                {!isOnline && offlineStatus.pendingSync > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-orange-200 dark:bg-orange-800 rounded-full text-xs font-bold">
                                        {offlineStatus.pendingSync}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Navegação Desktop */}
                    <nav className="hidden md:flex items-center gap-2">
                        <Link
                            href="/home"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 font-medium"
                        >
                            <Home className="w-4 h-4" />
                            <span>Home</span>
                        </Link>

                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-2"></div>

                        {/* Dropdown de usuário */}
                        <div className="flex items-center gap-3">
                            {user && userProfile && (
                                <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                        {userProfile.nome}
                                    </span>
                                </div>
                            )}
                            
                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Sair</span>
                            </button>
                        </div>
                    </nav>

                    {/* Botão Menu Mobile */}
                    <button
                        onClick={toggleMobileMenu}
                        className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                    >
                        {isMobileMenuOpen ? (
                            <X className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                        ) : (
                            <Menu className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                        )}
                    </button>
                </div>

                {/* Menu Mobile */}
                <div className={`md:hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen
                    ? 'max-h-80 opacity-100 mt-4'
                    : 'max-h-0 opacity-0 overflow-hidden'
                    }`}>
                    <nav className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 space-y-2 border border-slate-200 dark:border-slate-600">
                        {/* Título mobile visível apenas no menu */}
                        <div className="sm:hidden mb-4 pb-3 border-b border-slate-200 dark:border-slate-600">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="font-semibold text-slate-800 dark:text-slate-200">
                                        EduControl
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Sistema de Gestão Escolar
                                    </p>
                                </div>
                                
                                {/* Status mobile */}
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                    isOnline 
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                }`}>
                                    {isOnline ? (
                                        <Wifi className="w-3 h-3" />
                                    ) : (
                                        <WifiOff className="w-3 h-3" />
                                    )}
                                    <span>{isOnline ? 'Online' : 'Offline'}</span>
                                    {!isOnline && offlineStatus.pendingSync > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 bg-orange-200 dark:bg-orange-800 rounded-full text-xs font-bold">
                                            {offlineStatus.pendingSync}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Link
                            href="/home"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 font-medium"
                        >
                            <Home className="w-5 h-5" />
                            <span>Home</span>
                        </Link>

                        <div className="border-t border-slate-200 dark:border-slate-600 pt-2 mt-2">
                            <button
                                onClick={() => {
                                    handleSignOut();
                                    setIsMobileMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg transition-all duration-200 font-medium"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Sair</span>
                            </button>
                        </div>
                    </nav>
                </div>
            </div>
        </header>
    );
}