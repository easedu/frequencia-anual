/**
 * STUDENT DATA SERVICE
 *
 * Serviço centralizado para acesso aos dados de estudantes.
 * Implementa DUAL-READ: tenta nova estrutura primeiro, fallback para antiga.
 *
 * FASE 3: Atualização do Código
 */

import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { FIREBASE_PATHS } from '@/config/constants';

interface DataSourceInfo {
  source: 'new' | 'old';
  timestamp: number;
}

/**
 * Buscar estudante por ID
 * Tenta nova estrutura primeiro, fallback para antiga
 */
export async function getStudent(estudanteId: string) {
  const startTime = Date.now();

  try {
    // 1. Tentar NOVA estrutura
    console.log(`[STUDENT-SERVICE] 🔍 Buscando estudante ${estudanteId} (NOVA estrutura)...`);

    const studentRef = doc(db, 'students', estudanteId);
    const studentSnap = await getDoc(studentRef);

    if (studentSnap.exists()) {
      const data = studentSnap.data();

      // Verificar se tem dados reais (não é só placeholder)
      if (data.status === 'migrated' && data.nome) {
        const elapsed = Date.now() - startTime;
        console.log(`[STUDENT-SERVICE] ✅ Encontrado na NOVA estrutura (${elapsed}ms)`);

        return {
          ...data,
          _dataSource: {
            source: 'new',
            timestamp: Date.now()
          } as DataSourceInfo
        };
      }
    }

    console.log('[STUDENT-SERVICE] ⚠️  Não encontrado na nova estrutura, tentando fallback...');
  } catch (error) {
    console.error('[STUDENT-SERVICE] ❌ Erro na nova estrutura:', error);
  }

  // 2. FALLBACK: Estrutura ANTIGA
  console.log('[STUDENT-SERVICE] 🔄 Fallback para estrutura ANTIGA');
  return await getStudentFromOldStructure(estudanteId);
}

/**
 * Buscar contatos de um estudante
 * Tenta nova estrutura primeiro, fallback para antiga
 */
export async function getStudentContacts(estudanteId: string) {
  const startTime = Date.now();

  try {
    // 1. Tentar NOVA estrutura
    console.log(`[STUDENT-SERVICE] 🔍 Buscando contatos (NOVA estrutura)...`);

    const contactsRef = collection(db, 'students', estudanteId, 'contacts');
    const contactsSnap = await getDocs(contactsRef);

    if (!contactsSnap.empty) {
      // Verificar se tem dados reais (não é só placeholder)
      const firstContact = contactsSnap.docs[0].data();
      if (!firstContact._placeholder) {
        const elapsed = Date.now() - startTime;
        console.log(`[STUDENT-SERVICE] ✅ ${contactsSnap.size} contatos da NOVA estrutura (${elapsed}ms)`);

        return {
          contacts: contactsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })),
          _dataSource: {
            source: 'new',
            timestamp: Date.now()
          } as DataSourceInfo
        };
      }
    }

    console.log('[STUDENT-SERVICE] ⚠️  Contatos não encontrados na nova estrutura, fallback...');
  } catch (error) {
    console.error('[STUDENT-SERVICE] ❌ Erro ao buscar contatos novos:', error);
  }

  // 2. FALLBACK: Estrutura ANTIGA
  console.log('[STUDENT-SERVICE] 🔄 Fallback para contatos ANTIGOS');
  return await getContactsFromOldStructure(estudanteId);
}

/**
 * Buscar estudantes por ano letivo
 * Tenta nova estrutura primeiro, fallback para antiga
 */
