/**
 * API Route para normalizar contatos dos estudantes
 *
 * GET /api/migrate-contacts - Executa a migração
 */

import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase.config';

const CURRENT_SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || new Date().getFullYear().toString();

interface Contato {
    nome: string;
    telefone: string;
    parentesco?: string;
}

interface Student {
    estudanteId: string;
    nome: string;
    contatos?: Contato[];
    [key: string]: any;
}

/**
 * Converte string para Title Case (primeira letra de cada palavra maiúscula)
 */
function toTitleCase(str: string): string {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Extrai o parentesco de dentro de parênteses
 */
function extractParentesco(nomeCompleto: string): { nome: string; parentesco: string } {
    const regex = /^(.+?)\s*\(\s*(.+?)\s*\)$/;
    const match = nomeCompleto.match(regex);

    if (match) {
        const nome = match[1].trim();
        const parentesco = match[2].trim();

        return {
            nome: toTitleCase(nome),
            parentesco: toTitleCase(parentesco)
        };
    }

    return {
        nome: toTitleCase(nomeCompleto.trim()),
        parentesco: ''
    };
}

/**
 * Normaliza os contatos de um estudante
 */
function normalizeContatos(contatos: Contato[]): Contato[] {
    if (!contatos || !Array.isArray(contatos)) {
        return [];
    }

    return contatos.map(contato => {
        const { nome, parentesco } = extractParentesco(contato.nome);

        return {
            nome,
            telefone: contato.telefone,
            parentesco: contato.parentesco || parentesco || ''
        };
    });
}

export async function GET(request: NextRequest) {
    try {
        console.log('🚀 Iniciando normalização de contatos...');

        // 1. Buscar todos os estudantes
        const studentsRef = collection(db, CURRENT_SCHOOL_YEAR, 'escola', 'students');
        const snapshot = await getDocs(studentsRef);

        if (snapshot.empty) {
            return NextResponse.json({
                success: false,
                message: 'Nenhum estudante encontrado no banco de dados.'
            }, { status: 404 });
        }

        const students: Student[] = [];
        snapshot.forEach((doc) => {
            students.push({ ...doc.data(), estudanteId: doc.id } as Student);
        });

        console.log(`✅ Encontrados ${students.length} estudantes`);

        // 2. Processar cada estudante
        let totalProcessed = 0;
        let totalUpdated = 0;
        let totalWithContacts = 0;
        const detailedLog: any[] = [];

        for (const student of students) {
            totalProcessed++;

            if (!student.contatos || student.contatos.length === 0) {
                continue;
            }

            totalWithContacts++;
            const originalContatos = JSON.parse(JSON.stringify(student.contatos));
            const normalizedContatos = normalizeContatos(student.contatos);

            // Verificar se houve mudanças
            const hasChanges = JSON.stringify(originalContatos) !== JSON.stringify(normalizedContatos);

            if (hasChanges) {
                totalUpdated++;

                // Log das mudanças
                const changes = {
                    estudanteId: student.estudanteId,
                    nome: student.nome,
                    original: originalContatos,
                    normalizado: normalizedContatos
                };
                detailedLog.push(changes);

                console.log(`📝 Atualizando: ${student.nome}`);

                // Atualizar no banco de dados
                const studentRef = doc(db, CURRENT_SCHOOL_YEAR, 'escola', 'students', student.estudanteId);
                await updateDoc(studentRef, {
                    contatos: normalizedContatos
                });
            }
        }

        // 3. Relatório
        const report = {
            success: true,
            message: 'Migração concluída com sucesso!',
            stats: {
                totalProcessed,
                totalWithContacts,
                totalUpdated,
                unchanged: totalWithContacts - totalUpdated
            },
            changes: detailedLog
        };

        console.log('✅ Migração concluída:', report.stats);

        return NextResponse.json(report);

    } catch (error: any) {
        console.error('❌ Erro durante a migração:', error);
        return NextResponse.json({
            success: false,
            message: 'Erro durante a migração',
            error: error.message
        }, { status: 500 });
    }
}
