/**
 * Soft Delete Helpers
 *
 * Implements logical deletion instead of physical deletion
 * Allows data recovery and maintains referential integrity
 */

import { Timestamp } from 'firebase/firestore';

export interface SoftDeleteFields {
  deleted: boolean;
  deletedAt?: Timestamp;
  deletedBy?: string;
  deleteReason?: string;
}

/**
 * Mark entity as deleted (soft delete)
 */
export function markAsDeleted(
  userId?: string,
  reason?: string
): SoftDeleteFields {
  return {
    deleted: true,
    deletedAt: Timestamp.now(),
    ...(userId && { deletedBy: userId }),
    ...(reason && { deleteReason: reason }),
  };
}

/**
 * Restore deleted entity
 */
export function restoreDeleted(): { deleted: boolean } {
  return {
    deleted: false,
  };
}

/**
 * Check if entity is deleted
 */
export function isDeleted(data: any): boolean {
  return data?.deleted === true;
}

/**
 * Check if entity is active (not deleted)
 */
export function isActive(data: any): boolean {
  return data?.deleted !== true;
}

/**
 * Format soft delete info for display
 */
export function formatDeleteInfo(data: SoftDeleteFields): {
  deleted: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
  deleteReason: string | null;
} {
  return {
    deleted: data.deleted,
    deletedAt: data.deletedAt ? data.deletedAt.toDate().toISOString() : null,
    deletedBy: data.deletedBy || null,
    deleteReason: data.deleteReason || null,
  };
}

/**
 * Get human-readable delete summary
 */
export function getDeleteSummary(data: SoftDeleteFields): string | null {
  if (!data.deleted) return null;

  const parts: string[] = ['Deletado'];

  if (data.deletedAt) {
    const date = data.deletedAt.toDate().toLocaleDateString('pt-BR');
    parts.push(`em ${date}`);
  }

  if (data.deletedBy) {
    parts.push(`por ${data.deletedBy}`);
  }

  if (data.deleteReason) {
    parts.push(`- Motivo: ${data.deleteReason}`);
  }

  return parts.join(' ');
}

/**
 * Initialize soft delete fields for new entities
 */
export function initializeSoftDelete(): { deleted: boolean } {
  return {
    deleted: false,
  };
}