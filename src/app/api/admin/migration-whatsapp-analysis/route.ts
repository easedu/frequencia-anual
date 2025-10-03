import { NextResponse } from 'next/server';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { FIREBASE_PATHS } from '@/config/constants';

export const dynamic = 'force-dynamic';

interface AnalysisResult {
  success: boolean;
  currentState: {
    totalStudents: number;
    activeStudents: number;
    totalContacts: number;
    totalWhatsAppVerified: number;
    orphanNumbers: number;
    duplicates: number;
  };
  newStructure: {
    exists: boolean;
    totalMigrated: number;
    percentage: number;
  };
  issues: string[];
  timestamp: string;
}

export async function GET() {
  try {
    console.log('[ANALYSIS] Iniciando análise do estado atual...');

    // ANÁLISE 1: Estudantes
    const studentsDocRef = doc(db, FIREBASE_PATHS.students());
    const studentsSnap = await getDoc(studentsDocRef);

    let totalStudents = 0;
    let activeStudents = 0;
    let totalContacts = 0;

    if (studentsSnap.exists()) {
      const data = studentsSnap.data();
      const estudantes = data.estudantes || [];

      totalStudents = estudantes.length;
      activeStudents = estudantes.filter((s: any) => s.status === 'ATIVO').length;

      // Contar contatos
      estudantes.forEach((student: any) => {
        if (student.contatos && Array.isArray(student.contatos)) {
          totalContacts += student.contatos.length;
        }
      });
    }

    console.log(`[ANALYSIS] Estudantes: ${totalStudents} total, ${activeStudents} ativos`);
    console.log(`[ANALYSIS] Contatos: ${totalContacts}`);

    // ANÁLISE 2: WhatsApp verificados (estrutura antiga)
    const whatsappRef = collection(db, 'whatsapp_verified_numbers');
    const whatsappSnap = await getDocs(whatsappRef);

    const totalWhatsAppVerified = whatsappSnap.size;
    let numbersWithStudentId = 0;
    let orphanNumbers = 0;

    whatsappSnap.forEach((doc) => {
      const data = doc.data();
      if (data.studentId) {
        numbersWithStudentId++;
      } else {
        orphanNumbers++;
      }
    });

    console.log(`[ANALYSIS] WhatsApp verificados: ${totalWhatsAppVerified}`);
    console.log(`[ANALYSIS] Com studentId: ${numbersWithStudentId}, Órfãos: ${orphanNumbers}`);

    // ANÁLISE 3: Verificar se nova estrutura já existe
    // Tentar buscar collection students (nova estrutura)
    let newStructureExists = false;
    let totalMigrated = 0;

    try {
      // Verificar se há algum documento na nova collection students (root level)
      const studentsCollectionRef = collection(db, 'students');
      const studentsQuery = query(studentsCollectionRef, where('anoLetivo', '==', '2025'));
      const studentsCollectionSnap = await getDocs(studentsQuery);

      if (!studentsCollectionSnap.empty) {
        newStructureExists = true;
        totalMigrated = studentsCollectionSnap.size;
      }
    } catch (error) {
      // Collection não existe ainda - OK
      newStructureExists = false;
    }

    console.log(`[ANALYSIS] Nova estrutura existe: ${newStructureExists}`);
    if (newStructureExists) {
      console.log(`[ANALYSIS] Estudantes migrados: ${totalMigrated}`);
    }

    // ANÁLISE 4: Identificar issues potenciais
    const issues: string[] = [];

    if (orphanNumbers > 0) {
      issues.push(`${orphanNumbers} números verificados sem estudante associado`);
    }

    if (totalContacts === 0 && totalStudents > 0) {
      issues.push('Nenhum contato encontrado nos estudantes');
    }

    if (totalWhatsAppVerified > totalContacts) {
      issues.push(`Mais números verificados (${totalWhatsAppVerified}) do que contatos (${totalContacts}) - pode haver duplicação`);
    }

    // Calcular duplicados (simplificado)
    const duplicates = Math.max(0, totalWhatsAppVerified - totalContacts);

    const result: AnalysisResult = {
      success: true,
      currentState: {
        totalStudents,
        activeStudents,
        totalContacts,
        totalWhatsAppVerified,
        orphanNumbers,
        duplicates
      },
      newStructure: {
        exists: newStructureExists,
        totalMigrated,
        percentage: totalStudents > 0 ? Math.round((totalMigrated / totalStudents) * 100) : 0
      },
      issues,
      timestamp: new Date().toISOString()
    };

    console.log('[ANALYSIS] Análise concluída com sucesso');
    return NextResponse.json(result);

  } catch (error) {
    console.error('[ANALYSIS ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao analisar dados'
      },
      { status: 500 }
    );
  }
}
