/**
 * API Route para debug - verificar contatos dos estudantes
 */

import { NextResponse } from 'next/server';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '@/firebase.config';

const CURRENT_SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || new Date().getFullYear().toString();

export async function GET() {
    try {
        // Buscar apenas os primeiros 5 estudantes que têm contatos
        const studentsRef = collection(db, CURRENT_SCHOOL_YEAR, 'escola', 'students');
        const q = query(studentsRef, limit(10));
        const snapshot = await getDocs(q);

        const studentsWithContacts = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.contatos && data.contatos.length > 0) {
                studentsWithContacts.push({
                    estudanteId: doc.id,
                    nome: data.nome,
                    contatos: data.contatos
                });
            }
        });

        return NextResponse.json({
            success: true,
            total: studentsWithContacts.length,
            students: studentsWithContacts
        });

    } catch (error: any) {
        console.error('Erro:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
