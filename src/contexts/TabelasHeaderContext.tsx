import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface TabelasIndicadores {
  total: number;
  membros14: number;
  pp: number;
  full: number;
}

export interface TabelasHeaderState {
  title: string;
  /** Texto opcional exibido ao lado ou abaixo do título no header. */
  subtitle?: string;
  indicadores: TabelasIndicadores | null;
}

interface TabelasHeaderContextValue {
  header: TabelasHeaderState | null;
  setHeader: (state: TabelasHeaderState | null) => void;
}

const TabelasHeaderContext = createContext<TabelasHeaderContextValue>({
  header: null,
  setHeader: () => {},
});

export function TabelasHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<TabelasHeaderState | null>(null);
  const setHeader = useCallback((state: TabelasHeaderState | null) => {
    setHeaderState(state);
  }, []);
  return (
    <TabelasHeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </TabelasHeaderContext.Provider>
  );
}

export function useTabelasHeader() {
  return useContext(TabelasHeaderContext);
}
