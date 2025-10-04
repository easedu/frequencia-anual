/**
 * Script para atualizar o campo podeReceberMensagem em todos os contatos
 * Regra: Se o terceiro dígito do telefone for 9 (celular), marcar como true, senão false
 */

import { initializeApp, getApps } from 'firebase/app';
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    updateDoc
} from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Carregar variáveis de ambiente do .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    });
}

// Configuração do Firebase
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializar Firebase
if (getApps().length === 0) {
    initializeApp(firebaseConfig);
}

const db = getFirestore();
const SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || new Date().getFullYear().toString();

async function updateContactsPodeReceber() {
  console.log('🚀 Iniciando atualização de podeReceberMensagem nos contatos...\n');

  try {
    const studentsRef = collection(db, SCHOOL_YEAR, 'escola', 'students');
    const snapshot = await getDocs(studentsRef);

    let totalStudents = 0;
    let totalContactsUpdated = 0;
    let totalContactsSkipped = 0;

    for (const docSnapshot of snapshot.docs) {
      const student = docSnapshot.data();

      if (!student.contatos || student.contatos.length === 0) {
        continue;
      }

      totalStudents++;
      let hasChanges = false;

      const updatedContatos = student.contatos.map((contato: any) => {
        const telefone = contato.telefone || '';
        const cleanPhone = telefone.replace(/\D/g, '');

        // Se já tem o campo definido, pular
        if (contato.podeReceberMensagem !== undefined) {
          totalContactsSkipped++;
          return contato;
        }

        // Verificar se o terceiro dígito é 9 (celular brasileiro)
        // Formato: DDD (2 dígitos) + 9 (terceiro dígito) + número (8 dígitos) = 11 dígitos
        const podeReceberMensagem = cleanPhone.length === 11 && cleanPhone[2] === '9';

        hasChanges = true;
        totalContactsUpdated++;

        console.log(`  - ${contato.nome || 'Sem nome'}: ${telefone} → ${podeReceberMensagem ? 'PODE' : 'NÃO PODE'} receber`);

        return {
          ...contato,
          podeReceberMensagem
        };
      });

      // Atualizar apenas se houve mudanças
      if (hasChanges) {
        const studentDocRef = doc(db, SCHOOL_YEAR, 'escola', 'students', docSnapshot.id);
        await updateDoc(studentDocRef, {
          contatos: updatedContatos
        });
        console.log(`✅ Estudante ${student.nome} atualizado\n`);
      }
    }

    console.log('\n📊 Resumo da atualização:');
    console.log(`  • Estudantes processados: ${totalStudents}`);
    console.log(`  • Contatos atualizados: ${totalContactsUpdated}`);
    console.log(`  • Contatos ignorados (já tinham valor): ${totalContactsSkipped}`);
    console.log('\n✨ Atualização concluída com sucesso!\n');

  } catch (error) {
    console.error('❌ Erro ao atualizar contatos:', error);
    process.exit(1);
  }
}

// Executar o script
updateContactsPodeReceber()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
