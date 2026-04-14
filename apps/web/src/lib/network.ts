function normalizeBaseUrl(value?: string) {
  return value?.trim().replace(/\/+$/, "") ?? "";
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

const apiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const explicitWsBaseUrl = normalizeBaseUrl(import.meta.env.VITE_WS_BASE_URL);

export function apiUrl(path: string) {
  const normalizedPath = normalizePath(path);
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}

export function websocketUrl(path: string) {
  const normalizedPath = normalizePath(path);

  if (explicitWsBaseUrl) {
    return `${explicitWsBaseUrl}${normalizedPath}`;
  }

  if (apiBaseUrl) {
    return `${apiBaseUrl.replace(/^http/i, "ws")}${normalizedPath}`;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${normalizedPath}`;
  }

  return normalizedPath;
}
