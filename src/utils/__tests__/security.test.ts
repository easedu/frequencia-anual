/**
 * Testes para utilitários de segurança
 * Garante que as funções de sanitização funcionem corretamente
 */

import {
  sanitizeString,
  sanitizeHTML,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeCEP,
  sanitizeName,
  sanitizeDate,
  sanitizeDescription,
  validateFile,
  sanitizeObject
} from '../security';

describe('security utils', () => {
  describe('sanitizeString', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeString('javascript:alert("xss")')).toBe('alert("xss")');
      expect(sanitizeString('onclick=alert("xss")')).toBe('alert("xss")');
    });

    it('should preserve safe characters and accents', () => {
      expect(sanitizeString('João da Silva')).toBe('João da Silva');
      expect(sanitizeString('Texto com acentuação: ção, ã, é')).toBe('Texto com acentuação: ção, ã, é');
    });

    it('should handle empty and undefined input', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test');
    });
  });

  describe('sanitizeHTML', () => {
    it('should escape HTML content', () => {
      const html = '<div>Hello <script>alert("xss")</script></div>';
      const result = sanitizeHTML(html);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;');
    });
  });

  describe('sanitizeEmail', () => {
    it('should validate and clean email addresses', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
      expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
    });

    it('should return empty string for invalid emails', () => {
      expect(sanitizeEmail('invalid-email')).toBe('');
      expect(sanitizeEmail('@example.com')).toBe('');
      expect(sanitizeEmail('test@')).toBe('');
      expect(sanitizeEmail('')).toBe('');
      expect(sanitizeEmail(undefined)).toBe('');
    });
  });

  describe('sanitizePhoneNumber', () => {
    it('should format Brazilian phone numbers correctly', () => {
      expect(sanitizePhoneNumber('11999887766')).toBe('(11) 99988-7766');
      expect(sanitizePhoneNumber('1199887766')).toBe('(11) 9988-7766');
      expect(sanitizePhoneNumber('(11) 99988-7766')).toBe('(11) 99988-7766');
    });

    it('should return empty string for invalid numbers', () => {
      expect(sanitizePhoneNumber('123')).toBe('');
      expect(sanitizePhoneNumber('123456789012')).toBe('');
      expect(sanitizePhoneNumber('')).toBe('');
      expect(sanitizePhoneNumber(undefined)).toBe('');
    });
  });

  describe('sanitizeCEP', () => {
    it('should format CEP correctly', () => {
      expect(sanitizeCEP('01310100')).toBe('01310-100');
      expect(sanitizeCEP('01310-100')).toBe('01310-100');
    });

    it('should return empty string for invalid CEP', () => {
      expect(sanitizeCEP('123')).toBe('');
      expect(sanitizeCEP('123456789')).toBe('');
      expect(sanitizeCEP('')).toBe('');
      expect(sanitizeCEP(undefined)).toBe('');
    });
  });

  describe('sanitizeName', () => {
    it('should preserve names with accents', () => {
      expect(sanitizeName('João da Silva')).toBe('João da Silva');
      expect(sanitizeName('María José')).toBe('María José');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeName('João<script>')).toBe('João');
      expect(sanitizeName('Silva"alert()')).toBe('Silvaalert()');
    });

    it('should normalize whitespace', () => {
      expect(sanitizeName('  João   da   Silva  ')).toBe('João da Silva');
    });

    it('should limit length', () => {
      const longName = 'a'.repeat(150);
      expect(sanitizeName(longName)).toHaveLength(100);
    });

    it('should handle empty input', () => {
      expect(sanitizeName('')).toBe('');
      expect(sanitizeName(undefined)).toBe('');
    });
  });

  describe('sanitizeDate', () => {
    it('should validate correct Brazilian dates', () => {
      expect(sanitizeDate('01/01/2023')).toBe('01/01/2023');
      expect(sanitizeDate('31/12/2023')).toBe('31/12/2023');
    });

    it('should reject invalid dates', () => {
      expect(sanitizeDate('32/01/2023')).toBe('');
      expect(sanitizeDate('01/13/2023')).toBe('');
      expect(sanitizeDate('01/01/1800')).toBe('');
      expect(sanitizeDate('01/01/2200')).toBe('');
      expect(sanitizeDate('invalid')).toBe('');
      expect(sanitizeDate('')).toBe('');
      expect(sanitizeDate(undefined)).toBe('');
    });
  });

  describe('sanitizeDescription', () => {
    it('should clean descriptions while preserving content', () => {
      const description = 'Esta é uma descrição válida com acentos: ção, ã, é.';
      expect(sanitizeDescription(description)).toBe(description);
    });

    it('should remove dangerous content', () => {
      expect(sanitizeDescription('Descrição <script>alert("xss")</script>'))
        .toBe('Descrição scriptalert("xss")/script');
    });

    it('should limit length', () => {
      const longDescription = 'a'.repeat(1500);
      expect(sanitizeDescription(longDescription)).toHaveLength(1000);
    });

    it('should handle empty input', () => {
      expect(sanitizeDescription('')).toBe('');
      expect(sanitizeDescription(undefined)).toBe('');
    });
  });

  describe('validateFile', () => {
    it('should validate allowed file types', () => {
      const csvFile = new File([''], 'test.csv', { type: 'text/csv' });
      const xlsFile = new File([''], 'test.xls', { type: 'application/vnd.ms-excel' });
      
      expect(validateFile(csvFile).isValid).toBe(true);
      expect(validateFile(xlsFile).isValid).toBe(true);
    });

    it('should reject disallowed file types', () => {
      const jsFile = new File([''], 'test.js', { type: 'application/javascript' });
      const result = validateFile(jsFile);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Tipo de arquivo não permitido');
    });

    it('should validate file size', () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'test.csv', { 
        type: 'text/csv' 
      });
      const result = validateFile(largeFile);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Arquivo muito grande');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string properties recursively', () => {
      const obj = {
        name: 'João <script>',
        description: 'Test onclick=alert()',
        nested: {
          value: 'Nested <script>',
          array: ['Item <script>', 'Item 2']
        },
        number: 123,
        boolean: true
      };

      const result = sanitizeObject(obj);

      expect(result.name).toBe('João ');
      expect(result.description).toBe('Test alert()');
      expect(result.nested.value).toBe('Nested ');
      expect(result.nested.array[0]).toBe('Item ');
      expect(result.nested.array[1]).toBe('Item 2');
      expect(result.number).toBe(123);
      expect(result.boolean).toBe(true);
    });

    it('should handle arrays correctly', () => {
      const obj = {
        items: ['Item <script>', 'Item 2', { nested: 'Nested <script>' }]
      };

      const result = sanitizeObject(obj);

      expect(result.items[0]).toBe('Item ');
      expect(result.items[1]).toBe('Item 2');
      expect(result.items[2].nested).toBe('Nested ');
    });

    it('should preserve non-string values', () => {
      const obj = {
        date: new Date(),
        null: null,
        undefined: undefined,
        number: 42,
        boolean: false,
        array: [1, 2, 3]
      };

      const result = sanitizeObject(obj);

      expect(result.date).toBeInstanceOf(Date);
      expect(result.null).toBe(null);
      expect(result.undefined).toBe(undefined);
      expect(result.number).toBe(42);
      expect(result.boolean).toBe(false);
      expect(result.array).toEqual([1, 2, 3]);
    });
  });

  describe('XSS prevention', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      'onclick=alert("xss")',
      'onload=alert("xss")',
      '<img src=x onerror=alert("xss")>',
      '&lt;script&gt;alert("xss")&lt;/script&gt;'
    ];

    it('should prevent XSS in string sanitization', () => {
      xssPayloads.forEach(payload => {
        const result = sanitizeString(payload);
        expect(result.toLowerCase()).not.toContain('script');
        expect(result.toLowerCase()).not.toContain('javascript:');
        expect(result.toLowerCase()).not.toMatch(/on\w+=/);
      });
    });

    it('should prevent XSS in name sanitization', () => {
      xssPayloads.forEach(payload => {
        const result = sanitizeName(`João ${payload}`);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('javascript:');
        expect(result).not.toMatch(/on\w+=/);
      });
    });

    it('should prevent XSS in description sanitization', () => {
      xssPayloads.forEach(payload => {
        const result = sanitizeDescription(`Description ${payload}`);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('javascript:');
        expect(result).not.toMatch(/on\w+=/);
      });
    });
  });
});