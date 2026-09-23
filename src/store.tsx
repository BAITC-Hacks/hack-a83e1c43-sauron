import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Mode, Snapshot } from './types';
import { api } from './api';

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
interface Store {
  mode: Mode;
  setMode: (mode: Mode) => void;
  data: Snapshot;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  updateData: (update: (data: Snapshot) => Snapshot) => void;
  saved: number[];
  toggleSave: (id: number) => void;
  toast: (message: string) => void;
}
const Context = createContext<Store | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, changeMode] = useState<Mode>(() =>
    readLocal<Mode>('sauron:mode', 'live') === 'demo' ? 'demo' : 'live',
  );
  const [data, setData] = useState<Snapshot>({ tasks: [], teams: [], proposals: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState<number[]>([]);
  const requestId = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = useCallback((text: string) => {
    setMessage(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(''), 4500);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const refresh = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const next = await api(mode).snapshot();
      if (requestId.current === current) setData(next);
    } catch (e) {
      if (requestId.current === current)
        setError(e instanceof Error ? e.message : 'Не удалось загрузить данные.');
    } finally {
      if (requestId.current === current) setLoading(false);
    }
  }, [mode]);
  useEffect(() => {
    setData({ tasks: [], teams: [], proposals: [] });
    void refresh();
    const ids = readLocal<unknown>(`sauron:saved:${mode}`, []);
    setSaved(Array.isArray(ids) ? ids.filter((id) => typeof id === 'number') : []);
    return () => {
      requestId.current++;
    };
  }, [mode, refresh]);
  const setMode = (next: Mode) => {
    saveLocal('sauron:mode', next);
    changeMode(next);
  };
  const toggleSave = (id: number) =>
    setSaved((current) => {
      const next = current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id];
      if (!saveLocal(`sauron:saved:${mode}`, next))
        toast('Закладка сохранена до закрытия страницы: хранилище браузера недоступно.');
      return next;
    });
  return (
    <Context.Provider
      value={{
        mode,
        setMode,
        data,
        loading,
        error,
        refresh,
        updateData: setData,
        saved,
        toggleSave,
        toast,
      }}
    >
      {children}
      <div className={`toast ${message ? 'visible' : ''}`} role="status">
        {message}
      </div>
    </Context.Provider>
  );
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing AppProvider');
  return value;
}
