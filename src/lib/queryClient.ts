import { QueryClient } from "@tanstack/react-query";

function buildUrlFromQueryKey(queryKey: readonly unknown[]): string {
  const pathParts: string[] = [];
  let queryParams: Record<string, string> = {};

  for (const part of queryKey) {
    if (typeof part === 'string') {
      const trimmed = part.replace(/^\/+|\/+$/g, '');
      if (trimmed) {
        pathParts.push(trimmed);
      }
    } else if (typeof part === 'object' && part !== null) {
      for (const [k, v] of Object.entries(part)) {
        if (v !== undefined && v !== null && v !== 'all') {
          queryParams[k] = String(v);
        }
      }
    }
  }

  const url = '/' + pathParts.join('/');
  const search = new URLSearchParams(queryParams).toString();
  return search ? `${url}?${search}` : url;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = buildUrlFromQueryKey(queryKey);
        const res = await fetch(url, {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      },
      staleTime: 1000 * 60 * 5,
      retry: false,
    },
  },
});

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });
  
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  
  return res.json();
}
