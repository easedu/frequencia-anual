import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase.config";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || new Date().getFullYear().toString();

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Iniciando atualização de podeReceberMensagem nos contatos...');

    const studentsRef = collection(db, SCHOOL_YEAR, 'escola', 'students');
    const snapshot = await getDocs(studentsRef);

    let totalStudents = 0;
    let totalContactsUpdated = 0;
    let totalContactsSkipped = 0;
    const details: {
      studentName: string;
      contacts: {
        name: string;
        phone: string;
        podeReceber: boolean;
      }[];
    }[] = [];

    for (const docSnapshot of snapshot.docs) {
      const student = docSnapshot.data();

      if (!student.contatos || student.contatos.length === 0) {
        continue;
      }

      totalStudents++;
      let hasChanges = false;
      const contactsForDetails: {
        name: string;
        phone: string;
        podeReceber: boolean;
      }[] = [];

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

        contactsForDetails.push({
          name: contato.nome || 'Sem nome',
          phone: telefone,
          podeReceber: podeReceberMensagem
        });

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

        details.push({
          studentName: student.nome,
          contacts: contactsForDetails
        });

        console.log(`✅ Estudante ${student.nome} atualizado`);
      }
    }

    console.log('\n📊 Resumo da atualização:');
    console.log(`  • Estudantes processados: ${totalStudents}`);
    console.log(`  • Contatos atualizados: ${totalContactsUpdated}`);
    console.log(`  • Contatos ignorados: ${totalContactsSkipped}`);

    return NextResponse.json({
      success: true,
      totalStudents,
      totalContactsUpdated,
      totalContactsSkipped,
      details
    });

  } catch (error: any) {
    console.error('❌ Erro ao atualizar contatos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao atualizar contatos'
      },
      { status: 500 }
    );
  }
}
