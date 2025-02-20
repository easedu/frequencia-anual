"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase.config";

export default function Header() {
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut(auth);
        router.push("/login");
    };

    return (
        <header className="bg-white dark:bg-gray-800 shadow">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold">
                    <Link href="/">Gestão Escolar</Link>
                </h1>
                <nav className="flex items-center gap-4">
                    <Link
                        href="/home"
                        className="flex items-center gap-1 hover:text-blue-500"
                    >
                        <Home className="w-5 h-5" /> <span>Home</span>
                    </Link>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-1 hover:text-blue-500"
                    >
                        <LogOut className="w-5 h-5" /> <span>Sair</span>
                    </button>
                </nav>
            </div>
        </header>
    );
}