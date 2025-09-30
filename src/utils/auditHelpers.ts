/**
 * Audit Helpers - Centralized timestamp management
 *
 * Automatically adds createdAt, updatedAt, createdBy, updatedBy
 * to all entities for auditability and traceability
 */

import { Timestamp } from 'firebase/firestore';

export interface AuditFields {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export interface WithAudit<T> extends AuditFields {
  data: T;
}

/**
 * Add creation audit fields
 */
export function addCreationAudit<T>(
  data: T,
  userId?: string
): T & AuditFields {
  return {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...(userId && { createdBy: userId }),
    ...(userId && { updatedBy: userId }),
  };
}

/**
 * Add update audit fields
 */
export function addUpdateAudit<T>(
  data: T,
  userId?: string
): T & Partial<AuditFields> {
  return {
    ...data,
    updatedAt: Timestamp.now(),
    ...(userId && { updatedBy: userId }),
  };
}

/**
 * Extract only update audit fields (for partial updates)
 */
export function getUpdateAuditFields(userId?: string): Partial<AuditFields> {
  return {
    updatedAt: Timestamp.now(),
    ...(userId && { updatedBy: userId }),
  };
}

/**
 * Check if entity has audit fields
 */
export function hasAuditFields(data: any): boolean {
  return !!(data.createdAt || data.updatedAt);
}

/**
 * Format audit fields for display
 */
export function formatAuditInfo(data: AuditFields): {
  created: string | null;
  updated: string | null;
  createdBy: string | null;
  updatedBy: string | null;
} {
  return {
    created: data.createdAt ? data.createdAt.toDate().toISOString() : null,
    updated: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
    createdBy: data.createdBy || null,
    updatedBy: data.updatedBy || null,
  };
}

/**
 * Get human-readable audit summary
 */
export function getAuditSummary(data: AuditFields): string {
  const info = formatAuditInfo(data);

  if (!info.created && !info.updated) {
    return 'Sem informações de auditoria';
  }

  const parts: string[] = [];

  if (info.created) {
    const createdDate = new Date(info.created).toLocaleDateString('pt-BR');
    const createdBy = info.createdBy ? ` por ${info.createdBy}` : '';
    parts.push(`Criado em ${createdDate}${createdBy}`);
  }

  if (info.updated && info.updated !== info.created) {
    const updatedDate = new Date(info.updated).toLocaleDateString('pt-BR');
    const updatedBy = info.updatedBy ? ` por ${info.updatedBy}` : '';
    parts.push(`Atualizado em ${updatedDate}${updatedBy}`);
  }

  return parts.join(' • ');
}

/**
 * Migration helper: Add audit fields to existing data
 */
export function migrateToAudit<T>(
  data: T,
  existingCreatedAt?: Timestamp | Date | string
): T & AuditFields {
  const now = Timestamp.now();

  // Try to preserve existing createdAt if available
  let createdAt: Timestamp;
  if (existingCreatedAt) {
    if (existingCreatedAt instanceof Timestamp) {
      createdAt = existingCreatedAt;
    } else if (existingCreatedAt instanceof Date) {
      createdAt = Timestamp.fromDate(existingCreatedAt);
    } else if (typeof existingCreatedAt === 'string') {
      createdAt = Timestamp.fromDate(new Date(existingCreatedAt));
    } else {
      createdAt = now;
    }
  } else {
    createdAt = now;
  }

  return {
    ...data,
    createdAt,
    updatedAt: now,
  };
}