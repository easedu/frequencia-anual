/**
 * Testes para utilitários de data
 * Garante funcionamento correto das funções críticas
 */

import {
  formatDate,
  parseDate,
  parseDateToFirebase,
  formatFirebaseDate,
  isDateInPeriod,
  daysDifference,
  getCurrentDateBR,
  isNotFutureDate,
  clearDateCache,
  getDateCacheStats
} from '../dateUtils';

describe('dateUtils', () => {
  beforeEach(() => {
    clearDateCache();
  });

  describe('formatDate', () => {
    it('should format Brazilian date correctly', () => {
      expect(formatDate('01/02/2023')).toBe('01/02/2023');
      expect(formatDate('31/12/2023')).toBe('31/12/2023');
    });

    it('should format ISO date correctly', () => {
      expect(formatDate('2023-02-01')).toBe('01/02/2023');
      expect(formatDate('2023-12-31')).toBe('31/12/2023');
    });

    it('should handle invalid dates gracefully', () => {
      expect(formatDate('')).toBe('01/01/1970');
      expect(formatDate(undefined)).toBe('01/01/1970');
      expect(formatDate('invalid')).toBe('invalid');
    });

    it('should cache formatted dates', () => {
      formatDate('01/02/2023');
      formatDate('01/02/2023');
      
      const stats = getDateCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('01/02/2023');
    });

    it('should validate date parts correctly', () => {
      expect(formatDate('32/01/2023')).toBe('32/01/2023'); // Invalid day
      expect(formatDate('01/13/2023')).toBe('01/13/2023'); // Invalid month
      expect(formatDate('01/01/1800')).toBe('01/01/1800'); // Invalid year
    });
  });

  describe('parseDate', () => {
    it('should parse Brazilian date correctly', () => {
      const date = parseDate('01/02/2023');
      expect(date).toBeInstanceOf(Date);
      expect(date?.getDate()).toBe(1);
      expect(date?.getMonth()).toBe(1); // 0-indexed
      expect(date?.getFullYear()).toBe(2023);
    });

    it('should return null for invalid dates', () => {
      expect(parseDate('')).toBeNull();
      expect(parseDate('invalid')).toBeNull();
      expect(parseDate('32/01/2023')).toBeNull();
      expect(parseDate('01/13/2023')).toBeNull();
    });
  });

  describe('parseDateToFirebase', () => {
    it('should convert Brazilian date to ISO format', () => {
      expect(parseDateToFirebase('01/02/2023')).toBe('2023-02-01');
      expect(parseDateToFirebase('31/12/2023')).toBe('2023-12-31');
    });

    it('should return null for invalid dates', () => {
      expect(parseDateToFirebase('32/01/2023')).toBeNull();
      expect(parseDateToFirebase('invalid')).toBeNull();
    });
  });

  describe('formatFirebaseDate', () => {
    it('should format Firebase date to Brazilian format', () => {
      expect(formatFirebaseDate('2023-02-01')).toBe('01/02/2023');
      expect(formatFirebaseDate('2023-12-31')).toBe('31/12/2023');
    });

    it('should handle invalid Firebase dates', () => {
      expect(formatFirebaseDate('')).toBe('01/01/1970');
      expect(formatFirebaseDate(undefined)).toBe('01/01/1970');
      expect(formatFirebaseDate('invalid')).toBe('01/01/1970');
    });
  });

  describe('isDateInPeriod', () => {
    it('should correctly identify dates within period', () => {
      expect(isDateInPeriod('15/01/2023', '01/01/2023', '31/01/2023')).toBe(true);
      expect(isDateInPeriod('01/01/2023', '01/01/2023', '31/01/2023')).toBe(true);
      expect(isDateInPeriod('31/01/2023', '01/01/2023', '31/01/2023')).toBe(true);
    });

    it('should correctly identify dates outside period', () => {
      expect(isDateInPeriod('01/02/2023', '01/01/2023', '31/01/2023')).toBe(false);
      expect(isDateInPeriod('31/12/2022', '01/01/2023', '31/01/2023')).toBe(false);
    });

    it('should handle invalid dates', () => {
      expect(isDateInPeriod('invalid', '01/01/2023', '31/01/2023')).toBe(false);
      expect(isDateInPeriod('15/01/2023', 'invalid', '31/01/2023')).toBe(false);
      expect(isDateInPeriod('15/01/2023', '01/01/2023', 'invalid')).toBe(false);
    });
  });

  describe('daysDifference', () => {
    it('should calculate difference in days correctly', () => {
      expect(daysDifference('01/01/2023', '02/01/2023')).toBe(1);
      expect(daysDifference('01/01/2023', '31/01/2023')).toBe(30);
      expect(daysDifference('31/01/2023', '01/01/2023')).toBe(30);
    });

    it('should return 0 for invalid dates', () => {
      expect(daysDifference('invalid', '01/01/2023')).toBe(0);
      expect(daysDifference('01/01/2023', 'invalid')).toBe(0);
    });
  });

  describe('getCurrentDateBR', () => {
    it('should return current date in Brazilian format', () => {
      const result = getCurrentDateBR();
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      
      // Verifica se é uma data válida
      expect(parseDate(result)).toBeInstanceOf(Date);
    });
  });

  describe('isNotFutureDate', () => {
    beforeAll(() => {
      // Mock current date to a fixed date for testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-06-15'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should correctly identify past dates', () => {
      expect(isNotFutureDate('14/06/2023')).toBe(true);
      expect(isNotFutureDate('01/01/2023')).toBe(true);
    });

    it('should correctly identify current date', () => {
      expect(isNotFutureDate('15/06/2023')).toBe(true);
    });

    it('should correctly identify future dates', () => {
      expect(isNotFutureDate('16/06/2023')).toBe(false);
      expect(isNotFutureDate('01/01/2024')).toBe(false);
    });

    it('should return false for invalid dates', () => {
      expect(isNotFutureDate('invalid')).toBe(false);
    });
  });

  describe('cache functionality', () => {
    it('should clear cache correctly', () => {
      formatDate('01/01/2023');
      formatDate('02/01/2023');
      
      expect(getDateCacheStats().size).toBe(2);
      
      clearDateCache();
      
      expect(getDateCacheStats().size).toBe(0);
    });

    it('should provide cache statistics', () => {
      formatDate('01/01/2023');
      formatDate('02/01/2023');
      
      const stats = getDateCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toEqual(['01/01/2023', '02/01/2023']);
    });
  });

  describe('edge cases', () => {
    it('should handle leap year correctly', () => {
      expect(parseDate('29/02/2024')).toBeInstanceOf(Date);
      expect(parseDate('29/02/2023')).toBeNull(); // Not a leap year
    });

    it('should handle different date separators', () => {
      // Currently only supports '/' separator
      expect(parseDate('01-02-2023')).toBeNull();
      expect(parseDate('01.02.2023')).toBeNull();
    });

    it('should handle very long date strings', () => {
      const longDate = '01/02/2023' + 'x'.repeat(1000);
      expect(formatDate(longDate)).toBe(longDate);
    });
  });
});