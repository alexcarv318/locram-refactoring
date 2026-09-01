import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from "react";

import { resolveDirection } from "@/i18n/resolveDirection";
import {
  INTERFACE_DIRECTIONS,
  type InterfaceDirection,
  type ResolvedDirection,
} from "@/i18n/types";
import { useUiPreferencesStore } from "@/stores/uiPreferencesStore";

interface DirectionContextValue {
  direction: InterfaceDirection;
  resolvedDirection: ResolvedDirection;
  availableDirections: readonly InterfaceDirection[];
  setDirection: (direction: InterfaceDirection) => void;
}

const DirectionContext = createContext<DirectionContextValue | undefined>(undefined);

interface DirectionProviderProps {
  children: ReactNode;
  applyToDocument?: boolean;
}

export function DirectionProvider({
  children,
  applyToDocument = true,
}: DirectionProviderProps) {
  const locale = useUiPreferencesStore((state) => state.locale);
  const direction = useUiPreferencesStore((state) => state.direction);
  const setDirection = useUiPreferencesStore((state) => state.setDirection);

  const resolvedDirection = useMemo(
    () => resolveDirection(locale, direction),
    [locale, direction],
  );

  useLayoutEffect(() => {
    if (!applyToDocument || typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    root.setAttribute("dir", resolvedDirection);
    root.setAttribute("data-dir", resolvedDirection);
  }, [applyToDocument, resolvedDirection]);

  const value = useMemo<DirectionContextValue>(
    () => ({
      direction,
      resolvedDirection,
      availableDirections: INTERFACE_DIRECTIONS,
      setDirection,
    }),
    [direction, resolvedDirection, setDirection],
  );

  return (
    <DirectionContext.Provider value={value}>{children}</DirectionContext.Provider>
  );
}

export function useDirection(): DirectionContextValue {
  const context = useContext(DirectionContext);
  if (context === undefined) {
    throw new Error("useDirection must be used within a DirectionProvider");
  }
  return context;
}
