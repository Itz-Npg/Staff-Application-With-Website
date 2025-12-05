import type { VercelRequest } from '@vercel/node';

export async function parseJsonBody<T = any>(req: VercelRequest): Promise<T> {
  if (req.body && typeof req.body === 'object') {
    return req.body as T;
  }
  
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {} as T;
    }
  }
  
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: Buffer | string) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {} as T);
      } catch {
        resolve({} as T);
      }
    });
  });
}

export function isSecureContext(host: string): boolean {
  return !host.includes('localhost') && !host.startsWith('127.0.0.1');
}
