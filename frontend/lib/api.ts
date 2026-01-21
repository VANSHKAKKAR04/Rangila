/**
 * API Configuration
 * Centralized API URL management using environment variables
 */

const getApiUrl = (): string => {
  // In browser/client-side, use environment variable or fallback
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }
  
  // Server-side rendering
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

export const API_BASE_URL = getApiUrl();

/**
 * Builds a full API URL from a path
 * @param path - API path (e.g., '/api/v1/products')
 * @returns Full API URL
 */
export const buildApiUrl = (path: string): string => {
  const baseUrl = API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${apiPath}`;
};
