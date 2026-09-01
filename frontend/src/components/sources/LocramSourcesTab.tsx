import { useEffect, useRef, useState } from "react";

import { GraphCanvas } from "@/components/sources/GraphCanvas";
import SourcesListPanel from "@/components/sources/SourcesListPanel";
import { GraphVerticalResizeHandle } from "@/components/sources/GraphVerticalResizeHandle";
import { useGraphModalStore } from "@/stores/graphModalStore";
import { useSourcesToolbarStore } from "@/stores/sourcesToolbarStore";

const DEFAULT_GRAPH_HEIGHT_PERCENT = 35;
const DEFAULT_GRAPH_MIN_HEIGHT_PERCENT = 20;
const MIN_SOURCES_TOOLBAR_HEIGHT_PX = 41;
const INTERMEDIATE_SOURCES_PANEL_HEIGHT_PX = 305;
const SNAP_THRESHOLD_PX = 18;

export default function LocramSourcesTab() {
  const [height, setHeight] = useState(DEFAULT_GRAPH_HEIGHT_PERCENT);
  const [containerHeight, setContainerHeight] = useState(0);
  const isGraphCollapsed = useSourcesToolbarStore((state) => state.isGraphCollapsed);
  const isFiltersOpen = useSourcesToolbarStore((state) => state.isFiltersOpen);
  const isGraphModalOpen = useGraphModalStore((state) => state.isOpen);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement) {
      return;
    }

    const updateContainerHeight = () => {
      setContainerHeight(containerElement.getBoundingClientRect().height);
    };

    updateContainerHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateContainerHeight();
    });
    resizeObserver.observe(containerElement);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const graphHeightForSourcesPixels = (sourcesHeightPx: number) => {
    if (containerHeight <= 0) {
      return DEFAULT_GRAPH_HEIGHT_PERCENT;
    }
    const sourcesPercent = (sourcesHeightPx / containerHeight) * 100;
    return Math.max(
      DEFAULT_GRAPH_MIN_HEIGHT_PERCENT,
      Math.min(100, 100 - sourcesPercent),
    );
  };

  const maximumGraphHeight = containerHeight > 0
    ? Math.max(
        DEFAULT_GRAPH_MIN_HEIGHT_PERCENT,
        graphHeightForSourcesPixels(MIN_SOURCES_TOOLBAR_HEIGHT_PX),
      )
    : 94;
  const intermediateSnapPoint = graphHeightForSourcesPixels(INTERMEDIATE_SOURCES_PANEL_HEIGHT_PX);
  const snapThresholdPercent = containerHeight > 0
    ? (SNAP_THRESHOLD_PX / containerHeight) * 100
    : 2;

  useEffect(() => {
    if (isGraphCollapsed || !isFiltersOpen || containerHeight <= 0) {
      return;
    }

    const currentSourcesHeightPx = containerHeight * ((100 - height) / 100);
    if (currentSourcesHeightPx > MIN_SOURCES_TOOLBAR_HEIGHT_PX + SNAP_THRESHOLD_PX) {
      return;
    }

    setHeight(Math.min(DEFAULT_GRAPH_HEIGHT_PERCENT, maximumGraphHeight));
  }, [containerHeight, height, isFiltersOpen, isGraphCollapsed, maximumGraphHeight]);

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col overflow-hidden"
      data-sources-container-id="locram-sources"
    >
      {!isGraphCollapsed ? (
        <>
          <div className="relative w-full overflow-hidden" style={{ height: `${height}%` }}>
            <GraphCanvas />
          </div>
          <GraphVerticalResizeHandle
            containerId="locram-sources"
            heightPercent={height}
            maxHeight={maximumGraphHeight}
            minHeight={DEFAULT_GRAPH_MIN_HEIGHT_PERCENT}
            onResize={setHeight}
            snapPoints={[intermediateSnapPoint]}
            snapThreshold={snapThresholdPercent}
          />
        </>
      ) : null}

      <div className="flex flex-col overflow-hidden" style={{ height: isGraphCollapsed ? "100%" : `${100 - height}%` }}>
        {isGraphModalOpen ? <div className="flex-1" /> : <SourcesListPanel />}
      </div>
    </div>
  );
}
