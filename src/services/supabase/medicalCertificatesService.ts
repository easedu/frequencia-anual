/**
 * API Service: Medical Certificates
 *
 * @deprecated Use hooks from @/hooks/api/useMedicalCertificates instead
 *
 * Este service está sendo gradualmente substituído por hooks da API REST.
 * Para componentes React, use:
 * - useMedicalCertificates() - Listar atestados
 * - useCreateMedicalCertificate() - Criar atestado
 * - useUpdateMedicalCertificate() - Atualizar atestado
 * - useDeleteMedicalCertificate() - Deletar atestado
 *
 * Gerencia atestados médicos dos estudantes.
 * Refatorado para usar /api/medical-certificates (Sprint 2)
 */

import { logger } from '@/utils/logger';
import { getAuthHeaders } from '@/utils/authToken';
// ✅ studentIdResolver removido - a API agora resolve internamente

/**
 * Interface do atestado (API) - Sincronizada com schema real
 */
interface ApiMedicalCertificate {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
  days_covered: number;
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
 * Interface do atestado (Aplicação)
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
  studentId: string;
  startDate: string;
  endDate: string;
  cidCode?: string;
  diagnosis?: string;
  doctorName?: string;
  doctorCrm?: string;
  documentUrl?: string;
  documentType?: string;
  submittedDate?: string;
  createdBy: string;
}

