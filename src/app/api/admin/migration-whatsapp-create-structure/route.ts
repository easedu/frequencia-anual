import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { FIREBASE_PATHS } from '@/config/constants';

export const dynamic = 'force-dynamic';

interface CreateStructureResult {
  success: boolean;
  dryRun: boolean;
  studentsProcessed: number;
  contactsCreated: number;
  errors: string[];
  preview?: {
    sampleStudent: string;
    sampleContacts: number;
    path: string;
  };
  validation: {
    oldDataIntact: boolean;
    newStructureCreated: boolean;
  };
}

/**
 * FASE 1: Criar estrutura paralela
 *
 * Estratégia:
 * 1. Ler estudantes da estrutura ANTIGA (2025/lista_de_estudantes)
 * 2. Criar estrutura NOVA (students/{id}/contacts) VAZIA (apenas documentos placeholder)
 *    - Path corrigido: collection 'students' no root do Firestore
 *    - Cada estudante tem campo anoLetivo: '2025' para filtrar por ano
 * 3. NÃO migrar dados ainda - apenas criar estrutura
 * 4. Validar que dados antigos permanecem intactos
 */
export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json();

    console.log(`[CREATE-STRUCTURE] Iniciando ${dryRun ? 'SIMULAÇÃO' : 'CRIAÇÃO REAL'}...`);

    const errors: string[] = [];
    let studentsProcessed = 0;
    let contactsCreated = 0;

    // PASSO 1: Ler estudantes da estrutura ANTIGA
    console.log('[CREATE-STRUCTURE] Lendo estudantes da estrutura antiga...');
    const oldStudentsRef = doc(db, FIREBASE_PATHS.students());
    const oldStudentsSnap = await getDoc(oldStudentsRef);

    if (!oldStudentsSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Estrutura antiga não encontrada'
      }, { status: 404 });
    }

    const oldData = oldStudentsSnap.data();
    const estudantes = oldData.estudantes || [];

    if (estudantes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum estudante encontrado na estrutura antiga'
      }, { status: 404 });
    }

    console.log(`[CREATE-STRUCTURE] ${estudantes.length} estudantes encontrados`);

    // PASSO 2: Criar estrutura NOVA (apenas placeholder - sem dados)
    let sampleStudentId = '';
    let sampleContactsCount = 0;

    for (const student of estudantes) {
      try {
        const estudanteId = student.estudanteId;

        if (!estudanteId) {
          errors.push(`Estudante sem ID: ${student.nome}`);
          continue;
        }

        // Guardar primeiro estudante para preview
        if (!sampleStudentId) {
          sampleStudentId = estudanteId;
        }

        if (!dryRun) {
          // Criar documento do estudante com metadata
          const studentDocRef = doc(db, 'students', estudanteId);
          await setDoc(studentDocRef, {
            estudanteId: estudanteId,
            createdAt: new Date(),
            migratedFrom: 'lista_de_estudantes',
            version: '1.0',
            status: 'structure_created',
            anoLetivo: '2025'
          });
        }

        studentsProcessed++;

        // Se estudante tem contatos na estrutura antiga, contar
        if (student.contatos && Array.isArray(student.contatos)) {
          const contactCount = student.contatos.length;
          contactsCreated += contactCount;

          if (estudanteId === sampleStudentId) {
            sampleContactsCount = contactCount;
          }

          if (!dryRun) {
            // Criar placeholder para cada contato (sem dados ainda)
            for (let i = 0; i < student.contatos.length; i++) {
              const contactId = `contact_${i + 1}`;
              const contactDocRef = doc(
                db,
                'students',
                estudanteId,
                'contacts',
                contactId
              );

              await setDoc(contactDocRef, {
                _placeholder: true,
                createdAt: new Date(),
                migratedFrom: 'lista_de_estudantes',
                version: '1.0',
                anoLetivo: '2025'
              });
            }
          }
        }

      } catch (error) {
        const errorMsg = `Erro ao processar ${student.nome}: ${error instanceof Error ? error.message : 'unknown'}`;
        console.error(`[CREATE-STRUCTURE ERROR] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // PASSO 3: VALIDAÇÃO - Verificar que dados antigos estão intactos
    console.log('[CREATE-STRUCTURE] Validando integridade dos dados antigos...');
    const oldDataCheckSnap = await getDoc(oldStudentsRef);
    const oldDataIntact = oldDataCheckSnap.exists() &&
                          (oldDataCheckSnap.data().estudantes?.length === estudantes.length);

    // PASSO 4: Verificar se nova estrutura foi criada (se não for dry-run)
    let newStructureCreated = false;
    if (!dryRun) {
      try {
        const newStructureRef = collection(db, 'students');
        const newStructureSnap = await getDocs(newStructureRef);
        newStructureCreated = !newStructureSnap.empty;
      } catch (error) {
        console.log('[CREATE-STRUCTURE] Nova estrutura ainda não existe (esperado)');
      }
    }

    const result: CreateStructureResult = {
      success: true,
      dryRun,
      studentsProcessed,
      contactsCreated,
      errors,
      preview: sampleStudentId ? {
        sampleStudent: sampleStudentId,
        sampleContacts: sampleContactsCount,
        path: `students/${sampleStudentId}/contacts`
      } : undefined,
      validation: {
        oldDataIntact,
        newStructureCreated: dryRun ? false : newStructureCreated
      }
    };

    console.log('[CREATE-STRUCTURE] Concluído:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[CREATE-STRUCTURE FATAL ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao criar estrutura'
      },
      { status: 500 }
    );
  }
}
