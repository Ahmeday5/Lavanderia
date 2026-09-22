export const environment = {
  production: false,
  appName: 'Lavanderia',
  appVersion: '1.0.0',
  defaultLang: 'en',

  // Relative path so the Angular dev-server proxy (proxy.conf.json) forwards
  // it to the real API same-origin — avoids the backend's CORS restriction
  // during local development. Production still calls the absolute URL
  // directly (see environment.prod.ts).
  apiUrl: 'https://lavanderia.runasp.net/api',
  tokenKey: 'app_access_token',
  refreshTokenKey: 'app_refresh_token',
};
