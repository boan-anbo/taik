import { getTaikApi } from './taik';

export type UnlistenFn = () => void;

export async function listen(event: string, handler: (payload?: unknown) => void): Promise<UnlistenFn> {
  const api = getTaikApi();
  return api.events.listen(event, handler);
}

export async function emit(event: string, payload?: unknown): Promise<void> {
  const api = getTaikApi();
  api.events.emit(event, payload);
}

