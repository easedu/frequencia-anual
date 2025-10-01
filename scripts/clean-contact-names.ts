/**
 * Script para limpar nomes de contatos removendo parentesco entre parênteses
 *
 * Exemplo: "Thaina (mãe)" -> "Thaina"
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
} as any;

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function cleanContactNames() {
  try {
    console.log('🔍 Buscando estudantes...');

    const docRef = db.collection('2025').doc('estudantes');
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.error('❌ Documento de estudantes não encontrado');
      return;
    }

    const data = docSnap.data();
    const estudantes = data?.estudantes || [];

    console.log(`📚 Encontrados ${estudantes.length} estudantes`);

    let totalContacts = 0;
    let cleanedContacts = 0;

    const updatedEstudantes = estudantes.map((student: any) => {
      if (student.contatos && student.contatos.length > 0) {
        const updatedContatos = student.contatos.map((contato: any) => {
          totalContacts++;

          if (contato.nome) {
            // Remover texto entre parênteses e espaços extras
            const cleanName = contato.nome.replace(/\s*\([^)]*\)\s*/g, '').trim();

            if (cleanName !== contato.nome) {
              console.log(`  ✏️  "${contato.nome}" -> "${cleanName}"`);
              cleanedContacts++;
              return {
                ...contato,
                nome: cleanName
              };
            }
          }

          return contato;
        });

        return {
          ...student,
          contatos: updatedContatos
        };
      }

      return student;
    });

    console.log(`\n📊 Resumo:`);
    console.log(`   Total de contatos: ${totalContacts}`);
    console.log(`   Contatos limpos: ${cleanedContacts}`);

    if (cleanedContacts > 0) {
      console.log('\n💾 Salvando alterações...');
      await docRef.set({ estudantes: updatedEstudantes }, { merge: true });
      console.log('✅ Nomes de contatos limpos com sucesso!');
    } else {
      console.log('ℹ️  Nenhuma alteração necessária.');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

cleanContactNames();
