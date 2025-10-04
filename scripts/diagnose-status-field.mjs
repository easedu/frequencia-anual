/**
 * Diagnóstico - Campo STATUS nos documentos V3
 *
 * Problema: Nenhum estudante aparece na página (antes aparecia 1)
 * Hipótese: Campo 'status' pode estar com valor diferente de "ATIVO"
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('\n════════════════════════════════════════════════════════════');
console.log('  DIAGNÓSTICO - Campo STATUS');
console.log('════════════════════════════════════════════════════════════\n');

async function diagnose() {
  try {
    // 1. Verificar query completa (como StudentDataService faz)
    console.log('━'.repeat(60));
    console.log('1️⃣  Query do StudentDataService (deleted == false + orderBy nome)');
    console.log('━'.repeat(60));

    const studentsRef = collection(db, 'students');
    const q = query(
      studentsRef,
      where('deleted', '==', false),
      orderBy('nome')
    );

    const snapshot = await getDocs(q);
    console.log(`✅ Total retornado: ${snapshot.size} estudantes\n`);

    if (snapshot.size === 0) {
      console.log('❌ PROBLEMA: Query retorna 0 estudantes!');
      console.log('   Isso significa que NENHUM estudante tem deleted: false\n');
      return;
    }

    // 2. Analisar distribuição do campo STATUS
    console.log('━'.repeat(60));
    console.log('2️⃣  Distribuição do campo STATUS');
    console.log('━'.repeat(60));

    const statusDistribution = {};
    let withoutStatus = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status !== undefined) {
        statusDistribution[data.status] = (statusDistribution[data.status] || 0) + 1;
      } else {
        withoutStatus++;
      }
    });

    console.log('📊 Valores de STATUS encontrados:');
    Object.entries(statusDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`   ${status}: ${count} estudantes`);
      });

    if (withoutStatus > 0) {
      console.log(`   [SEM CAMPO STATUS]: ${withoutStatus} estudantes`);
    }

    // 3. Verificar quantos têm status === "ATIVO"
    console.log('\n━'.repeat(60));
    console.log('3️⃣  Filtro usado pela página: status === "ATIVO"');
    console.log('━'.repeat(60));

    const ativos = snapshot.docs.filter(doc => doc.data().status === "ATIVO");
    console.log(`📊 Estudantes com status === "ATIVO": ${ativos.length}`);
    console.log(`📊 Estudantes EXCLUÍDOS pelo filtro: ${snapshot.size - ativos.length}\n`);

    if (ativos.length === 0) {
      console.log('⚠️  PROBLEMA IDENTIFICADO!');
      console.log('   Nenhum estudante tem status === "ATIVO"');
      console.log('   Por isso a página não mostra ninguém!\n');

      console.log('📄 Exemplos de estudantes e seus status:');
      snapshot.docs.slice(0, 5).forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.nome}`);
        console.log(`     status: "${data.status || 'UNDEFINED'}"`);
      });
    } else {
      console.log('✅ Estudantes ATIVOS encontrados!');
      console.log('\n📄 Primeiros 3 estudantes ativos:');
      ativos.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.nome} (${data.turma})`);
      });
    }

    // 4. Verificar campo TURMA
    console.log('\n━'.repeat(60));
    console.log('4️⃣  Verificar campo TURMA');
    console.log('━'.repeat(60));

    const turmasDistribution = {};
    let withoutTurma = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.turma) {
        turmasDistribution[data.turma] = (turmasDistribution[data.turma] || 0) + 1;
      } else {
        withoutTurma++;
      }
    });

    console.log(`📊 Turmas únicas encontradas: ${Object.keys(turmasDistribution).length}`);
    if (withoutTurma > 0) {
      console.log(`⚠️  Estudantes SEM turma: ${withoutTurma}`);
    }

    if (Object.keys(turmasDistribution).length > 0) {
      console.log('\n📄 Primeiras 5 turmas:');
      Object.entries(turmasDistribution)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(0, 5)
        .forEach(([turma, count]) => {
          console.log(`   ${turma}: ${count} estudantes`);
        });
    }

    // 5. Simular exatamente o que a página faz
    console.log('\n━'.repeat(60));
    console.log('5️⃣  SIMULAÇÃO EXATA da página perfil-estudante');
    console.log('━'.repeat(60));

    console.log('Código da página (linha 186-192):');
    console.log('const activeStudents = allStudentsData');
    console.log('  .filter(s => s.status === "ATIVO")');
    console.log('  ...\n');

    const allStudentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const activeStudents = allStudentsData.filter(s => s.status === "ATIVO");

    console.log(`📊 allStudentsData.length: ${allStudentsData.length}`);
    console.log(`📊 activeStudents.length (após filtro): ${activeStudents.length}\n`);

    if (activeStudents.length === 0) {
      console.log('❌ CONFIRMADO: O filtro .filter(s => s.status === "ATIVO") remove TODOS os estudantes!');
    } else {
      console.log('✅ Filtro funciona, estudantes ativos encontrados');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.message.includes('index')) {
      console.log('\n💡 Falta criar índice composto!');
    }
  }
}

diagnose()
  .then(() => {
    console.log('\n════════════════════════════════════════════════════════════\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });