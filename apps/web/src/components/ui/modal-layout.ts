import type { CSSProperties } from "react";

export const UNIFIED_MODAL_WIDTH = 1160;
const MODAL_VIEWPORT_GUTTER = 48;

export function getUnifiedModalStyle(): CSSProperties {
  return {
    width: `min(calc(100vw - ${MODAL_VIEWPORT_GUTTER}px), ${UNIFIED_MODAL_WIDTH}px)`,
    maxHeight: "90vh",
  };
}
