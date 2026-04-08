const fallbackApiBaseUrl = "http://localhost:3008";

export const apiBaseUrl =
  (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL)?.replace(/\/$/, "") || fallbackApiBaseUrl;

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
};
