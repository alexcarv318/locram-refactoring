declare module "turndown";
declare module "turndown-plugin-gfm";
declare module "svg-pan-zoom" {
  export type SvgPanZoomInstance = {
    destroy: () => void;
    resize: () => void;
    fit: () => void;
    center: () => void;
    zoom: (value: number) => void;
  };

  export type SvgPanZoomOptions = {
    center?: boolean;
    controlIconsEnabled?: boolean;
    dblClickZoomEnabled?: boolean;
    eventsListenerElement?: Element;
    fit?: boolean;
    maxZoom?: number;
    minZoom?: number;
    mouseWheelZoomEnabled?: boolean;
    panEnabled?: boolean;
    preventMouseEventsDefault?: boolean;
    zoomEnabled?: boolean;
  };

  export default function svgPanZoom(
    element: string | Element,
    options?: SvgPanZoomOptions,
  ): SvgPanZoomInstance;
}
