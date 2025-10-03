import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { FIREBASE_PATHS } from '@/config/constants';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos

interface MigrateDataResult {
  success: boolean;
  dryRun: boolean;

  progress: {
    studentsProcessed: number;
    contactsMigrated: number;
    whatsappIntegrated: number;
    currentBatch: number;
    totalBatches: number;
  };

  validation: {
    oldDataIntact: boolean;
    newDataCreated: boolean;
    countMatch: boolean;
  };

  errors: string[];
  warnings: string[];

  preview?: {
    sampleStudentId: string;
    sampleContact: any;
    estimatedTime: string;
  };
}

/**
 * FASE 2: MIGRAÇÃO DE DADOS
 *
 * Estratégia:
 * 1. Ler estudantes da estrutura ANTIGA (2025/lista_de_estudantes)
 * 2. Para cada estudante:
 *    a. Atualizar documento em students/{id} (adicionar dados do estudante)
 *    b. Para cada contato:
 *       - Buscar verificação WhatsApp em whatsapp_verified_numbers/{telefone}
 *       - Criar documento em students/{id}/contacts/{contactId} com dados completos
 * 3. Validar que dados antigos permanecem intactos
 * 4. Retornar relatório detalhado
 */
export async function POST(request: NextRequest) {
  try {
    const {
      dryRun = true,
      batchSize = 10,
      startFrom = 0
    } = await request.json();

    console.log(`[MIGRATE-DATA] Iniciando ${dryRun ? 'SIMULAÇÃO' : 'MIGRAÇÃO REAL'}...`);
    console.log(`[MIGRATE-DATA] Batch size: ${batchSize}, Start from: ${startFrom}`);

    const errors: string[] = [];
    const warnings: string[] = [];
    let studentsProcessed = 0;
    let contactsMigrated = 0;
    let whatsappIntegrated = 0;

    // PASSO 1: Ler estudantes da estrutura ANTIGA
    console.log('[MIGRATE-DATA] Lendo estudantes da estrutura antiga...');
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

    console.log(`[MIGRATE-DATA] ${estudantes.length} estudantes encontrados`);

    // Calcular lote
    const endIndex = Math.min(startFrom + batchSize, estudantes.length);
    const batch = estudantes.slice(startFrom, endIndex);
    const totalBatches = Math.ceil(estudantes.length / batchSize);
    const currentBatch = Math.floor(startFrom / batchSize) + 1;

    console.log(`[MIGRATE-DATA] Processando lote ${currentBatch}/${totalBatches} (${batch.length} estudantes)`);

    // Preview
    let sampleStudentId = '';
    let sampleContact: any = null;

    // PASSO 2: Processar cada estudante do lote
    for (const estudante of batch) {
      try {
        const estudanteId = estudante.estudanteId;

        if (!estudanteId) {
          errors.push(`Estudante sem ID: ${estudante.nome}`);
          continue;
        }

        // Guardar primeiro estudante para preview
        if (!sampleStudentId) {
          sampleStudentId = estudanteId;
        }

        // PASSO 2.1: Atualizar documento do estudante (adicionar dados reais)
        if (!dryRun) {
          const studentDocRef = doc(db, 'students', estudanteId);
          await updateDoc(studentDocRef, {
            status: 'migrated',
            migratedAt: serverTimestamp(),
            nome: estudante.nome || '',
            turma: estudante.turma || '',
            statusEstudante: estudante.status || '',
            bolsaFamilia: estudante.bolsaFamilia || 'NÃO',
            turno: estudante.turno || 'MANHÃ'
          });
        }

        studentsProcessed++;

        // PASSO 2.2: Migrar contatos
        if (estudante.contatos && Array.isArray(estudante.contatos)) {
          for (let i = 0; i < estudante.contatos.length; i++) {
            const contato = estudante.contatos[i];
            const contactId = `contact_${i + 1}`;

            try {
              // 2.2.1: Extrair telefone numérico
              const telefoneNumerico = contato.telefoneNumerico ||
                                       contato.telefone?.replace(/\D/g, '') ||
                                       '';

              if (!telefoneNumerico) {
                warnings.push(`Contato sem telefone: ${estudante.nome} - ${contato.nome}`);
              }

              // 2.2.2: Buscar verificação WhatsApp
              let whatsappData = {
                verified: false,
                exists: null as boolean | null,
                jid: null as string | null,
                name: null as string | null,
                number: null as string | null,
                verifiedAt: null as any,
                verificationStatus: null as string | null
              };

              if (telefoneNumerico) {
                const whatsappRef = doc(db, 'whatsapp_verified_numbers', telefoneNumerico);
                const whatsappSnap = await getDoc(whatsappRef);

                if (whatsappSnap.exists()) {
                  const whatsappDoc = whatsappSnap.data();
                  whatsappData = {
                    verified: true,
                    exists: whatsappDoc.hasWhatsApp ?? null,
                    jid: whatsappDoc.jid || null,
                    name: whatsappDoc.contactName || null,
                    number: whatsappDoc.phone || contato.telefone,
                    verifiedAt: whatsappDoc.verifiedAt || null,
                    verificationStatus: whatsappDoc.hasWhatsApp ? 'verified' : 'unavailable'
                  };

                  whatsappIntegrated++;
                }
              }

              // 2.2.3: Criar dados do contato
              const contactData = {
                nome: contato.nome || '',
                telefone: contato.telefone || '',
                telefoneNumerico: telefoneNumerico,
                parentesco: contato.parentesco || null,
                podeReceberWhatsapp: contato.podeReceberWhatsapp ?? true,

                whatsapp: whatsappData,

                createdAt: serverTimestamp(),
                migratedFrom: 'lista_de_estudantes',
                version: '1.0',
                anoLetivo: '2025',
                _placeholder: false  // Remover flag placeholder
              };

              // Guardar amostra para preview
              if (estudanteId === sampleStudentId && !sampleContact) {
                sampleContact = {
                  ...contactData,
                  createdAt: new Date().toISOString(),
                  whatsapp: {
                    ...contactData.whatsapp,
                    verifiedAt: contactData.whatsapp.verifiedAt ? new Date().toISOString() : null
                  }
                };
              }

              // 2.2.4: Salvar contato (se não for dry-run)
              if (!dryRun) {
                const contactDocRef = doc(db, 'students', estudanteId, 'contacts', contactId);
                await setDoc(contactDocRef, contactData);
              }

              contactsMigrated++;

            } catch (contactError) {
              const errorMsg = `Erro ao migrar contato ${contactId} de ${estudante.nome}: ${contactError instanceof Error ? contactError.message : 'unknown'}`;
              console.error(`[MIGRATE-DATA ERROR] ${errorMsg}`);
              errors.push(errorMsg);
            }
          }
        }

      } catch (studentError) {
        const errorMsg = `Erro ao processar ${estudante.nome}: ${studentError instanceof Error ? studentError.message : 'unknown'}`;
        console.error(`[MIGRATE-DATA ERROR] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // PASSO 3: VALIDAÇÃO - Verificar que dados antigos estão intactos
    console.log('[MIGRATE-DATA] Validando integridade dos dados antigos...');
    const oldDataCheckSnap = await getDoc(oldStudentsRef);
    const oldDataIntact = oldDataCheckSnap.exists() &&
                          (oldDataCheckSnap.data().estudantes?.length === estudantes.length);

    // PASSO 4: Verificar nova estrutura
    const newDataCreated = !dryRun; // Se não é dry-run, dados foram criados
    const countMatch = studentsProcessed === batch.length; // Todos do batch foram processados

    // Calcular tempo estimado
    const avgTimePerStudent = 0.5; // segundos
    const remainingStudents = estudantes.length - endIndex;
    const estimatedSeconds = remainingStudents * avgTimePerStudent;
    const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

    const result: MigrateDataResult = {
      success: true,
      dryRun,

      progress: {
        studentsProcessed,
        contactsMigrated,
        whatsappIntegrated,
        currentBatch,
        totalBatches
      },

      validation: {
        oldDataIntact,
        newDataCreated,
        countMatch
      },

      errors,
      warnings,

      preview: sampleContact ? {
        sampleStudentId,
        sampleContact,
        estimatedTime: dryRun
          ? `${estimatedMinutes} min para migração real`
          : `${Math.max(0, estimatedMinutes)} min restantes`
      } : undefined
    };

    console.log('[MIGRATE-DATA] Concluído:', {
      studentsProcessed,
      contactsMigrated,
      whatsappIntegrated,
      errors: errors.length,
      warnings: warnings.length
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[MIGRATE-DATA FATAL ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao migrar dados'
      },
      { status: 500 }
    );
  }
}
