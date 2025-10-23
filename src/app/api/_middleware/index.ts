/**
 * API Middlewares - Barrel Export
 *
 * Centraliza todos os middlewares para fácil importação
 */

// Auth middleware (com timeout integrado)
export { withAuth, type AuthenticatedHandler } from './auth';

// Timeout middleware (para APIs públicas)
export { withTimeout, isNearTimeout, type PublicApiHandler } from './withTimeout';

// Validation middleware
export { validateRequest } from './validation';

// Response utilities
export { successResponse, errorResponse, notFoundResponse } from '../_utils/response';
