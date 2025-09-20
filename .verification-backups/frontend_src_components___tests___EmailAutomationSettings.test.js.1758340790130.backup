import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmailAutomationSettings from '../EmailAutomationSettings';
import apiService from '../../services/api';

// Mock the API service
jest.mock('../../services/api');

const mockConfig = {
  client_id: 'test-client-123',
  version: 1,
  people: {
    managers: [
      { name: 'John Manager', email: 'john@example.com' },
      { name: 'Jane Manager', email: 'jane@example.com' }
    ]
  },
  suppliers: [
    { name: 'Supplier One', domains: ['supplier1.com', 'supplier1.net'] },
    { name: 'Supplier Two', domains: ['supplier2.com'] }
  ],
  channels: {
    email: {
      label_map: {
        'Sales': 'Sales',
        'Support': 'Support',
        'Urgent': 'Urgent'
      }
    }
  },
  signature: {
    mode: 'default',
    custom_text: null
  },
  ai: {
    locked: false
  }
};

const mockConfigLocked = {
  ...mockConfig,
  ai: { locked: true }
};

describe('EmailAutomationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    apiService.getClientConfig.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<EmailAutomationSettings clientId="test-client-123" />);
    
    expect(screen.getByText('⏳ Loading configuration...')).toBeInTheDocument();
  });

  it('should load and display configuration', async () => {
    apiService.getClientConfig.mockResolvedValue({
      success: true,
      data: mockConfig
    });

    render(<EmailAutomationSettings clientId="test-client-123" />);

    await waitFor(() => {
      expect(screen.getByText('📧 Email Automation Settings')).toBeInTheDocument();
    });

    // Check managers section
    expect(screen.getByDisplayValue('John Manager')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Jane Manager')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();

    // Check suppliers section
    expect(screen.getByDisplayValue('Supplier One')).toBeInTheDocument();
    expect(screen.getByDisplayValue('supplier1.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Supplier Two')).toBeInTheDocument();

    // Check label mapping section - use getAllByDisplayValue since there are key and value inputs
    const salesInputs = screen.getAllByDisplayValue('Sales');
    expect(salesInputs).toHaveLength(2); // Key and value inputs
    expect(screen.getAllByDisplayValue('Support')).toHaveLength(2);
    expect(screen.getAllByDisplayValue('Urgent')).toHaveLength(2);

    // Check signature section
    const defaultRadio = screen.getByRole('radio', { name: /default signature/i });
    expect(defaultRadio).toBeChecked();
  });

  it('should show AI locked indicator when ai.locked is true', async () => {
    apiService.getClientConfig.mockResolvedValue({
      success: true,
      data: mockConfigLocked
    });

    render(<EmailAutomationSettings clientId="test-client-123" />);

    await waitFor(() => {
      expect(screen.getByText(/AI settings are locked and managed by the system/)).toBeInTheDocument();
    });
  });

  it('should handle custom signature visibility toggle', async () => {
    apiService.getClientConfig.mockResolvedValue({
      success: true,
      data: { ...mockConfig, signature: { mode: 'custom', custom_text: 'Custom signature text' } }
    });

    render(<EmailAutomationSettings clientId="test-client-123" />);

    await waitFor(() => {
      const customRadio = screen.getByRole('radio', { name: /custom signature/i });
      expect(customRadio).toBeChecked();
    });

    // Custom signature textarea should be visible
    expect(screen.getByDisplayValue('Custom signature text')).toBeInTheDocument();
  });

  it('should hide custom signature textarea when not in custom mode', async () => {
    apiService.getClientConfig.mockResolvedValue({
      success: true,
      data: mockConfig
    });

    render(<EmailAutomationSettings clientId="test-client-123" />);

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /default signature/i })).toBeChecked();
    });

    // Custom signature textarea should not be visible
    expect(screen.queryByRole('textbox', { name: /custom signature text/i })).not.toBeInTheDocument();
  });

  it('should add new manager when add button is clicked', async () => {
    apiService.getClientConfig.mockResolvedValue({
      success: true,
      data: mockConfig
    });

    render(<EmailAutomationSettings clientId="test-client-123" />);

    await waitFor(() => {
      expect(screen.getByText('👥 Managers')).toBeInTheDocument();
    });

    const addManagerBtn = screen.getByRole('button', { name: /add manager/i });
    fireEvent.click(addManagerBtn);

    // Should have 3 manager name inputs now (2 existing + 1 new)
    const managerNameInputs = screen.getAllByPlaceholderText('Manager Name');
    expect(managerNameInputs).toHaveLength(3);
  });

  it('should save configuration with correct payload shape', async () => {
    apiService.getClientConfig.mockResolvedValue({
      success: true,
      data: mockConfig
    });
    apiService.updateClientConfig.mockResolvedValue({
      success: true,
      data: { ok: true, version: 2 }
    });

    render(<EmailAutomationSettings clientId="test-client-123" />);

    await waitFor(() => {
      expect(screen.getByText('📧 Email Automation Settings')).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: /save configuration/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiService.updateClientConfig).toHaveBeenCalledWith('test-client-123', mockConfig);
    });
  });

  it('should show error when API rejects save', async () => {
    apiService.getClientConfig.mockResolvedValue({
      success: true,
      data: mockConfig
    });
    apiService.updateClientConfig.mockResolvedValue({
      success: false,
      error: 'Validation failed: Manager email is required'
    });

    render(<EmailAutomationSettings clientId="test-client-123" />);

    await waitFor(() => {
      expect(screen.getByText('📧 Email Automation Settings')).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: /save configuration/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('❌ Validation failed: Manager email is required')).toBeInTheDocument();
    });
  });

  it('should handle provision action', async () => {
    apiService.getClientConfig.mockResolvedValue({
      success: true,
      data: mockConfig
    });
    apiService.provisionClient.mockResolvedValue({
      success: true,
      data: { ok: true }
    });

    render(<EmailAutomationSettings clientId="test-client-123" />);

    await waitFor(() => {
      expect(screen.getByText('📧 Email Automation Settings')).toBeInTheDocument();
    });

    const provisionBtn = screen.getByRole('button', { name: /provision email/i });
    fireEvent.click(provisionBtn);

    await waitFor(() => {
      expect(apiService.provisionClient).toHaveBeenCalledWith('test-client-123');
      expect(screen.getByText('✅ Email provisioning completed successfully!')).toBeInTheDocument();
    });
  });

  it('should handle redeploy action', async () => {
    apiService.getClientConfig.mockResolvedValue({
      success: true,
      data: mockConfig
    });
    apiService.redeployClient.mockResolvedValue({
      success: true,
      data: { ok: true }
    });

    render(<EmailAutomationSettings clientId="test-client-123" />);

    await waitFor(() => {
      expect(screen.getByText('📧 Email Automation Settings')).toBeInTheDocument();
    });

    const redeployBtn = screen.getByRole('button', { name: /redeploy workflow/i });
    fireEvent.click(redeployBtn);

    await waitFor(() => {
      expect(apiService.redeployClient).toHaveBeenCalledWith('test-client-123');
      expect(screen.getByText('✅ Workflow redeployed successfully!')).toBeInTheDocument();
    });
  });

  it('should remove manager when remove button is clicked', async () => {
    apiService.getClientConfig.mockResolvedValue({
      success: true,
      data: mockConfig
    });

    render(<EmailAutomationSettings clientId="test-client-123" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('John Manager')).toBeInTheDocument();
    });

    // Find and click the first remove button (for John Manager)
    const removeButtons = screen.getAllByTitle('Remove Manager');
    fireEvent.click(removeButtons[0]);

    // John Manager should be removed
    expect(screen.queryByDisplayValue('John Manager')).not.toBeInTheDocument();
    // Jane Manager should still be there
    expect(screen.getByDisplayValue('Jane Manager')).toBeInTheDocument();
  });

  it('should update label mapping when input changes', async () => {
    apiService.getClientConfig.mockResolvedValue({
      success: true,
      data: mockConfig
    });

    render(<EmailAutomationSettings clientId="test-client-123" />);

    await waitFor(() => {
      expect(screen.getAllByDisplayValue('Sales')).toHaveLength(2);
    });

    // Find the label value input for Sales and change it
    const labelInputs = screen.getAllByDisplayValue('Sales');
    const labelValueInput = labelInputs.find(input => input.className === 'label-value');

    fireEvent.change(labelValueInput, { target: { value: 'New Sales Label' } });

    expect(labelValueInput.value).toBe('New Sales Label');
  });
});
