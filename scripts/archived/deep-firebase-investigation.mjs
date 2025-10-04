import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query, doc, getDoc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCmUo0UtaYnGjCPdCIuNbKJgFKBWPJv5yY',
  authDomain: 'frequencia-anual.firebaseapp.com',
  projectId: 'frequencia-anual',
  storageBucket: 'frequencia-anual.firebasestorage.app',
  messagingSenderId: '267076712674',
  appId: '1:267076712674:web:4d2872f56d8aff504dc6bb'
});

const db = getFirestore(app);

async function deepInvestigation() {
  console.log('🔍 INVESTIGAÇÃO PROFUNDA DO FIREBASE\n');
  console.log('='  .repeat(60) + '\n');

  try {
    // 1. VERIFICAR ESTRUTURA V2 (estudantes_2025)
    console.log('📂 CHECANDO COLEÇÃO: estudantes_2025 (V2)');
    const v2Query = query(collection(db, 'estudantes_2025'), limit(3));
    const v2Snap = await getDocs(v2Query);
    
    if (!v2Snap.empty) {
      console.log(`✅ Encontrados ${v2Snap.size} documentos em estudantes_2025\n`);
      
      v2Snap.forEach((doc, i) => {
        const data = doc.data();
        console.log(`--- Estudante V2 #${i + 1} ---`);
        console.log(`ID: ${doc.id}`);
        console.log(`Nome: ${data.nome}`);
        console.log(`Matrícula: ${data.matricula || 'N/A'}`);
        console.log(`Data Nasc: ${data.dataNascimento || 'N/A'}`);
        console.log(`Email: ${data.email || 'N/A'}`);
        console.log(`Endereço: ${data.endereco ? 'TEM' : 'N/A'}`);
        console.log('Campos:', Object.keys(data).join(', '));
        console.log('');
      });
    } else {
      console.log('❌ Coleção estudantes_2025 vazia ou não existe\n');
    }

    // 2. VERIFICAR ESTRUTURA V3 (students) COMPLETA
    console.log('\n' + '='  .repeat(60));
    console.log('📂 CHECANDO COLEÇÃO: students (V3 - ATUAL)');
    const v3Query = query(collection(db, 'students'), limit(3));
    const v3Snap = await getDocs(v3Query);
    
    if (!v3Snap.empty) {
      console.log(`✅ Encontrados ${v3Snap.size} documentos em students\n`);
      
      for (const studentDoc of v3Snap.docs) {
        const data = studentDoc.data();
        console.log(`--- Estudante V3: ${data.nome} ---`);
        console.log(`ID: ${studentDoc.id}`);
        console.log(`Matrícula NO DOC: ${data.matricula || 'N/A'}`);
        console.log(`Data Nasc NO DOC: ${data.dataNascimento || 'N/A'}`);
        console.log(`Email NO DOC: ${data.email || 'N/A'}`);
        console.log(`Endereço NO DOC: ${data.endereco ? JSON.stringify(data.endereco) : 'N/A'}`);
        
        // VERIFICAR SUBCOLEÇÃO oldData
        const oldDataRef = collection(db, 'students', studentDoc.id, 'oldData');
        const oldDataSnap = await getDocs(oldDataRef);
        
        if (!oldDataSnap.empty) {
          console.log('\n🔍 SUBCOLEÇÃO oldData ENCONTRADA:');
          oldDataSnap.forEach(oldDoc => {
            const oldData = oldDoc.data();
            console.log(`  - oldData/${oldDoc.id}:`);
            console.log(`    Matrícula: ${oldData.matricula || 'N/A'}`);
            console.log(`    Data Nasc: ${oldData.dataNascimento || 'N/A'}`);
            console.log(`    Email: ${oldData.email || 'N/A'}`);
            console.log(`    Endereço: ${oldData.endereco ? 'TEM' : 'N/A'}`);
          });
        }
        
        // VERIFICAR documento migratedData
        const migratedRef = doc(db, 'students', studentDoc.id, 'oldData', 'migratedData');
        const migratedSnap = await getDoc(migratedRef);
        
        if (migratedSnap.exists()) {
          const migData = migratedSnap.data();
          console.log('\n🔍 DOCUMENTO migratedData ENCONTRADO:');
          console.log(`  Matrícula: ${migData.matricula || 'N/A'}`);
          console.log(`  Data Nasc: ${migData.dataNascimento || 'N/A'}`);
          console.log(`  Email: ${migData.email || 'N/A'}`);
          console.log(`  Endereço: ${migData.endereco ? 'TEM' : 'N/A'}`);
        }
        
        console.log('\n' + '-'.repeat(50) + '\n');
      }
    }

    // 3. VERIFICAR SE HÁ REFERÊNCIA CRUZADA
    console.log('\n' + '='  .repeat(60));
    console.log('📂 CHECANDO REFERÊNCIAS CRUZADAS');
    
    const firstStudent = v3Snap.docs[0];
    const studentData = firstStudent.data();
    
    if (studentData.migratedFrom) {
      console.log(`\n✅ Campo migratedFrom encontrado: ${studentData.migratedFrom}`);
      
      // Tentar buscar dados originais
      const originalRef = doc(db, 'estudantes_2025', studentData.migratedFrom);
      const originalSnap = await getDoc(originalRef);
      
      if (originalSnap.exists()) {
        const origData = originalSnap.data();
        console.log('\n📄 DADOS ORIGINAIS ENCONTRADOS EM estudantes_2025:');
        console.log(`  Matrícula: ${origData.matricula || 'N/A'}`);
        console.log(`  Data Nasc: ${origData.dataNascimento || 'N/A'}`);
        console.log(`  Email: ${origData.email || 'N/A'}`);
        console.log(`  Endereço: ${origData.endereco ? JSON.stringify(origData.endereco) : 'N/A'}`);
      }
    }

  } catch (error) {
    console.error('❌ ERRO:', error);
  }

  process.exit(0);
}

deepInvestigation();
