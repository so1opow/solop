export function getInitData(): string | null {
  const tg = (window as any).Telegram?.WebApp;
  return tg?.initData ?? null;
}

export function getStartAppPayload(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("startapp");
}

export function decodeStartAppPayload(payload: string): any | null {
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTelegramWebApp(): boolean {
  return Boolean((window as any).Telegram?.WebApp?.initData);
}
