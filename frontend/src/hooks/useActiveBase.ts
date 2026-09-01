import { useEffect, useRef, useState } from "react";

import { fetchRuntime } from "@/api/runtimeApi";
import type { BaseRegistryEntry } from "@/types";

const POLL_INTERVAL_MS = 10_000;

export function useActiveBase(bridgeBaseUrl: string) {
  const [activeBase, setActiveBase] = useState<BaseRegistryEntry | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearPolling() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function loadRuntime() {
    try {
      const runtime = await fetchRuntime(bridgeBaseUrl);
      setActiveBase(runtime.active_base);
    } catch {
      // Non-critical: leave previous value unchanged on transient failure
    }
  }

  useEffect(() => {
    if (!bridgeBaseUrl) {
      return;
    }

    void loadRuntime();
    intervalRef.current = setInterval(() => { void loadRuntime(); }, POLL_INTERVAL_MS);

    return () => {
      clearPolling();
    };
  }, [bridgeBaseUrl]);

  return activeBase;
}
