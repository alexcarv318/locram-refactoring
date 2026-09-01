import { useMemo } from "react";

import type { DesktopShellContextValue } from "@/components/shell/desktopShellContext";

export function useDesktopShellContextValue(params: DesktopShellContextValue) {
  return useMemo(() => params, [params]);
}