export class MedicalCertificatesService {
  /**
   * Converter registro da API para formato da aplicação
   */
  private static mapApiToCertificate(record: ApiMedicalCertificate): MedicalCertificate {
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
   * Buscar atestados de um estudante via API
   *
   * @param studentId - Firebase UUID (a API resolve internamente para Internal ID)
   */
  static async getByStudentId(studentId: string): Promise<MedicalCertificate[]> {
    try {
      const headers = await getAuthHeaders();

      // ✅ Envia Firebase UUID direto - a API resolve no backend
      const response = await fetch(`/api/medical-certificates?studentId=${studentId}`, {
        headers,
      });

      if (!response.ok) {
        // Tentar ler o corpo da resposta para mais detalhes
        const errorBody = await response.json().catch(() => ({}));

        // Log do erro mas retorna array vazio (dados auxiliares)
        logger.warn('Falha ao buscar atestados do estudante', {
          studentId,
          status: response.status,
          statusText: response.statusText,
          error: errorBody.error || errorBody.message || 'Erro desconhecido'
        });
        return [];
      }

      const result = await response.json();

      // ✅ A API pode retornar tanto paginatedResponse quanto successResponse
      // paginatedResponse: { data: [], pagination: {...} }
      // successResponse: { success: true, data: [] }

      // Se tem campo 'success' e é false, logar erro
      if ('success' in result && !result.success) {
        logger.warn('API retornou erro ao buscar atestados', {
          studentId,
          message: result.message || result.error || 'Erro desconhecido',
          fullResponse: result
        });
        return [];
      }

      // Retornar dados (funciona para ambos os formatos)
      return (result.data || []).map(this.mapApiToCertificate);
    } catch (error) {
      // Log como warn ao invés de error (falha em dados auxiliares não deve bloquear a tela)
      logger.warn('Erro ao buscar atestados do estudante', { studentId }, error as Error);
      return [];
    }
  }

  /**
   * Buscar atestado por ID via API
   */
  static async getById(certificateId: string): Promise<MedicalCertificate | null> {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/medical-certificates/${certificateId}`, {
        headers,
      });

      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const result = await response.json();
      return this.mapApiToCertificate(result.data);
    } catch (error) {
      logger.error('Erro ao buscar atestado', { certificateId }, error as Error);
      return null;
    }
  }

  /**
   * Criar novo atestado via API
   *
   * @param data - Dados do atestado (com Firebase UUID)
   */
  static async create(data: CreateMedicalCertificateData): Promise<MedicalCertificate | null> {
    try {
      const headers = await getAuthHeaders();

      // ✅ Converter datas de YYYY-MM-DD para DDMMYYYY se necessário
      const convertDateFormat = (date: string): string => {
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = date.split('-');
          return `${day}${month}${year}`;
        }
        return date;
      };

      // ✅ Envia Firebase UUID direto - a API resolve no backend
      const response = await fetch('/api/medical-certificates', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          studentId: data.studentId, // Firebase UUID (não resolve mais aqui!)
          startDate: convertDateFormat(data.startDate),
          endDate: convertDateFormat(data.endDate),
          cidCode: data.cidCode || null,
          diagnosis: data.diagnosis || null,
          doctorName: data.doctorName || null,
          doctorCrm: data.doctorCrm || null,
          documentUrl: data.documentUrl || null,
          documentType: data.documentType || null,
          submittedDate: data.submittedDate ? convertDateFormat(data.submittedDate) : undefined,
          createdBy: data.createdBy,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`API returned ${response.status}: ${errorData.error || 'Failed'}`);
      }

      const result = await response.json();
      return this.mapApiToCertificate(result.data);
    } catch (error) {
      logger.error('Erro ao criar atestado', { studentId: data.studentId, startDate: data.startDate, endDate: data.endDate }, error as Error);
      throw error;
    }
  }

  /**
   * Aprovar atestado via API
   */
  static async approve(certificateId: string, reviewedBy: string, reviewNotes?: string): Promise<boolean> {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/medical-certificates/${certificateId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          status: 'APPROVED',
          reviewedBy,
          reviewNotes: reviewNotes || null,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);
      return true;
    } catch (error) {
      logger.error('Erro ao aprovar atestado', { certificateId }, error as Error);
      return false;
    }
  }

  /**
   * Rejeitar atestado via API
   */
  static async reject(certificateId: string, reviewedBy: string, reviewNotes: string): Promise<boolean> {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/medical-certificates/${certificateId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          status: 'REJECTED',
          reviewedBy,
          reviewNotes,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);
      return true;
    } catch (error) {
      logger.error('Erro ao rejeitar atestado', { certificateId }, error as Error);
      return false;
    }
  }

  /**
   * Atualizar atestado via API
   */
  static async update(certificateId: string, updates: Partial<CreateMedicalCertificateData>): Promise<boolean> {
    try {
      // ✅ Converter datas de YYYY-MM-DD para DDMMYYYY se necessário
      const convertDateFormat = (date: string): string => {
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = date.split('-');
          return `${day}${month}${year}`;
        }
        return date;
      };

      const apiUpdates: {
        dataInicio?: string;
        dataFim?: string;
        motivo?: string | null;
      } = {};
      if (updates.startDate) apiUpdates.dataInicio = convertDateFormat(updates.startDate);
      if (updates.endDate) apiUpdates.dataFim = convertDateFormat(updates.endDate);
      if (updates.diagnosis !== undefined) apiUpdates.motivo = updates.diagnosis || null;

      // ✅ Adicionar headers de autenticação
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/medical-certificates/${certificateId}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiUpdates),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);
      return true;
    } catch (error) {
      logger.error('Erro ao atualizar atestado', { certificateId }, error as Error);
      return false;
    }
  }

  /**
   * Deletar atestado via API
   */
  static async delete(certificateId: string): Promise<boolean> {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/medical-certificates/${certificateId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);
      return true;
    } catch (error) {
      logger.error('Erro ao deletar atestado', { certificateId }, error as Error);
      return false;
    }
  }

  /**
   * Buscar atestados que cobrem uma data específica via API
   */
  static async getByDate(studentId: string, date: string): Promise<MedicalCertificate[]> {
    try {
      const response = await fetch(`/api/medical-certificates?studentId=${studentId}&date=${date}`);
      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const result = await response.json();
      return (result.data || []).map(this.mapApiToCertificate);
    } catch (error) {
      logger.error('Erro ao buscar atestados por data', { studentId, date }, error as Error);
      return [];
    }
  }

  /**
   * Buscar atestados pendentes de revisão via API
   */
  static async getPending(): Promise<MedicalCertificate[]> {
    try {
      const response = await fetch('/api/medical-certificates?status=PENDING');
      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const result = await response.json();
      return (result.data || []).map(this.mapApiToCertificate);
    } catch (error) {
      logger.error('Erro ao buscar atestados pendentes', {}, error as Error);
      return [];
    }
  }
}
