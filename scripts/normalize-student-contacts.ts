/**
 * Script para normalizar contatos dos estudantes
 *
 * Este script:
 * 1. Extrai o parentesco que está entre parênteses no campo "nome"
 * 2. Remove o parentesco do campo "nome"
 * 3. Normaliza o nome para Title Case (primeira letra maiúscula)
 * 4. Normaliza o parentesco para Title Case e preenche o campo correto
 * 5. Remove acentos e espaços extras quando necessário
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
            if (!key.startsWith('#')) {
                process.env[key.trim()] = value;
            }
        }
    });
}

// Inicializar Firebase
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

if (getApps().length === 0) {
    initializeApp(firebaseConfig);
}

const db = getFirestore();
// Usar 2025 como padrão (pode ser passado como argumento)
const CURRENT_SCHOOL_YEAR = process.argv[2] || process.env.NEXT_PUBLIC_SCHOOL_YEAR || '2025';

interface Contato {
    nome: string;
    telefone: string;
    parentesco?: string;
}

interface Student {
    estudanteId: string;
    nome: string;
    contatos?: Contato[];
    [key: string]: any;
}

/**
 * Remove acentos de uma string
 */
function removeAccents(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Converte string para Title Case (primeira letra de cada palavra maiúscula)
 */
function toTitleCase(str: string): string {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Extrai o parentesco de dentro de parênteses
 * Exemplos:
 * - "Daiane (mãe)" -> { nome: "Daiane", parentesco: "Mãe" }
 * - "JOAO ( PAI )" -> { nome: "João", parentesco: "Pai" }
 * - "maria(avó)" -> { nome: "Maria", parentesco: "Avó" }
 */
function extractParentesco(nomeCompleto: string): { nome: string; parentesco: string } {
    // Regex para capturar texto entre parênteses
    const regex = /^(.+?)\s*\(\s*(.+?)\s*\)$/;
    const match = nomeCompleto.match(regex);

    if (match) {
        const nome = match[1].trim();
        const parentesco = match[2].trim();

        return {
            nome: toTitleCase(nome),
            parentesco: toTitleCase(parentesco)
        };
    }

    // Se não houver parênteses, apenas normaliza o nome
    return {
        nome: toTitleCase(nomeCompleto.trim()),
        parentesco: ''
    };
}

/**
 * Normaliza os contatos de um estudante
 */
function normalizeContatos(contatos: Contato[]): Contato[] {
    if (!contatos || !Array.isArray(contatos)) {
        return [];
    }

    return contatos.map(contato => {
        const { nome, parentesco } = extractParentesco(contato.nome);

        return {
            nome,
            telefone: contato.telefone,
            parentesco: contato.parentesco || parentesco || ''
        };
    });
}

/**
 * Cria backup dos dados antes da migração
 */
async function createBackup(students: Student[]): Promise<void> {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const backupDir = path.join(process.cwd(), 'backups');

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, `students-contacts-backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(students, null, 2));

    console.log(`✅ Backup criado: ${backupPath}`);
}

/**
 * Função principal de migração
 */
async function migrateContacts(): Promise<void> {
    console.log('🚀 Iniciando normalização de contatos dos estudantes...\n');

    try {
        // 1. Buscar todos os estudantes
        console.log('📚 Buscando estudantes...');
        console.log(`   Ano letivo: ${CURRENT_SCHOOL_YEAR}`);
        console.log(`   Caminho: ${CURRENT_SCHOOL_YEAR}/escola/students`);
        const studentsRef = collection(db, CURRENT_SCHOOL_YEAR, 'escola', 'students');
        const snapshot = await getDocs(studentsRef);
        console.log(`   Documentos encontrados: ${snapshot.size}`);

        if (snapshot.empty) {
            console.log('❌ Nenhum estudante encontrado no banco de dados.');
            return;
        }

        const students: Student[] = [];
        snapshot.forEach((doc) => {
            students.push({ ...doc.data(), estudanteId: doc.id } as Student);
        });

        console.log(`✅ Encontrados ${students.length} estudantes\n`);

        // 2. Criar backup
        await createBackup(students);

        // 3. Processar cada estudante
        let totalProcessed = 0;
        let totalUpdated = 0;
        let totalWithContacts = 0;
        const detailedLog: any[] = [];

        for (const student of students) {
            totalProcessed++;

            if (!student.contatos || student.contatos.length === 0) {
                continue;
            }

            totalWithContacts++;
            const originalContatos = JSON.parse(JSON.stringify(student.contatos));
            const normalizedContatos = normalizeContatos(student.contatos);

            // Verificar se houve mudanças
            const hasChanges = JSON.stringify(originalContatos) !== JSON.stringify(normalizedContatos);

            if (hasChanges) {
                totalUpdated++;

                // Log das mudanças
                const changes = {
                    estudanteId: student.estudanteId,
                    nome: student.nome,
                    original: originalContatos,
                    normalizado: normalizedContatos
                };
                detailedLog.push(changes);

                console.log(`\n📝 Atualizando: ${student.nome} (ID: ${student.estudanteId})`);
                originalContatos.forEach((orig: Contato, idx: number) => {
                    const norm = normalizedContatos[idx];
                    console.log(`   Contato ${idx + 1}:`);
                    console.log(`      Antes: Nome="${orig.nome}", Parentesco="${orig.parentesco || '(vazio)'}"`);
                    console.log(`      Depois: Nome="${norm.nome}", Parentesco="${norm.parentesco || '(vazio)'}"`);
                });

                // Atualizar no banco de dados
                const studentRef = doc(db, CURRENT_SCHOOL_YEAR, 'escola', 'students', student.estudanteId);
                await updateDoc(studentRef, {
                    contatos: normalizedContatos
                });
            }
        }

        // 4. Salvar log detalhado
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
        const logPath = path.join(process.cwd(), 'backups', `migration-log-${timestamp}.json`);
        fs.writeFileSync(logPath, JSON.stringify(detailedLog, null, 2));

        // 5. Relatório final
        console.log('\n' + '='.repeat(60));
        console.log('📊 RELATÓRIO FINAL');
        console.log('='.repeat(60));
        console.log(`Total de estudantes processados: ${totalProcessed}`);
        console.log(`Estudantes com contatos: ${totalWithContacts}`);
        console.log(`Estudantes atualizados: ${totalUpdated}`);
        console.log(`Estudantes sem mudanças: ${totalWithContacts - totalUpdated}`);
        console.log(`\n📄 Log detalhado salvo em: ${logPath}`);
        console.log('='.repeat(60));
        console.log('\n✅ Migração concluída com sucesso!');

    } catch (error) {
        console.error('\n❌ Erro durante a migração:', error);
        throw error;
    }
}

// Executar a migração
migrateContacts()
    .then(() => {
        console.log('\n👋 Processo finalizado.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
