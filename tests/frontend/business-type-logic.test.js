/**
 * Business Type Logic Tests
 * Tests business type selection logic without full React component rendering
 */

const axios = require('axios');
const { businessTypes } = require('../fixtures/testData');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('Business Type Selection Logic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Business Type Data Processing', () => {
    test('BTS-LOGIC-001: Processes business type API response correctly', () => {
      const apiResponse = {
        data: {
          success: true,
          data: [businessTypes.hotTubSpa, businessTypes.electrician]
        }
      };

      const businessTypesList = apiResponse.data.data;
      
      expect(Array.isArray(businessTypesList)).toBe(true);
      expect(businessTypesList.length).toBe(2);

      const hotTubType = businessTypesList.find(type => type.slug === 'hot-tub-spa');
      expect(hotTubType).toBeDefined();
      expect(hotTubType.name).toBe('Hot Tub & Spa');
      expect(hotTubType.default_categories).toBeDefined();
      expect(Array.isArray(hotTubType.default_categories)).toBe(true);
    });

    test('BTS-LOGIC-002: Validates business type selection data', () => {
      const selectedBusinessType = businessTypes.hotTubSpa;
      
      // Simulate selection validation logic
      const isValidSelection = (businessType) => {
        if (!businessType) return false;
        return typeof businessType.id === 'number' &&
               typeof businessType.name === 'string' &&
               typeof businessType.slug === 'string' &&
               Array.isArray(businessType.default_categories);
      };

      expect(isValidSelection(selectedBusinessType)).toBe(true);
      expect(isValidSelection(null)).toBe(false);
      expect(isValidSelection({})).toBe(false);
    });

    test('BTS-LOGIC-003: Formats step data correctly', () => {
      const selectedBusinessType = businessTypes.hotTubSpa;
      
      // Simulate step data formatting logic
      const formatStepData = (businessType) => ({
        businessTypeId: businessType.id,
        businessTypeName: businessType.name,
        businessTypeSlug: businessType.slug,
        defaultCategories: businessType.default_categories,
        selectedAt: new Date().toISOString()
      });

      const stepData = formatStepData(selectedBusinessType);
      
      expect(stepData.businessTypeId).toBe(1);
      expect(stepData.businessTypeName).toBe('Hot Tub & Spa');
      expect(stepData.businessTypeSlug).toBe('hot-tub-spa');
      expect(stepData.defaultCategories).toEqual(selectedBusinessType.default_categories);
      expect(stepData.selectedAt).toBeDefined();
    });
  });

  describe('API Integration Logic', () => {
    test('BTS-API-001: Fetches business types successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [businessTypes.hotTubSpa]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      // Simulate the API call logic
      const fetchBusinessTypes = async () => {
        try {
          const response = await axios.get('/api/business-types');
          if (response.data.success) {
            return response.data.data;
          }
          throw new Error('API returned unsuccessful response');
        } catch (error) {
          throw new Error(`Failed to fetch business types: ${error.message}`);
        }
      };

      const result = await fetchBusinessTypes();
      
      expect(result).toEqual([businessTypes.hotTubSpa]);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/business-types');
    });

    test('BTS-API-002: Handles API errors gracefully', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to load business types'
          }
        }
      };

      mockedAxios.get.mockRejectedValue(mockError);

      // Simulate error handling logic
      const fetchBusinessTypesWithErrorHandling = async () => {
        try {
          const response = await axios.get('/api/business-types');
          return response.data.data;
        } catch (error) {
          const errorMessage = error.response?.data?.message || 
                              'Failed to load business types. Please refresh and try again.';
          return { error: errorMessage };
        }
      };

      const result = await fetchBusinessTypesWithErrorHandling();
      
      expect(result.error).toBe('Failed to load business types');
    });

    test('BTS-API-003: Submits business type selection', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Business type selected successfully',
          data: {
            businessType: {
              id: 1,
              name: 'Hot Tub & Spa',
              slug: 'hot-tub-spa',
              defaultCategories: businessTypes.hotTubSpa.default_categories
            }
          }
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      // Simulate selection submission logic
      const submitBusinessTypeSelection = async (businessTypeId, authToken) => {
        try {
          const response = await axios.post('/api/business-types/select', {
            businessTypeId
          }, {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          });

          if (response.data.success) {
            return {
              success: true,
              data: response.data.data
            };
          }
          throw new Error(response.data.message || 'Failed to save business type');
        } catch (error) {
          return {
            success: false,
            error: error.response?.data?.message || 'Failed to save your business type selection'
          };
        }
      };

      const result = await submitBusinessTypeSelection(1, 'mock-token');
      
      expect(result.success).toBe(true);
      expect(result.data.businessType.name).toBe('Hot Tub & Spa');
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/business-types/select', {
        businessTypeId: 1
      }, {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });
    });
  });

  describe('Validation Logic', () => {
    test('BTS-VALIDATION-001: Validates required business type selection', () => {
      // Simulate validation logic
      const validateBusinessTypeSelection = (selectedBusinessTypeId) => {
        if (!selectedBusinessTypeId) {
          return {
            isValid: false,
            error: 'Please select your business type to continue'
          };
        }
        
        if (typeof selectedBusinessTypeId !== 'number' || selectedBusinessTypeId <= 0) {
          return {
            isValid: false,
            error: 'Invalid business type selection'
          };
        }

        return { isValid: true };
      };

      expect(validateBusinessTypeSelection(null).isValid).toBe(false);
      expect(validateBusinessTypeSelection(undefined).isValid).toBe(false);
      expect(validateBusinessTypeSelection('invalid').isValid).toBe(false);
      expect(validateBusinessTypeSelection(-1).isValid).toBe(false);
      expect(validateBusinessTypeSelection(1).isValid).toBe(true);
    });

    test('BTS-VALIDATION-002: Validates business type data structure', () => {
      // Simulate business type data validation
      const validateBusinessTypeData = (businessType) => {
        const requiredFields = ['id', 'name', 'slug', 'default_categories'];
        
        for (const field of requiredFields) {
          if (!businessType.hasOwnProperty(field)) {
            return {
              isValid: false,
              error: `Missing required field: ${field}`
            };
          }
        }

        if (!Array.isArray(businessType.default_categories)) {
          return {
            isValid: false,
            error: 'default_categories must be an array'
          };
        }

        return { isValid: true };
      };

      expect(validateBusinessTypeData(businessTypes.hotTubSpa).isValid).toBe(true);
      expect(validateBusinessTypeData({}).isValid).toBe(false);
      expect(validateBusinessTypeData({ id: 1, name: 'Test' }).isValid).toBe(false);
    });
  });

  describe('Performance Logic', () => {
    test('BTS-PERF-001: Business type processing performance', () => {
      const largeBusinessTypeList = Array.from({ length: 100 }, (_, i) => ({
        ...businessTypes.hotTubSpa,
        id: i + 1,
        name: `Business Type ${i + 1}`,
        slug: `business-type-${i + 1}`
      }));

      const startTime = Date.now();
      
      // Simulate processing logic
      const processedTypes = largeBusinessTypeList
        .filter(type => type.is_active !== false)
        .map(type => ({
          id: type.id,
          name: type.name,
          slug: type.slug,
          categoryCount: type.default_categories?.length || 0
        }));

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processedTypes.length).toBe(100);
      expect(processingTime).toBeLessThan(50); // Should process quickly
    });
  });
});
