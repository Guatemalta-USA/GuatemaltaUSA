export const ALL_APP_PATHS = [
    '/',
    '/index'
];
export const navigateTo = (path, options = {}) => {
    const { replace = false, params } = options;
    const baseUrl = "/";
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const fullPath = `${baseUrl}${cleanPath}`;
    const url = new URL(fullPath, window.location.origin);
    if (params) {
        if (params instanceof URLSearchParams) {
            params.forEach((value, key) => {
                url.searchParams.set(key, value);
            });
        }
        else {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.set(key, String(value));
            });
        }
    }
    if (replace) {
        window.location.replace(url.href);
    }
    else {
        window.location.href = url.href;
    }
};
