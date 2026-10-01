declare global {
  interface Window {
    __TAIK__?: any;
  }
}

export function getTaikApi(): any {
  const api = window.__TAIK__;
  if (!api) {
    throw new Error('Electron preload API not available (__TAIK__)');
  }
  return api;
}