export async function getStudentsByYear(anoLetivo: string) {
  const startTime = Date.now();

  try {
    // 1. Tentar NOVA estrutura
    console.log(`[STUDENT-SERVICE] 🔍 Buscando estudantes do ano ${anoLetivo} (NOVA estrutura)...`);

    const studentsRef = collection(db, 'students');
    const q = query(
      studentsRef,
      where('anoLetivo', '==', anoLetivo),
      where('status', '==', 'migrated')
    );
    const studentsSnap = await getDocs(q);

    if (!studentsSnap.empty) {
      const elapsed = Date.now() - startTime;
      console.log(`[STUDENT-SERVICE] ✅ ${studentsSnap.size} estudantes da NOVA estrutura (${elapsed}ms)`);

      return {
        students: studentsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })),
        _dataSource: {
          source: 'new',
          timestamp: Date.now()
        } as DataSourceInfo
      };
    }

    console.log('[STUDENT-SERVICE] ⚠️  Nenhum estudante na nova estrutura, fallback...');
  } catch (error) {
    console.error('[STUDENT-SERVICE] ❌ Erro ao buscar estudantes novos:', error);
  }

  // 2. FALLBACK: Estrutura ANTIGA
  console.log('[STUDENT-SERVICE] 🔄 Fallback para estrutura ANTIGA');
  return await getStudentsFromOldStructure(anoLetivo);
}

/**
 * Buscar contatos com WhatsApp verificado
 * Tenta nova estrutura primeiro, fallback para antiga
 */
export async function getContactsWithWhatsApp(estudanteId: string) {
  const contacts = await getStudentContacts(estudanteId);

  if (contacts._dataSource.source === 'new') {
    // Nova estrutura: filtrar contatos com WhatsApp
    return {
      contacts: contacts.contacts.filter((c: any) =>
        c.whatsapp?.verified && c.whatsapp?.exists
      ),
      _dataSource: contacts._dataSource
    };
  } else {
    // Estrutura antiga: retornar como está (já tem lógica própria)
    return contacts;
  }
}

// ============================================================================
// FUNÇÕES DE FALLBACK (ESTRUTURA ANTIGA)
// ============================================================================

async function getStudentFromOldStructure(estudanteId: string) {
  const startTime = Date.now();

  const oldStudentsRef = doc(db, FIREBASE_PATHS.students());
  const oldStudentsSnap = await getDoc(oldStudentsRef);

  if (!oldStudentsSnap.exists()) {
    throw new Error('Estrutura antiga não encontrada');
  }

  const estudantes = oldStudentsSnap.data().estudantes || [];
  const estudante = estudantes.find((e: any) => e.estudanteId === estudanteId);

  const elapsed = Date.now() - startTime;
  console.log(`[STUDENT-SERVICE] 📦 Estudante da estrutura ANTIGA (${elapsed}ms)`);

  if (!estudante) {
    throw new Error(`Estudante ${estudanteId} não encontrado`);
  }

  return {
    ...estudante,
    _dataSource: {
      source: 'old',
      timestamp: Date.now()
    } as DataSourceInfo
  };
}

async function getContactsFromOldStructure(estudanteId: string) {
  const estudante = await getStudentFromOldStructure(estudanteId);

  return {
    contacts: estudante.contatos || [],
    _dataSource: {
      source: 'old',
      timestamp: Date.now()
    } as DataSourceInfo
  };
}

async function getStudentsFromOldStructure(anoLetivo: string) {
  const startTime = Date.now();

  // Estrutura antiga usa o ano no path
  const oldStudentsRef = doc(db, anoLetivo, 'lista_de_estudantes');
  const oldStudentsSnap = await getDoc(oldStudentsRef);

  if (!oldStudentsSnap.exists()) {
    return {
      students: [],
      _dataSource: {
        source: 'old',
        timestamp: Date.now()
      } as DataSourceInfo
    };
  }

  const estudantes = oldStudentsSnap.data().estudantes || [];
  const elapsed = Date.now() - startTime;
  console.log(`[STUDENT-SERVICE] 📦 ${estudantes.length} estudantes da estrutura ANTIGA (${elapsed}ms)`);

  return {
    students: estudantes,
    _dataSource: {
      source: 'old',
      timestamp: Date.now()
    } as DataSourceInfo
  };
}
