/**
 * Supabase Service: Medical Certificates
 *
 * Gerencia atestados médicos dos estudantes.
 * Substitui: collection(db, 'students', studentId, 'medicalCertificates')
 *
 * IMPORTANTE: Sincronizado com schema SQL-CRIAR-TABELAS-FALTANTES.sql
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';

/**
 * Interface do atestado (Supabase) - Sincronizada com schema real
 * Ver: docs/archives/sql/SQL-CRIAR-TABELAS-FALTANTES.sql
 */
interface SupabaseMedicalCertificate {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
  days_covered: number; // GENERATED ALWAYS AS (end_date - start_date + 1) STORED
  cid_code: string | null;
  diagnosis: string | null;
  doctor_name: string | null;
  doctor_crm: string | null;
  document_url: string | null;
  document_type: string | null;
  submitted_date: string;
  submitted_by: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface do atestado (Aplicação) - mantém compatibilidade com código existente
 */
export interface MedicalCertificate {
  id: string;
  studentId: string;
  startDate: string;
  endDate: string;
  daysCovered: number;
  cidCode?: string;
  diagnosis?: string;
  doctorName?: string;
  doctorCrm?: string;
  documentUrl?: string;
  documentType?: string;
  submittedDate: string;
  submittedBy: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados para criar atestado
 */
export interface CreateMedicalCertificateData {
  studentId: string; // Pode ser UUID externo ou interno (resolvido automaticamente)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  cidCode?: string;
  diagnosis?: string;
  doctorName?: string;
  doctorCrm?: string;
  documentUrl?: string;
  documentType?: string;
  submittedDate?: string; // YYYY-MM-DD (default: hoje)
  createdBy: string;
}

export class MedicalCertificatesService {
  /**
   * Converter registro do Supabase para formato da aplicação
   */
  private static mapSupabaseToCertificate(
    record: SupabaseMedicalCertificate
  ): MedicalCertificate {
    return {
      id: record.id,
      studentId: record.student_id,
      startDate: record.start_date,
      endDate: record.end_date,
      daysCovered: record.days_covered,
      cidCode: record.cid_code || undefined,
      diagnosis: record.diagnosis || undefined,
      doctorName: record.doctor_name || undefined,
      doctorCrm: record.doctor_crm || undefined,
      documentUrl: record.document_url || undefined,
      documentType: record.document_type || undefined,
      submittedDate: record.submitted_date,
      submittedBy: record.submitted_by,
      status: record.status,
      reviewedBy: record.reviewed_by || undefined,
      reviewedAt: record.reviewed_at || undefined,
      reviewNotes: record.review_notes || undefined,
      createdBy: record.created_by,
      updatedBy: record.updated_by || undefined,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Buscar atestados de um estudante
   *
   * IMPORTANTE: studentId pode ser:
   * 1. UUID externo (student.student_id do Firebase) - MAIS COMUM
   * 2. UUID interno (student.id do Supabase) - MENOS COMUM
   *
   * O método tenta ambos para garantir compatibilidade.
   */
  static async getByStudentId(studentId: string): Promise<MedicalCertificate[]> {
    try {
      // Primeiro, tentar buscar diretamente (caso seja o ID interno)
      let { data, error } = await supabase
        .from('medical_certificates')
        .select('*')
        .eq('student_id', studentId)
        .order('start_date', { ascending: false });

      // Se não encontrou, pode ser que studentId seja o UUID externo (student.student_id)
      // Nesse caso, precisamos buscar o ID interno primeiro
      if (!error && (!data || data.length === 0)) {
        logger.debug('Nenhum atestado encontrado com ID direto, tentando buscar ID interno...', { studentId });

        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id')
          .eq('student_id', studentId)
          .maybeSingle();

        if (studentError) {
          logger.warn('Erro ao buscar ID interno do estudante', { studentId }, studentError);
        } else if (studentData) {
          // Encontrou o ID interno, buscar atestados novamente
          const internalId = studentData.id;
          logger.debug('ID interno encontrado, buscando atestados...', { studentId, internalId });

          const result = await supabase
            .from('medical_certificates')
            .select('*')
            .eq('student_id', internalId)
            .order('start_date', { ascending: false });

          data = result.data;
          error = result.error;
        }
      }

      if (error) throw error;

      return (data || []).map(this.mapSupabaseToCertificate);
    } catch (error) {
      logger.error('Erro ao buscar atestados do estudante', { studentId }, error as Error);
      return [];
    }
  }

  /**
   * Buscar atestado por ID
   */
  static async getById(certificateId: string): Promise<MedicalCertificate | null> {
    try {
      const { data, error } = await supabase
        .from('medical_certificates')
        .select('*')
        .eq('id', certificateId)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.mapSupabaseToCertificate(data) : null;
    } catch (error) {
      logger.error('Erro ao buscar atestado', { certificateId }, error as Error);
      return null;
    }
  }

  /**
   * Criar novo atestado
   *
   * IMPORTANTE: studentId pode ser UUID externo (student.student_id) ou interno (student.id).
   * Este método resolve automaticamente para o ID interno necessário pela FK.
   */
  static async create(data: CreateMedicalCertificateData): Promise<MedicalCertificate | null> {
    try {
      // 1. Resolver studentId para ID interno
      let internalStudentId = data.studentId;

      // Tentar primeiro assumindo que é o ID interno (mais rápido)
      const { data: studentCheck, error: checkError } = await supabase
        .from('students')
        .select('id, student_id')
        .eq('id', data.studentId)
        .maybeSingle();

      // Se não encontrou, pode ser UUID externo
      if (!studentCheck) {
        logger.debug('ID direto não encontrado, tentando buscar por student_id externo...', { studentId: data.studentId });

        const { data: externalStudent, error: externalError } = await supabase
          .from('students')
          .select('id, student_id')
          .eq('student_id', data.studentId)
          .maybeSingle();

        if (externalError) {
          throw new Error(`Erro ao buscar estudante: ${externalError.message}`);
        }

        if (!externalStudent) {
          throw new Error(`Estudante não encontrado com ID: ${data.studentId}`);
        }

        internalStudentId = externalStudent.id;
        logger.debug('ID interno resolvido', { externalId: data.studentId, internalId: internalStudentId });
      }

      // 2. Preparar dados para inserção (apenas campos que existem no schema)
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // ⚠️ IMPORTANTE: CHECK constraint exige submitted_date <= start_date
      // Se o atestado é retroativo (start_date no passado), usar start_date como submitted_date
      let submittedDate = data.submittedDate || today;
      if (submittedDate > data.startDate) {
        logger.debug('Ajustando submitted_date para respeitar constraint', {
          original: submittedDate,
          adjusted: data.startDate
        });
        submittedDate = data.startDate;
      }

      const supabaseData = {
        student_id: internalStudentId,
        start_date: data.startDate,
        end_date: data.endDate,
        // days_covered é GENERATED ALWAYS - não podemos passar
        cid_code: data.cidCode || null,
        diagnosis: data.diagnosis || null,
        doctor_name: data.doctorName || null,
        doctor_crm: data.doctorCrm || null,
        document_url: data.documentUrl || null,
        document_type: data.documentType || null,
        submitted_date: submittedDate, // ✅ Sempre <= start_date
        submitted_by: data.createdBy,
        status: 'PENDING' as const,
        created_by: data.createdBy,
      };

      // 3. Inserir no Supabase
      const { data: result, error } = await (supabase
        .from('medical_certificates') as any)
        .insert(supabaseData)
        .select()
        .single();

      if (error) {
        logger.error('Erro do Supabase ao inserir atestado', { error, supabaseData });
        throw error;
      }

      logger.info('Atestado criado no Supabase', {
        externalStudentId: data.studentId,
        internalStudentId,
        certificateId: result.id,
        startDate: data.startDate,
        endDate: data.endDate,
      });

      return this.mapSupabaseToCertificate(result);
    } catch (error) {
      logger.error('Erro ao criar atestado', data, error as Error);
      throw error;
    }
  }

  /**
   * Aprovar atestado (muda status de PENDING para APPROVED)
   */
  static async approve(
    certificateId: string,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<boolean> {
    try {
      const { error } = await (supabase.from('medical_certificates') as any)
        .update({
          status: 'APPROVED',
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', certificateId);

      if (error) throw error;

      logger.info('Atestado aprovado no Supabase', { certificateId, reviewedBy });

      return true;
    } catch (error) {
      logger.error('Erro ao aprovar atestado', { certificateId }, error as Error);
      return false;
    }
  }

  /**
   * Rejeitar atestado (muda status de PENDING para REJECTED)
   */
  static async reject(
    certificateId: string,
    reviewedBy: string,
    reviewNotes: string
  ): Promise<boolean> {
    try {
      const { error } = await (supabase.from('medical_certificates') as any)
        .update({
          status: 'REJECTED',
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes,
        })
        .eq('id', certificateId);

      if (error) throw error;

      logger.info('Atestado rejeitado no Supabase', { certificateId, reviewedBy });

      return true;
    } catch (error) {
      logger.error('Erro ao rejeitar atestado', { certificateId }, error as Error);
      return false;
    }
  }

  /**
   * Atualizar atestado
   */
  static async update(
    certificateId: string,
    updates: Partial<CreateMedicalCertificateData>
  ): Promise<boolean> {
    try {
      const supabaseUpdates: any = {};

      if (updates.startDate) supabaseUpdates.start_date = updates.startDate;
      if (updates.endDate) supabaseUpdates.end_date = updates.endDate;
      // days_covered é recalculado automaticamente
      if (updates.cidCode !== undefined) supabaseUpdates.cid_code = updates.cidCode || null;
      if (updates.diagnosis !== undefined) supabaseUpdates.diagnosis = updates.diagnosis || null;
      if (updates.doctorName !== undefined) supabaseUpdates.doctor_name = updates.doctorName || null;
      if (updates.doctorCrm !== undefined) supabaseUpdates.doctor_crm = updates.doctorCrm || null;
      if (updates.documentUrl !== undefined) supabaseUpdates.document_url = updates.documentUrl || null;
      if (updates.documentType !== undefined) supabaseUpdates.document_type = updates.documentType || null;

      const { error } = await (supabase.from('medical_certificates') as any)
        .update(supabaseUpdates)
        .eq('id', certificateId);

      if (error) throw error;

      logger.info('Atestado atualizado no Supabase', { certificateId });

      return true;
    } catch (error) {
      logger.error('Erro ao atualizar atestado', { certificateId }, error as Error);
      return false;
    }
  }

  /**
   * Deletar atestado
   */
  static async delete(certificateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('medical_certificates')
        .delete()
        .eq('id', certificateId);

      if (error) throw error;

      logger.info('Atestado deletado do Supabase', { certificateId });

      return true;
    } catch (error) {
      logger.error('Erro ao deletar atestado', { certificateId }, error as Error);
      return false;
    }
  }

  /**
   * Buscar atestados que cobrem uma data específica
   */
  static async getByDate(studentId: string, date: string): Promise<MedicalCertificate[]> {
    try {
      const { data, error } = await supabase
        .from('medical_certificates')
        .select('*')
        .eq('student_id', studentId)
        .lte('start_date', date)
        .gte('end_date', date);

      if (error) throw error;

      return (data || []).map(this.mapSupabaseToCertificate);
    } catch (error) {
      logger.error('Erro ao buscar atestados por data', { studentId, date }, error as Error);
      return [];
    }
  }

  /**
   * Buscar atestados pendentes de revisão
   */
  static async getPending(): Promise<MedicalCertificate[]> {
    try {
      const { data, error } = await supabase
        .from('medical_certificates')
        .select('*')
        .eq('status', 'PENDING')
        .order('submitted_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapSupabaseToCertificate);
    } catch (error) {
      logger.error('Erro ao buscar atestados pendentes', error as Error);
      return [];
    }
  }
}
