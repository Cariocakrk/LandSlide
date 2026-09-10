import { useAuthStore } from '@/store/authStore';

// Se NEXT_PUBLIC_API_URL estiver definida (ex: backend externo), usa-a.
// Senão, usa rotas relativas '', que rodam direto nas Serverless Functions do Next.js na Vercel!
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const headers = new Headers(options.headers);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Configura automaticamente JSON para requisições com corpo
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}
