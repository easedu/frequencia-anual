/**
 * Supabase Service: Medical Certificates
 *
 * Gerencia atestados médicos dos estudantes.
 * Substitui: collection(db, 'students', studentId, 'medicalCertificates')
 */

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/utils/logger';

/**
 * Interface do atestado (Supabase)
 */
interface SupabaseMedicalCertificate {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
  days_covered: number;
  diagnosis: string | null;
  doctor_name: string | null;
  doctor_crm: string | null;
  clinic_name: string | null;
  file_url: string | null;
  file_name: string | null;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface do atestado (Aplicação)
 */
export interface MedicalCertificate {
  id: string;
  studentId: string;
  startDate: string;
  endDate: string;
  daysCovered: number;
  diagnosis?: string;
  doctorName?: string;
  doctorCrm?: string;
  clinicName?: string;
  fileUrl?: string;
  fileName?: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados para criar atestado
 */
export interface CreateMedicalCertificateData {
  studentId: string;
  startDate: string;
  endDate: string;
  diagnosis?: string;
  doctorName?: string;
  doctorCrm?: string;
  clinicName?: string;
  fileUrl?: string;
  fileName?: string;
  notes?: string;
  createdBy: string;
}

export class MedicalCertificatesService {
  /**
   * Converter registro do Supabase
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
      diagnosis: record.diagnosis || undefined,
      doctorName: record.doctor_name || undefined,
      doctorCrm: record.doctor_crm || undefined,
      clinicName: record.clinic_name || undefined,
      fileUrl: record.file_url || undefined,
      fileName: record.file_name || undefined,
      verified: record.verified,
      verifiedBy: record.verified_by || undefined,
      verifiedAt: record.verified_at || undefined,
      notes: record.notes || undefined,
      createdBy: record.created_by,
      updatedBy: record.updated_by || undefined,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Converter para formato Supabase
   */
  private static mapCertificateToSupabase(
    data: CreateMedicalCertificateData
  ): Partial<SupabaseMedicalCertificate> {
    return {
      student_id: data.studentId,
      start_date: data.startDate,
      end_date: data.endDate,
      diagnosis: data.diagnosis || null,
      doctor_name: data.doctorName || null,
      doctor_crm: data.doctorCrm || null,
      clinic_name: data.clinicName || null,
      file_url: data.fileUrl || null,
      file_name: data.fileName || null,
      notes: data.notes || null,
      created_by: data.createdBy,
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
   */
  static async create(data: CreateMedicalCertificateData): Promise<MedicalCertificate | null> {
    try {
      const supabaseData = this.mapCertificateToSupabase(data);

      const { data: result, error } = await (supabase
        .from('medical_certificates') as any)
        .insert(supabaseData)
        .select()
        .single();

      if (error) throw error;

      logger.info('Atestado criado no Supabase', {
        studentId: data.studentId,
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
   * Verificar atestado
   */
  static async verify(
    certificateId: string,
    verifiedBy: string
  ): Promise<boolean> {
    try {
      const { error } = await (supabase.from('medical_certificates') as any)
        .update({
          verified: true,
          verified_by: verifiedBy,
          verified_at: new Date().toISOString(),
        })
        .eq('id', certificateId);

      if (error) throw error;

      logger.info('Atestado verificado no Supabase', { certificateId, verifiedBy });

      return true;
    } catch (error) {
      logger.error('Erro ao verificar atestado', { certificateId }, error as Error);
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
      if (updates.diagnosis !== undefined)
        supabaseUpdates.diagnosis = updates.diagnosis || null;
      if (updates.doctorName !== undefined)
        supabaseUpdates.doctor_name = updates.doctorName || null;
      if (updates.doctorCrm !== undefined)
        supabaseUpdates.doctor_crm = updates.doctorCrm || null;
      if (updates.clinicName !== undefined)
        supabaseUpdates.clinic_name = updates.clinicName || null;
      if (updates.fileUrl !== undefined) supabaseUpdates.file_url = updates.fileUrl || null;
      if (updates.fileName !== undefined)
        supabaseUpdates.file_name = updates.fileName || null;
      if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes || null;

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
}
