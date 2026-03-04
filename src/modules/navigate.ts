export const ALL_APP_PATHS = [
  '/',
  '/index',
  '/about',
  '/login',
  '/mailing-list'
] as const;

export type AppPath = typeof ALL_APP_PATHS[number];

interface NavOptions {
  replace?: boolean;
  params?: Record<string, string | number | boolean> | URLSearchParams;
  force?: boolean;
}

export const navigateTo = (path: AppPath, options: NavOptions = {}): void => {
  const { replace = false, params, force = false } = options;
  const url = new URL(path, window.location.origin);
  if (params) {
    const searchParams = params instanceof URLSearchParams 
      ? params 
      : new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  }
  const currentUrl = new URL(window.location.href);
  const isSamePage = url.pathname.replace('.html', '') === currentUrl.pathname.replace('.html', '');
  const isSameParams = url.search === currentUrl.search;

  if (isSamePage && isSameParams && !force) {
    console.warn(`Blocked redundant navigation to: ${path} to prevent redirect loop.`);
    return; 
  }

  if (replace) {
    window.location.replace(url.href);
  } else {
    window.location.assign(url.href);
  }
};