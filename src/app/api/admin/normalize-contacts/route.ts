import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { FIREBASE_PATHS } from '@/config/constants';

interface ContactChange {
  estudanteNome: string;
  estudanteId: string;
  turma: string;
  telefone: string;
  nomeOriginal: string;
  nomeNormalizado: string;
}

interface NormalizationResult {
  success: boolean;
  preview?: ContactChange[];
  totalContacts?: number;
  affectedContacts?: number;
  duplicateFieldsRemoved?: number;
  message?: string;
  error?: string;
}

/**
 * Remove texto entre parênteses do nome
 * Ex: "Maria (mãe)" -> "Maria"
 */
function normalizeContactName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, '').trim();
}

/**
 * GET - Preview das mudanças
 */
export async function GET(request: NextRequest): Promise<NextResponse<NormalizationResult>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isPreview = searchParams.get('preview') === 'true';

    if (!isPreview) {
      return NextResponse.json({
        success: false,
        error: 'Use POST para executar a normalização ou GET?preview=true para preview'
      }, { status: 400 });
    }

    // Buscar estudantes
    const studentsDocRef = doc(db, FIREBASE_PATHS.students());
    const studentsDocSnap = await getDoc(studentsDocRef);

    if (!studentsDocSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Dados de estudantes não encontrados'
      }, { status: 404 });
    }

    const studentsData = studentsDocSnap.data();
    const allStudents = (studentsData.estudantes || []) as any[];

    const changes: ContactChange[] = [];
    let totalContacts = 0;

    // Analisar contatos
    allStudents.forEach(student => {
      if (student.contatos && student.contatos.length > 0) {
        student.contatos.forEach((contato: any) => {
          totalContacts++;

          if (contato.nome) {
            const normalized = normalizeContactName(contato.nome);

            // Se houve mudança, adicionar ao preview
            if (normalized !== contato.nome) {
              changes.push({
                estudanteNome: student.nome,
                estudanteId: student.estudanteId,
                turma: student.turma,
                telefone: contato.telefone || 'N/A',
                nomeOriginal: contato.nome,
                nomeNormalizado: normalized
              });
            }
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      preview: changes,
      totalContacts,
      affectedContacts: changes.length
    });

  } catch (error) {
    console.error('Erro no preview:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

/**
 * POST - Executar normalização
 */
export async function POST(request: NextRequest): Promise<NextResponse<NormalizationResult>> {
  try {
    // ETAPA 1: Normalizar nomes dos contatos na coleção de estudantes
    const studentsDocRef = doc(db, FIREBASE_PATHS.students());
    const studentsDocSnap = await getDoc(studentsDocRef);

    if (!studentsDocSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Dados de estudantes não encontrados'
      }, { status: 404 });
    }

    const studentsData = studentsDocSnap.data();
    const allStudents = (studentsData.estudantes || []) as any[];

    let totalContacts = 0;
    let affectedContacts = 0;

    // Normalizar contatos
    const updatedStudents = allStudents.map(student => {
      if (student.contatos && student.contatos.length > 0) {
        const updatedContacts = student.contatos.map((contato: any) => {
          totalContacts++;

          if (contato.nome) {
            const normalized = normalizeContactName(contato.nome);

            if (normalized !== contato.nome) {
              affectedContacts++;
              return {
                ...contato,
                nome: normalized
              };
            }
          }

          return contato;
        });

        return {
          ...student,
          contatos: updatedContacts
        };
      }

      return student;
    });

    // Salvar estudantes atualizados no Firebase
    await setDoc(studentsDocRef, { estudantes: updatedStudents }, { merge: true });

    // ETAPA 2: Remover campo contactName da coleção whatsapp_verified_numbers
    let duplicateFieldsRemoved = 0;

    try {
      const whatsappCollection = collection(db, 'whatsapp_verified_numbers');
      const whatsappSnapshot = await getDocs(whatsappCollection);

      const updatePromises: Promise<void>[] = [];

      whatsappSnapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // Se o documento tem o campo contactName, remover
        if (data.contactName !== undefined) {
          duplicateFieldsRemoved++;
          const docRef = doc(db, 'whatsapp_verified_numbers', docSnap.id);
          updatePromises.push(
            updateDoc(docRef, {
              contactName: deleteField()
            })
          );
        }
      });

      // Executar todas as atualizações em paralelo
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

    } catch (whatsappError) {
      console.warn('Aviso ao limpar whatsapp_verified_numbers:', whatsappError);
      // Continuar mesmo se houver erro nesta etapa
    }

    return NextResponse.json({
      success: true,
      totalContacts,
      affectedContacts,
      duplicateFieldsRemoved,
      message: `Normalização concluída! ${affectedContacts} contatos atualizados${duplicateFieldsRemoved > 0 ? ` e ${duplicateFieldsRemoved} campos duplicados removidos` : ''}.`
    });

  } catch (error) {
    console.error('Erro na normalização:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
