import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { FIREBASE_PATHS } from '@/config/constants';
import { getStudent, getStudentContacts } from '@/services/studentDataService';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG-EMILLY] Iniciando busca...');

    // 1. Buscar estudante EMILLY na estrutura antiga
    const studentsDocRef = doc(db, FIREBASE_PATHS.students());
    const studentsDocSnap = await getDoc(studentsDocRef);

    if (!studentsDocSnap.exists()) {
      return NextResponse.json({ error: 'Estudantes não encontrados' }, { status: 404 });
    }

    const studentsData = studentsDocSnap.data();
    const allStudents = (studentsData.estudantes || []) as any[];

    const emilly = allStudents.find((s: any) =>
      s.nome?.toUpperCase().includes('EMILLY VITORIA')
    );

    if (!emilly) {
      return NextResponse.json({ error: 'EMILLY não encontrada' }, { status: 404 });
    }

    console.log('[DEBUG-EMILLY] Estudante encontrada:', emilly.estudanteId);

    // 2. Buscar faltas de EMILLY no mês 10
    const absencesRef = collection(db, FIREBASE_PATHS.absenceControl());
    const absencesQuery = query(
      absencesRef,
      where('estudanteId', '==', emilly.estudanteId)
    );
    const absencesSnap = await getDocs(absencesQuery);

    const absencesInOctober = absencesSnap.docs
      .filter(doc => {
        const data = doc.data();
        const dateStr = data.data;
        return !data.justified && dateStr?.startsWith('2025-10');
      })
      .map(doc => doc.data().data);

    // 3. Buscar contatos com dual-read
    const contactsResult = await getStudentContacts(emilly.estudanteId);

    // 4. Buscar verificações WhatsApp
    const whatsappVerifications: any[] = [];
    for (const contato of emilly.contatos || []) {
      const telefone = contato.telefone?.replace(/\D/g, '');
      if (telefone) {
        const whatsappRef = doc(db, 'whatsapp_verified_numbers', telefone);
        const whatsappSnap = await getDoc(whatsappRef);

        whatsappVerifications.push({
          telefone,
          nome: contato.nome,
          verificado_antiga_estrutura: whatsappSnap.exists() ? whatsappSnap.data() : null
        });
      }
    }

    // 5. Buscar na nova estrutura
    const newStructureContacts: any[] = [];
    if (contactsResult._dataSource.source === 'new') {
      newStructureContacts.push(...contactsResult.contacts);
    }

    return NextResponse.json({
      success: true,
      estudante: {
        estudanteId: emilly.estudanteId,
        nome: emilly.nome,
        turma: emilly.turma,
        turno: emilly.turno,
        status: emilly.status
      },
      contatos_estrutura_antiga: emilly.contatos,
      contatos_estrutura_nova: {
        source: contactsResult._dataSource.source,
        timestamp: contactsResult._dataSource.timestamp,
        contatos: newStructureContacts
      },
      faltas_outubro: {
        total: absencesInOctober.length,
        multiplo_de_2: absencesInOctober.length % 2 === 0,
        datas: absencesInOctober.sort()
      },
      verificacoes_whatsapp: whatsappVerifications,
      analise: {
        tem_contatos: emilly.contatos?.length > 0,
        contatos_verificados: whatsappVerifications.filter(v => v.verificado_antiga_estrutura).length,
        qualifica_para_api: absencesInOctober.length > 0 && absencesInOctober.length % 2 === 0
      }
    });

  } catch (error) {
    console.error('[DEBUG-EMILLY] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
