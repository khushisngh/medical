const DEFAULT_API_BASE_URL = 'http://localhost:3001';

const rawApiBaseUrl = process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL;

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

export const apiUrl = (path: string): string => {
  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
};
