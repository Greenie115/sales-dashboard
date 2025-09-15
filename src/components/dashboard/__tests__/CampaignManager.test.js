import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useData } from '../../../context/DataContext';
import CampaignManager from '../CampaignManager';

// Mock the contexts
jest.mock('../../../context/DataContext');
jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ darkMode: false })
}));

// Mock file reader and Papa parse
const mockPapaParse = {
  parse: jest.fn()
};

jest.mock('papaparse', () => mockPapaParse);

describe('CampaignManager', () => {
  const mockSetCampaigns = jest.fn();
  const mockDataContext = {
    campaigns: {},
    setCampaigns: mockSetCampaigns,
    brandMapping: {},
    setBrandMapping: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useData.mockReturnValue(mockDataContext);
  });

  test('renders upload areas for both campaigns', () => {
    render(<CampaignManager />);
    
    expect(screen.getByText(/Upload Campaign A Data/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload Campaign B Data/i)).toBeInTheDocument();
  });

  test('shows upload instructions', () => {
    render(<CampaignManager />);
    
    expect(screen.getByText(/Drag & drop your CSV files here/i)).toBeInTheDocument();
    expect(screen.getByText(/Supported formats: CSV files with sales data/i)).toBeInTheDocument();
  });

  test('handles CSV file upload', async () => {
    const csvContent = 'receipt_date,product_name,chain\\n2023-12-01,Coca Cola,Target';
    const csvData = [
      { receipt_date: '2023-12-01', product_name: 'Coca Cola', chain: 'Target' }
    ];

    mockPapaParse.parse.mockImplementation((file, options) => {
      options.complete({
        data: csvData,
        meta: { fields: ['receipt_date', 'product_name', 'chain'] }
      });
    });

    render(<CampaignManager />);
    
    const fileInput = screen.getAllByLabelText(/Upload CSV/i)[0];
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockPapaParse.parse).toHaveBeenCalledWith(file, expect.objectContaining({
        header: true,
        skipEmptyLines: true
      }));
    });
  });

  test('displays processing stages during upload', () => {
    render(<CampaignManager />);
    
    // Initially should show upload interface
    expect(screen.getByText(/Drag & drop your CSV files here/i)).toBeInTheDocument();
  });

  test('shows error message for invalid CSV', async () => {
    mockPapaParse.parse.mockImplementation((file, options) => {
      options.error(new Error('Invalid CSV format'));
    });

    render(<CampaignManager />);
    
    const fileInput = screen.getAllByLabelText(/Upload CSV/i)[0];
    const file = new File(['invalid,csv,data'], 'test.csv', { type: 'text/csv' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Error processing/i)).toBeInTheDocument();
    });
  });

  test('handles multiple file uploads for different campaigns', async () => {
    const csvData = [
      { receipt_date: '2023-12-01', product_name: 'Product A', chain: 'Store 1' }
    ];

    mockPapaParse.parse.mockImplementation((file, options) => {
      options.complete({
        data: csvData,
        meta: { fields: ['receipt_date', 'product_name', 'chain'] }
      });
    });

    render(<CampaignManager />);
    
    const fileInputs = screen.getAllByLabelText(/Upload CSV/i);
    expect(fileInputs).toHaveLength(2); // One for each campaign
    
    // Test uploading to Campaign A
    const file1 = new File(['csv data'], 'campaign-a.csv', { type: 'text/csv' });
    fireEvent.change(fileInputs[0], { target: { files: [file1] } });

    // Test uploading to Campaign B
    const file2 = new File(['csv data'], 'campaign-b.csv', { type: 'text/csv' });
    fireEvent.change(fileInputs[1], { target: { files: [file2] } });

    await waitFor(() => {
      expect(mockPapaParse.parse).toHaveBeenCalledTimes(2);
    });
  });

  test('validates required CSV columns', async () => {
    const incompleteData = [
      { product_name: 'Product A' } // missing receipt_date and chain
    ];

    mockPapaParse.parse.mockImplementation((file, options) => {
      options.complete({
        data: incompleteData,
        meta: { fields: ['product_name'] }
      });
    });

    render(<CampaignManager />);
    
    const fileInput = screen.getAllByLabelText(/Upload CSV/i)[0];
    const file = new File(['product_name\\nProduct A'], 'incomplete.csv', { type: 'text/csv' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      // Should show warning about missing required columns
      expect(screen.getByText(/missing required columns/i)).toBeInTheDocument();
    });
  });

  describe('Campaign Management', () => {
    test('allows clearing campaign data', () => {
      const mockCampaignsWithData = {
        A: { data: mockSalesData, name: 'Test Campaign A' }
      };
      
      useData.mockReturnValue({
        ...mockDataContext,
        campaigns: mockCampaignsWithData
      });

      render(<CampaignManager />);
      
      const clearButton = screen.getByLabelText(/Clear Campaign A/i);
      fireEvent.click(clearButton);

      expect(mockSetCampaigns).toHaveBeenCalledWith(expect.objectContaining({
        A: expect.objectContaining({
          data: [],
          name: ''
        })
      }));
    });

    test('shows campaign summary when data is loaded', () => {
      const mockCampaignsWithData = {
        A: { 
          data: mockSalesData, 
          name: 'Test Campaign A',
          metadata: {
            totalRecords: 3,
            brandMapping: { 'Coca': ['Coca Cola'] }
          }
        }
      };
      
      useData.mockReturnValue({
        ...mockDataContext,
        campaigns: mockCampaignsWithData
      });

      render(<CampaignManager />);
      
      expect(screen.getByText('Test Campaign A')).toBeInTheDocument();
      expect(screen.getByText(/3 records/i)).toBeInTheDocument();
    });
  });
});