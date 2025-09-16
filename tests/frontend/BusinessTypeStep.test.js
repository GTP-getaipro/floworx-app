
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import BusinessTypeStep from '../../frontend/src/components/onboarding/BusinessTypeStep';
// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('BusinessTypeStep Component Tests', () => {
  const mockOnNext = jest.fn();
  const mockOnBack = jest.fn();
  const mockOnStepDataChange = jest.fn();

  const mockBusinessTypes = [
    {
      id: 1,
      name: 'Hot Tub & Spa',
      description: 'Email automation for hot tub dealers, service companies, and spa retailers',
      slug: 'hot-tub-spa',
      default_categories: [
        { name: 'Service Calls', priority: 'high', description: 'Emergency repairs' },
        { name: 'Sales Inquiries', priority: 'medium', description: 'New customer quotes' },
        { name: 'Parts Orders', priority: 'medium', description: 'Replacement parts' }
      ]
    },
    {
      id: 2,
      name: 'Electrician',
      description: 'Email automation for electrical contractors and service providers',
      slug: 'electrician',
      default_categories: [
        { name: 'Emergency Calls', priority: 'high', description: 'Electrical emergencies' },
        { name: 'Estimates', priority: 'medium', description: 'Project estimates' }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-jwt-token');
  });

  describe('Component Rendering', () => {
    test('BTS-001: Renders loading state while fetching business types', async () => {
      // Mock API call to return a promise that doesn't resolve immediately
      mockedAxios.get.mockImplementation(() => new Promise(() => {}));

      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      expect(screen.getByText('Loading business types...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
    });

    test('BTS-002: Displays business type cards with correct data', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockBusinessTypes
        }
      });

      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hot Tub & Spa')).toBeInTheDocument();
        expect(screen.getByText('Electrician')).toBeInTheDocument();
      });

      // Check descriptions
      expect(screen.getByText(/Email automation for hot tub dealers/)).toBeInTheDocument();
      expect(screen.getByText(/Email automation for electrical contractors/)).toBeInTheDocument();

      // Check categories are displayed
      expect(screen.getByText('Service Calls')).toBeInTheDocument();
      expect(screen.getByText('Emergency Calls')).toBeInTheDocument();
    });

    test('BTS-002-CATEGORIES: Displays email categories with priority badges', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockBusinessTypes
        }
      });

      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      await waitFor(() => {
        // Check priority badges
        const highPriorityBadges = screen.getAllByText('high');
        const mediumPriorityBadges = screen.getAllByText('medium');
        
        expect(highPriorityBadges.length).toBeGreaterThan(0);
        expect(mediumPriorityBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockBusinessTypes
        }
      });
    });

    test('BTS-003: Handles business type selection interaction', async () => {
      const user = userEvent.setup();

      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hot Tub & Spa')).toBeInTheDocument();
      });

      // Click on Hot Tub & Spa business type
      const hotTubCard = screen.getByText('Hot Tub & Spa').closest('.business-type-card');
      await user.click(hotTubCard);

      // Check that onStepDataChange was called with correct data
      expect(mockOnStepDataChange).toHaveBeenCalledWith('business-type', {
        businessTypeId: 1,
        businessTypeName: 'Hot Tub & Spa',
        businessTypeSlug: 'hot-tub-spa',
        defaultCategories: mockBusinessTypes[0].default_categories
      });

      // Check visual feedback
      expect(hotTubCard).toHaveClass('selected');
      expect(screen.getByText('✓')).toBeInTheDocument(); // Checkmark
    });

    test('BTS-003-MULTIPLE: Allows switching between business type selections', async () => {
      const user = userEvent.setup();

      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hot Tub & Spa')).toBeInTheDocument();
      });

      // Select first business type
      const hotTubCard = screen.getByText('Hot Tub & Spa').closest('.business-type-card');
      await user.click(hotTubCard);

      // Select second business type
      const electricianCard = screen.getByText('Electrician').closest('.business-type-card');
      await user.click(electricianCard);

      // Check that the second selection is active
      expect(electricianCard).toHaveClass('selected');
      expect(hotTubCard).not.toHaveClass('selected');

      expect(mockOnStepDataChange).toHaveBeenLastCalledWith('business-type', {
        businessTypeId: 2,
        businessTypeName: 'Electrician',
        businessTypeSlug: 'electrician',
        defaultCategories: mockBusinessTypes[1].default_categories
      });
    });
  });

  describe('Form Validation', () => {
    beforeEach(async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockBusinessTypes
        }
      });
    });

    test('BTS-004: Shows validation error for no selection', async () => {
      const user = userEvent.setup();

      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Continue')).toBeInTheDocument();
      });

      // Try to continue without selecting a business type
      const continueButton = screen.getByText('Continue');
      await user.click(continueButton);

      expect(screen.getByText('Please select your business type to continue')).toBeInTheDocument();
      expect(mockOnNext).not.toHaveBeenCalled();
    });

    test('BTS-004-DISABLED: Continue button disabled when no selection', async () => {
      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      await waitFor(() => {
        const continueButton = screen.getByText('Continue');
        expect(continueButton).toBeDisabled();
      });
    });
  });

  describe('Success States', () => {
    test('BTS-005: Displays success state after selection', async () => {
      const user = userEvent.setup();
      
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockBusinessTypes
        }
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          message: 'Business type selected successfully',
          data: {
            businessType: {
              id: 1,
              name: 'Hot Tub & Spa',
              slug: 'hot-tub-spa',
              defaultCategories: mockBusinessTypes[0].default_categories
            }
          }
        }
      });

      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hot Tub & Spa')).toBeInTheDocument();
      });

      // Select business type
      const hotTubCard = screen.getByText('Hot Tub & Spa').closest('.business-type-card');
      await user.click(hotTubCard);

      // Click continue
      const continueButton = screen.getByText('Continue');
      await user.click(continueButton);

      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalled();
      });
    });

    test('BTS-005-SUMMARY: Shows selection summary', async () => {
      const user = userEvent.setup();
      
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockBusinessTypes
        }
      });

      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hot Tub & Spa')).toBeInTheDocument();
      });

      // Select business type
      const hotTubCard = screen.getByText('Hot Tub & Spa').closest('.business-type-card');
      await user.click(hotTubCard);

      // Check selection summary appears
      expect(screen.getByText('Selected: Hot Tub & Spa')).toBeInTheDocument();
      expect(screen.getByText(/Your email automation will be optimized/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('BTS-006: Handles API error states gracefully', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          data: {
            message: 'Failed to load business types'
          }
        }
      });

      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load business types/)).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    test('BTS-006-RETRY: Retry button reloads data', async () => {
      const user = userEvent.setup();
      
      // First call fails
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: {
            message: 'Network error'
          }
        }
      });

      // Second call succeeds
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockBusinessTypes
        }
      });

      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Hot Tub & Spa')).toBeInTheDocument();
      });
    });

    test('BTS-006-SUBMISSION: Handles submission error gracefully', async () => {
      const user = userEvent.setup();
      
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockBusinessTypes
        }
      });

      mockedAxios.post.mockRejectedValue({
        response: {
          data: {
            message: 'Failed to save business type selection'
          }
        }
      });

      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hot Tub & Spa')).toBeInTheDocument();
      });

      // Select and try to continue
      const hotTubCard = screen.getByText('Hot Tub & Spa').closest('.business-type-card');
      await user.click(hotTubCard);

      const continueButton = screen.getByText('Continue');
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to save business type selection/)).toBeInTheDocument();
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    test('BTS-008: Keyboard navigation support', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockBusinessTypes
        }
      });

      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hot Tub & Spa')).toBeInTheDocument();
      });

      // Test tab navigation
      const hotTubCard = screen.getByText('Hot Tub & Spa').closest('.business-type-card');
      hotTubCard.focus();
      
      // Simulate Enter key press
      fireEvent.keyDown(hotTubCard, { key: 'Enter', code: 'Enter' });
      
      expect(mockOnStepDataChange).toHaveBeenCalled();
    });

    test('BTS-009: Screen reader accessibility', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockBusinessTypes
        }
      });

      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      await waitFor(() => {
        // Check for proper ARIA labels and roles
        expect(screen.getByRole('heading', { name: /Select Your Business Type/ })).toBeInTheDocument();
        
        // Check business type cards have proper accessibility attributes
        const cards = screen.getAllByRole('button');
        expect(cards.length).toBeGreaterThan(0);
        
        cards.forEach(card => {
          expect(card).toHaveAttribute('aria-label');
        });
      });
    });
  });

  describe('Performance', () => {
    test('BTS-PERF-001: Component renders within performance budget', async () => {
      const startTime = performance.now();
      
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          data: mockBusinessTypes
        }
      });

      render(
        <BusinessTypeStep
          onNext={mockOnNext}
          onBack={mockOnBack}
          stepData={{}}
          onStepDataChange={mockOnStepDataChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hot Tub & Spa')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(200); // Should render within 200ms
    });
  });
});
