// src/hooks/usePagination.js
import { useState, useMemo, useCallback } from 'react';

/**
 * Hook for handling data pagination
 * 
 * @param {Array} items - The array of items to paginate
 * @param {number} initialPageSize - Initial number of items per page
 * @returns {Object} Pagination state and methods
 */
export const usePagination = (items = [], initialPageSize = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  /**
   * Calculate total pages based on item count and page size
   */
  const totalPages = useMemo(() => {
    if (!items.length) return 1;
    return Math.ceil(items.length / pageSize);
  }, [items.length, pageSize]);
  
  /**
   * Get the current page of items
   */
  const paginatedItems = useMemo(() => {
    if (!items.length) return [];
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, items.length);
    
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, pageSize]);
  
  /**
   * Get page information for display
   */
  const pageInfo = useMemo(() => {
    if (!items.length) {
      return {
        startItem: 0,
        endItem: 0,
        totalItems: 0
      };
    }
    
    const startItem = ((currentPage - 1) * pageSize) + 1;
    const endItem = Math.min(startItem + pageSize - 1, items.length);
    
    return {
      startItem,
      endItem,
      totalItems: items.length
    };
  }, [items.length, currentPage, pageSize]);
  
  /**
   * Go to the next page
   */
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);
  
  /**
   * Go to the previous page
   */
  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);
  
  /**
   * Go to a specific page number
   * 
   * @param {number} page - Page number to navigate to
   */
  const goToPage = useCallback((page) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  }, [totalPages]);
  
  /**
   * Change the page size and adjust current page if needed
   * 
   * @param {number} newPageSize - New page size
   */
  const changePageSize = useCallback((newPageSize) => {
    const newTotalPages = Math.ceil(items.length / newPageSize);
    const validCurrentPage = Math.min(currentPage, newTotalPages);
    
    setPageSize(newPageSize);
    setCurrentPage(validCurrentPage);
  }, [items.length, currentPage]);
  
  /**
   * Reset pagination to first page
   */
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);
  
  /**
   * Get an array of page numbers for pagination controls
   * 
   * @param {number} maxPageButtons - Maximum number of page buttons to show
   * @returns {Array} Array of page numbers to display
   */
  const getPageNumbers = useCallback((maxPageButtons = 5) => {
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Determine range of pages to show
    const halfButtons = Math.floor(maxPageButtons / 2);
    let startPage = Math.max(currentPage - halfButtons, 1);
    let endPage = startPage + maxPageButtons - 1;
    
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(endPage - maxPageButtons + 1, 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [currentPage, totalPages]);
  
  return {
    // Current state
    currentPage,
    pageSize,
    totalPages,
    paginatedItems,
    pageInfo,
    
    // Methods
    nextPage,
    prevPage,
    goToPage,
    changePageSize,
    resetPagination,
    getPageNumbers
  };
};