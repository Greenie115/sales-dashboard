import {
  calculateMetrics,
  getRetailerDistribution,
  getProductDistribution,
  calculateRepurchaseIntent,
  filterSalesData,
  identifyBrandPrefixes
} from '../dataProcessing';

// Mock data for testing
const mockSalesData = [
  {
    receipt_date: '2023-12-01',
    product_name: 'Coca Cola 500ml',
    chain: 'Target',
    price: 1.99
  },
  {
    receipt_date: '2023-12-02',
    product_name: 'Pepsi Max 330ml',
    chain: 'Walmart',
    price: 1.49
  },
  {
    receipt_date: '2023-12-03',
    product_name: 'Coca Cola Zero 500ml',
    chain: 'Target',
    price: 1.99
  }
];

const mockSurveyData = [
  {
    product_name: 'Coca Cola 500ml',
    'Q7. How likely are you to purchase [PRODUCT] again?': 'Very likely'
  },
  {
    product_name: 'Pepsi Max 330ml',
    'Q7. How likely are you to purchase [PRODUCT] again?': 'Somewhat likely'
  }
];

describe('dataProcessing', () => {
  describe('calculateMetrics', () => {
    test('calculates basic metrics correctly', () => {
      const result = calculateMetrics(mockSalesData);
      
      expect(result.totalTransactions).toBe(3);
      expect(result.totalRevenue).toBeCloseTo(5.47);
      expect(result.averageOrderValue).toBeCloseTo(1.82);
      expect(result.uniqueProducts).toBe(3);
      expect(result.uniqueRetailers).toBe(2);
    });

    test('handles empty data gracefully', () => {
      const result = calculateMetrics([]);
      
      expect(result.totalTransactions).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.averageOrderValue).toBe(0);
      expect(result.uniqueProducts).toBe(0);
      expect(result.uniqueRetailers).toBe(0);
    });

    test('handles malformed data', () => {
      const badData = [
        { product_name: 'Test' }, // missing other fields
        { chain: 'Store' }, // missing product_name
        {} // empty object
      ];
      
      const result = calculateMetrics(badData);
      expect(result.totalTransactions).toBe(3);
      expect(result.totalRevenue).toBe(0); // no valid price data
    });
  });

  describe('getRetailerDistribution', () => {
    test('calculates retailer distribution correctly', () => {
      const result = getRetailerDistribution(mockSalesData);
      
      expect(result).toHaveLength(2);
      
      const target = result.find(r => r.name === 'Target');
      const walmart = result.find(r => r.name === 'Walmart');
      
      expect(target.value).toBe(2);
      expect(target.percentage).toBeCloseTo(66.67, 1);
      expect(walmart.value).toBe(1);
      expect(walmart.percentage).toBeCloseTo(33.33, 1);
    });

    test('handles empty data', () => {
      const result = getRetailerDistribution([]);
      expect(result).toEqual([]);
    });
  });

  describe('getProductDistribution', () => {
    test('calculates product distribution correctly', () => {
      const result = getProductDistribution(mockSalesData);
      
      expect(result).toHaveLength(3);
      result.forEach(product => {
        expect(product.count).toBe(1);
        expect(product.percentage).toBeCloseTo(33.33, 1);
      });
    });
  });

  describe('calculateRepurchaseIntent', () => {
    test('calculates repurchase intent for products with survey data', () => {
      // Create combined dataset
      const combinedData = mockSalesData.map(sale => {
        const survey = mockSurveyData.find(s => s.product_name === sale.product_name);
        return survey ? { ...sale, ...survey } : sale;
      });

      const brandMapping = { 'Coca': ['Coca Cola', 'Coca Cola Zero'], 'Pepsi': ['Pepsi Max'] };
      const result = calculateRepurchaseIntent(combinedData, brandMapping);
      
      expect(result.length).toBeGreaterThan(0);
      
      const cocaResult = result.find(r => r.displayName.includes('Coca'));
      expect(cocaResult).toBeDefined();
      expect(cocaResult.repurchaseIntentRate).toBeGreaterThan(0);
    });

    test('handles products without survey data gracefully', () => {
      const brandMapping = { 'Coca': ['Coca Cola'] };
      const result = calculateRepurchaseIntent(mockSalesData, brandMapping);
      
      expect(result.length).toBeGreaterThan(0);
      result.forEach(product => {
        expect(product.dataStatus).toBe('no_survey_data');
        expect(product.repurchaseIntentRate).toBeNull();
      });
    });

    test('handles empty data', () => {
      const result = calculateRepurchaseIntent([], {});
      expect(result).toEqual([]);
    });
  });

  describe('identifyBrandPrefixes', () => {
    test('identifies common brand prefixes correctly', () => {
      const products = [
        'Coca Cola 500ml',
        'Coca Cola Zero 330ml', 
        'Pepsi Max 500ml',
        'Pepsi Diet 330ml',
        'Sprite 500ml'
      ];
      
      const result = identifyBrandPrefixes(products);
      
      expect(result['Coca']).toContain('Coca Cola 500ml');
      expect(result['Coca']).toContain('Coca Cola Zero 330ml');
      expect(result['Pepsi']).toContain('Pepsi Max 500ml');
      expect(result['Pepsi']).toContain('Pepsi Diet 330ml');
      expect(result['Sprite']).toContain('Sprite 500ml');
    });

    test('handles single-word products', () => {
      const products = ['Apple', 'Banana', 'Orange'];
      const result = identifyBrandPrefixes(products);
      
      expect(result['Apple']).toContain('Apple');
      expect(result['Banana']).toContain('Banana');
      expect(result['Orange']).toContain('Orange');
    });

    test('handles empty product list', () => {
      const result = identifyBrandPrefixes([]);
      expect(result).toEqual({});
    });

    test('handles duplicate products', () => {
      const products = ['Coca Cola 500ml', 'Coca Cola 500ml', 'Pepsi 330ml'];
      const result = identifyBrandPrefixes(products);
      
      expect(result['Coca']).toContain('Coca Cola 500ml');
      expect(result['Coca'].length).toBe(1); // Should deduplicate
    });
  });

  describe('filterSalesData', () => {
    test('filters by product correctly', () => {
      const filters = { selectedProducts: ['Coca Cola 500ml'] };
      const result = filterSalesData(mockSalesData, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].product_name).toBe('Coca Cola 500ml');
    });

    test('filters by retailer correctly', () => {
      const filters = { selectedRetailers: ['Target'] };
      const result = filterSalesData(mockSalesData, filters);
      
      expect(result).toHaveLength(2);
      result.forEach(item => {
        expect(item.chain).toBe('Target');
      });
    });

    test('filters by date range correctly', () => {
      const filters = { 
        startDate: '2023-12-02',
        endDate: '2023-12-02'
      };
      const result = filterSalesData(mockSalesData, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].receipt_date).toBe('2023-12-02');
    });

    test('applies all filters together', () => {
      const filters = {
        selectedProducts: ['Coca Cola 500ml'],
        selectedRetailers: ['Target'],
        startDate: '2023-12-01',
        endDate: '2023-12-01'
      };
      const result = filterSalesData(mockSalesData, filters);
      
      expect(result).toHaveLength(1);
      expect(result[0].product_name).toBe('Coca Cola 500ml');
      expect(result[0].chain).toBe('Target');
    });

    test('returns all data when no filters applied', () => {
      const result = filterSalesData(mockSalesData, {});
      expect(result).toEqual(mockSalesData);
    });

    test('handles empty data', () => {
      const result = filterSalesData([], { selectedProducts: ['Test'] });
      expect(result).toEqual([]);
    });
  });
});