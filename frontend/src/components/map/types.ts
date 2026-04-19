import type { PlatformLanguage } from "@/lib/i18n";
import type { AutoToolType } from "@/lib/turf-tools";

export type BaseMapMode = "simple" | "satellite";

export interface MapProps {
  onGeometrySelected?: (geom: any) => void;
  drawModeActive?: boolean;
  rulerModeActive?: boolean;
  language: PlatformLanguage;
  showMeasurements: boolean;
  onPlotClick?: (plot: any) => void;
  onModeChange?: (mode: string) => void;
  onMeasurement?: (val: string | null) => void;
  massWandActive?: boolean;
  onProcessingStateChange?: (processing: boolean) => void;
  onNotification?: (msg: string, type: "error" | "success" | "warning") => void;
  drawMode?: string;
  currentUserRole?: string;
  isProcessingWand?: boolean;
  measurement?: string | null;
  onSavePlot?: () => void;
}

export interface MapRef {
  refreshPlots: () => void;
  focusCurrentLocation: () => void;
  flyToRegion: (center: [number, number], zoom: number) => void;
  changeDrawMode: (mode: string) => void;
  deleteSelectedDraw: () => void;
  getSelectedGeometry: () => any;
  executeAutoTool: (tool: AutoToolType) => void;
}

/** Plot feature properties as they come from the API */
export interface PlotProperties {
  id: string;
  cropType: string;
  title: string;
  fillColor: string | null;
}
