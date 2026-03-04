interface NavOptions {
  replace?: boolean;
  params?: Record<string, string | number | boolean> | URLSearchParams;
  force?: boolean;
}

export const ALL_APP_PATHS = [
  '/',
  '/about',
  '/login',
  '/mailing-list'
] as const;

export type AppPath = typeof ALL_APP_PATHS[number];

// Helper to normalize paths for comparison
const normalize = (p: string) => p.replace(/\/$/, "").replace(".html", "") || "/";

export const navigateTo = (path: AppPath, options: NavOptions = {}): void => {
  const { replace = false, params } = options;
  
  // Construct target URL
  const url = new URL(path, window.location.origin);
  
  // 1. THE LOOP KILLER: Compare normalized paths
  const currentPath = normalize(window.location.pathname);
  const targetPath = normalize(url.pathname);

  if (currentPath === targetPath && !url.search) {
    console.log("Already on this page. Navigation blocked to prevent loop.");
    return;
  }

  // 2. Handle Params
  if (params) {
    const searchParams = params instanceof URLSearchParams 
      ? params 
      : new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    searchParams.forEach((value, key) => url.searchParams.set(key, value));
  }

  // 3. Execution
  if (replace) {
    window.location.replace(url.href);
  } else {
    window.location.assign(url.href);
  }
};