import { 
  safeParseDate, 
  safeToISOString, 
  batchProcessDates 
} from '../dateUtils';

describe('dateUtils', () => {
  describe('safeParseDate', () => {
    test('parses ISO date strings correctly', () => {
      const result = safeParseDate('2023-12-25T10:30:00.000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(11); // December is month 11
    });

    test('parses MM/DD/YYYY format correctly', () => {
      const result = safeParseDate('12/25/2023');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(25);
    });

    test('parses DD/MM/YYYY format with option', () => {
      const result = safeParseDate('25/12/2023', { assumeEuropean: true });
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(25);
    });

    test('parses YYYY-MM-DD format correctly', () => {
      const result = safeParseDate('2023-12-25');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(25);
    });

    test('returns null for invalid date strings', () => {
      expect(safeParseDate('invalid-date')).toBeNull();
      expect(safeParseDate('')).toBeNull();
      expect(safeParseDate(null)).toBeNull();
      expect(safeParseDate(undefined)).toBeNull();
    });

    test('returns null for invalid dates like 13/32/2023', () => {
      expect(safeParseDate('13/32/2023')).toBeNull();
      expect(safeParseDate('25/13/2023')).toBeNull();
    });

    test('handles edge cases', () => {
      // February 29th in non-leap year should be invalid
      expect(safeParseDate('02/29/2023')).toBeNull();
      
      // February 29th in leap year should be valid
      const leapDate = safeParseDate('02/29/2024');
      expect(leapDate).toBeInstanceOf(Date);
      expect(leapDate.getMonth()).toBe(1); // February
      expect(leapDate.getDate()).toBe(29);
    });
  });

  describe('safeToISOString', () => {
    test('converts valid Date to ISO string', () => {
      const date = new Date('2023-12-25T10:30:00.000Z');
      const result = safeToISOString(date);
      expect(result).toBe('2023-12-25T10:30:00.000Z');
    });

    test('returns null for invalid Date objects', () => {
      const invalidDate = new Date('invalid');
      expect(safeToISOString(invalidDate)).toBeNull();
    });

    test('returns null for non-Date inputs', () => {
      expect(safeToISOString('2023-12-25')).toBeNull();
      expect(safeToISOString(null)).toBeNull();
      expect(safeToISOString(undefined)).toBeNull();
      expect(safeToISOString({})).toBeNull();
    });
  });

  describe('batchProcessDates', () => {
    test('processes array of date strings', async () => {
      const dateStrings = ['2023-12-25', '12/24/2023', '2023-12-23T10:30:00Z'];
      const result = await batchProcessDates(dateStrings);
      
      expect(result).toHaveLength(3);
      result.forEach(item => {
        expect(item.parsed).toBeInstanceOf(Date);
        expect(item.isoString).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
      });
    });

    test('handles invalid dates in batch', async () => {
      const dateStrings = ['2023-12-25', 'invalid-date', '12/24/2023'];
      const result = await batchProcessDates(dateStrings);
      
      expect(result).toHaveLength(3);
      expect(result[0].parsed).toBeInstanceOf(Date);
      expect(result[1].parsed).toBeNull();
      expect(result[1].error).toContain('Failed to parse date');
      expect(result[2].parsed).toBeInstanceOf(Date);
    });

    test('processes large batches efficiently', async () => {
      const largeBatch = Array(1000).fill('2023-12-25');
      const startTime = Date.now();
      const result = await batchProcessDates(largeBatch);
      const endTime = Date.now();
      
      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      
      result.forEach(item => {
        expect(item.parsed).toBeInstanceOf(Date);
      });
    });

    test('returns empty array for invalid input', async () => {
      expect(await batchProcessDates(null)).toEqual([]);
      expect(await batchProcessDates(undefined)).toEqual([]);
      expect(await batchProcessDates('not-an-array')).toEqual([]);
    });
  });
});