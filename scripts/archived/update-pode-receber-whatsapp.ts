/**
 * Script para atualizar podeReceberMensagem em contatos que:
 * 1. Sejam celulares (terceiro dígito = 9)
 * 2. Tenham WhatsApp verificado (hasWhatsApp = true)
 */

import * as admin from 'firebase-admin';
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

// Inicializar Firebase Admin
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY não encontrado no .env.local');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase Admin:', error);
        process.exit(1);
    }
}

const db = admin.firestore();
const SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || new Date().getFullYear().toString();

async function updatePodeReceberWhatsApp() {
  console.log('🚀 Iniciando atualização de podeReceberMensagem baseado em WhatsApp verificado...\n');

  try {
    // PASSO 1: Carregar números verificados com WhatsApp
    console.log('📱 Carregando números verificados do WhatsApp...');
    const whatsappRef = db.collection('whatsapp_verified_numbers');
    const whatsappSnapshot = await whatsappRef.get();

    const numerosComWhatsApp = new Set<string>();
    whatsappSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.hasWhatsApp === true) {
        numerosComWhatsApp.add(doc.id); // O ID é o número limpo
      }
    });

    console.log(`✅ Encontrados ${numerosComWhatsApp.size} números com WhatsApp verificado\n`);

    // PASSO 2: Carregar e atualizar estudantes
    console.log('👥 Carregando estudantes...');
    const studentsDocRef = db.doc(`${SCHOOL_YEAR}/lista_de_estudantes`);
    const studentsDocSnap = await studentsDocRef.get();

    if (!studentsDocSnap.exists) {
      console.error('❌ Documento de estudantes não encontrado!');
      process.exit(1);
    }

    const studentsData = studentsDocSnap.data();
    const allStudents = (studentsData?.estudantes || []) as any[];

    console.log(`✅ Encontrados ${allStudents.length} estudantes\n`);

    let totalStudentsProcessed = 0;
    let totalContactsUpdated = 0;
    let totalContactsSkipped = 0;

    // PASSO 3: Processar cada estudante
    for (const student of allStudents) {
      if (!student.contatos || student.contatos.length === 0) {
        continue;
      }

      totalStudentsProcessed++;
      let hasChanges = false;

      const updatedContatos = student.contatos.map((contato: any) => {
        const telefone = contato.telefone || '';
        const cleanPhone = telefone.replace(/\D/g, '');

        // Verificar se é celular (11 dígitos e terceiro dígito = 9)
        const isCelular = cleanPhone.length === 11 && cleanPhone[2] === '9';

        // Verificar se tem WhatsApp verificado
        const temWhatsApp = numerosComWhatsApp.has(cleanPhone);

        // Se é celular E tem WhatsApp, marcar como pode receber
        if (isCelular && temWhatsApp) {
          if (contato.podeReceberMensagem !== true) {
            console.log(`  ✓ ${student.nome} - ${contato.nome || 'Sem nome'}: ${telefone} → podeReceberMensagem = true`);
            totalContactsUpdated++;
            hasChanges = true;
            return {
              ...contato,
              podeReceberMensagem: true
            };
          } else {
            totalContactsSkipped++;
            return contato;
          }
        }

        // Se não atende aos critérios, manter como está (ou marcar como false se for fixo)
        if (isCelular && !temWhatsApp) {
          // É celular mas não tem WhatsApp verificado
          if (contato.podeReceberMensagem !== false) {
            console.log(`  ✗ ${student.nome} - ${contato.nome || 'Sem nome'}: ${telefone} → podeReceberMensagem = false (sem WhatsApp)`);
            totalContactsUpdated++;
            hasChanges = true;
            return {
              ...contato,
              podeReceberMensagem: false
            };
          }
        } else if (!isCelular) {
          // Não é celular (fixo)
          if (contato.podeReceberMensagem !== false) {
            console.log(`  ✗ ${student.nome} - ${contato.nome || 'Sem nome'}: ${telefone} → podeReceberMensagem = false (telefone fixo)`);
            totalContactsUpdated++;
            hasChanges = true;
            return {
              ...contato,
              podeReceberMensagem: false
            };
          }
        }

        totalContactsSkipped++;
        return contato;
      });

      // Atualizar estudante se houver mudanças
      if (hasChanges) {
        const updatedStudent = {
          ...student,
          contatos: updatedContatos
        };

        const updatedStudents = allStudents.map((s: any) =>
          s.estudanteId === student.estudanteId ? updatedStudent : s
        );

        await studentsDocRef.update({
          estudantes: updatedStudents
        });
      }
    }

    console.log('\n✅ Atualização concluída!');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Estudantes processados: ${totalStudentsProcessed}`);
    console.log(`✓  Contatos atualizados: ${totalContactsUpdated}`);
    console.log(`-  Contatos pulados (já corretos): ${totalContactsSkipped}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erro ao atualizar contatos:', error);
    process.exit(1);
  }

  process.exit(0);
}

updatePodeReceberWhatsApp();
