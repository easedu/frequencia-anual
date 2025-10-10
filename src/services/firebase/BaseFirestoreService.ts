/**
 * BaseFirestoreService - Serviço base genérico para operações Firestore
 *
 * Reduz duplicação de código fornecendo operações CRUD comuns.
 * Todos os serviços específicos (StudentService, TaskService, etc) devem herdar desta classe.
 *
 * @template T - Tipo do documento (Student, Task, etc)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  QueryConstraint,
  Timestamp,
  WriteBatch,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase.config';
import { logger } from '@/utils/logger';

/**
 * Opções para queries
 */
export interface QueryOptions {
  limit?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  startAfter?: DocumentSnapshot;
  filters?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains';
    value: any;
  }>;
}

/**
 * Resultado paginado
 */
export interface PaginatedResult<T> {
  data: T[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Auditoria padrão
 */
export interface Auditable {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  deletedAt?: Timestamp | null;
}

/**
 * Classe base abstrata para serviços Firestore
 */
export abstract class BaseFirestoreService<T extends Auditable> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  /**
   * Obtém referência da coleção
   */
  protected getCollectionRef() {
    return collection(db, this.collectionName);
  }

  /**
   * Obtém referência de um documento
   */
  protected getDocRef(id: string) {
    return doc(db, this.collectionName, id);
  }

  /**
   * Busca documento por ID
   */
  async getById(id: string): Promise<T | null> {
    try {
      const docRef = this.getDocRef(id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data() as T;

      // Não retornar se deletado (soft delete)
      if (data.deletedAt) {
        return null;
      }

      return { id: docSnap.id, ...data } as T;
    } catch (error) {
      logger.error(`Erro ao buscar documento ${id} em ${this.collectionName}:`, error as Error);
      throw error;
    }
  }

  /**
   * Busca todos os documentos (com soft delete automático)
   */
  async getAll(options?: QueryOptions): Promise<T[]> {
    try {
      const constraints: QueryConstraint[] = [];

      // Filtro de soft delete (não retornar deletados)
      constraints.push(where('deletedAt', '==', null));

      // Aplicar filtros customizados
      if (options?.filters) {
        options.filters.forEach(filter => {
          constraints.push(where(filter.field, filter.operator, filter.value));
        });
      }

      // Ordenação
      if (options?.orderByField) {
        constraints.push(orderBy(options.orderByField, options.orderDirection || 'asc'));
      }

      // Limite
      if (options?.limit) {
        constraints.push(limit(options.limit));
      }

      // Start after (paginação)
      if (options?.startAfter) {
        constraints.push(startAfter(options.startAfter));
      }

      const q = query(this.getCollectionRef(), ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as unknown as T));
    } catch (error) {
      logger.error(`Erro ao buscar documentos em ${this.collectionName}:`, error as Error);
      throw error;
    }
  }

  /**
   * Busca com paginação
   */
  async getPaginated(options: QueryOptions): Promise<PaginatedResult<T>> {
    try {
      const pageSize = options.limit || 20;
      const constraints: QueryConstraint[] = [];

      // Soft delete
      constraints.push(where('deletedAt', '==', null));

      // Filtros
      if (options.filters) {
        options.filters.forEach(filter => {
          constraints.push(where(filter.field, filter.operator, filter.value));
        });
      }

      // Ordenação
      if (options.orderByField) {
        constraints.push(orderBy(options.orderByField, options.orderDirection || 'asc'));
      }

      // Start after
      if (options.startAfter) {
        constraints.push(startAfter(options.startAfter));
      }

      // Buscar 1 a mais para saber se há próxima página
      constraints.push(limit(pageSize + 1));

      const q = query(this.getCollectionRef(), ...constraints);
      const snapshot = await getDocs(q);

      const docs = snapshot.docs.slice(0, pageSize);
      const hasMore = snapshot.docs.length > pageSize;
      const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

      const data = docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as unknown as T));

      return { data, lastDoc, hasMore };
    } catch (error) {
      logger.error(`Erro ao buscar paginado em ${this.collectionName}:`, error as Error);
      throw error;
    }
  }

  /**
   * Cria novo documento
   */
  async create(id: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<string> {
    try {
      const docRef = this.getDocRef(id);
      const now = Timestamp.now();

      const docData = {
        ...data,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      } as T;

      await setDoc(docRef, docData);

      logger.info(`Documento criado em ${this.collectionName}:`, { id });
      return id;
    } catch (error) {
      logger.error(`Erro ao criar documento em ${this.collectionName}:`, error as Error);
      throw error;
    }
  }

  /**
   * Atualiza documento existente
   */
  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>): Promise<void> {
    try {
      const docRef = this.getDocRef(id);

      const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, updateData);

      logger.info(`Documento atualizado em ${this.collectionName}:`, { id });
    } catch (error) {
      logger.error(`Erro ao atualizar documento ${id} em ${this.collectionName}:`, error as Error);
      throw error;
    }
  }

  /**
   * Soft delete (marca como deletado sem remover)
   */
  async softDelete(id: string): Promise<void> {
    try {
      const docRef = this.getDocRef(id);

      await updateDoc(docRef, {
        deletedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      logger.info(`Documento soft deleted em ${this.collectionName}:`, { id });
    } catch (error) {
      logger.error(`Erro ao soft delete documento ${id} em ${this.collectionName}:`, error as Error);
      throw error;
    }
  }

  /**
   * Hard delete (remove permanentemente)
   * ⚠️ Use com cuidado!
   */
  async hardDelete(id: string): Promise<void> {
    try {
      const docRef = this.getDocRef(id);
      await deleteDoc(docRef);

      logger.warn(`Documento HARD DELETED em ${this.collectionName}:`, { id });
    } catch (error) {
      logger.error(`Erro ao hard delete documento ${id} em ${this.collectionName}:`, error as Error);
      throw error;
    }
  }

  /**
   * Restaura documento soft deleted
   */
  async restore(id: string): Promise<void> {
    try {
      const docRef = this.getDocRef(id);

      await updateDoc(docRef, {
        deletedAt: null,
        updatedAt: Timestamp.now(),
      });

      logger.info(`Documento restaurado em ${this.collectionName}:`, { id });
    } catch (error) {
      logger.error(`Erro ao restaurar documento ${id} em ${this.collectionName}:`, error as Error);
      throw error;
    }
  }

  /**
   * Batch operations
   */
  createBatch(): WriteBatch {
    return writeBatch(db);
  }

  /**
   * Helper para batch create
   */
  batchCreate(batch: WriteBatch, id: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): void {
    const docRef = this.getDocRef(id);
    const now = Timestamp.now();

    const docData = {
      ...data,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    } as T;

    batch.set(docRef, docData);
  }

  /**
   * Helper para batch update
   */
  batchUpdate(batch: WriteBatch, id: string, data: Partial<T>): void {
    const docRef = this.getDocRef(id);

    const updateData = {
      ...data,
      updatedAt: Timestamp.now(),
    };

    batch.update(docRef, updateData);
  }

  /**
   * Helper para batch soft delete
   */
  batchSoftDelete(batch: WriteBatch, id: string): void {
    const docRef = this.getDocRef(id);

    batch.update(docRef, {
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * Conta documentos (com filtros opcionais)
   */
  async count(filters?: QueryOptions['filters']): Promise<number> {
    try {
      const constraints: QueryConstraint[] = [];

      // Soft delete
      constraints.push(where('deletedAt', '==', null));

      // Filtros customizados
      if (filters) {
        filters.forEach(filter => {
          constraints.push(where(filter.field, filter.operator, filter.value));
        });
      }

      const q = query(this.getCollectionRef(), ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.size;
    } catch (error) {
      logger.error(`Erro ao contar documentos em ${this.collectionName}:`, error as Error);
      throw error;
    }
  }

  /**
   * Verifica se documento existe
   */
  async exists(id: string): Promise<boolean> {
    try {
      const docRef = this.getDocRef(id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return false;
      }

      const data = docSnap.data();
      // Considera não existe se foi soft deleted
      return !data.deletedAt;
    } catch (error) {
      logger.error(`Erro ao verificar existência de documento ${id} em ${this.collectionName}:`, error as Error);
      throw error;
    }
  }
}
