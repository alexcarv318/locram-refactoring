import * as THREE from "three";

const DEVICE_PIXEL_RATIO = 4;
const FONT_SIZE_CSS = 12;
const HORIZONTAL_PADDING_CSS = 5;
const VERTICAL_PADDING_CSS = 3;
const CORNER_RADIUS_CSS = 3;
const BACKGROUND_COLOR = "rgba(0, 0, 0, 0.6)";
const TEXT_COLOR = "#eee";
const FONT_STACK = "sans-serif";
const WORLD_UNITS_PER_CSS_PX = 0.45;

export function createNodeLabelSprite(
  label: string,
  nodeSize: number,
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const measureContext = canvas.getContext("2d");
  if (!measureContext) {
    return new THREE.Sprite();
  }

  const fontSizePx = FONT_SIZE_CSS * DEVICE_PIXEL_RATIO;
  const horizontalPaddingPx = HORIZONTAL_PADDING_CSS * DEVICE_PIXEL_RATIO;
  const verticalPaddingPx = VERTICAL_PADDING_CSS * DEVICE_PIXEL_RATIO;
  const cornerRadiusPx = CORNER_RADIUS_CSS * DEVICE_PIXEL_RATIO;

  measureContext.font = `${fontSizePx}px ${FONT_STACK}`;
  const textWidthPx = Math.ceil(measureContext.measureText(label).width);

  const canvasWidthPx = textWidthPx + horizontalPaddingPx * 2;
  const canvasHeightPx = fontSizePx + verticalPaddingPx * 2;
  canvas.width = canvasWidthPx;
  canvas.height = canvasHeightPx;

  const drawContext = canvas.getContext("2d");
  if (!drawContext) {
    return new THREE.Sprite();
  }

  drawContext.clearRect(0, 0, canvasWidthPx, canvasHeightPx);
  drawContext.fillStyle = BACKGROUND_COLOR;
  drawRoundedRect(
    drawContext,
    0,
    0,
    canvasWidthPx,
    canvasHeightPx,
    cornerRadiusPx,
  );
  drawContext.fill();

  drawContext.font = `${fontSizePx}px ${FONT_STACK}`;
  drawContext.fillStyle = TEXT_COLOR;
  drawContext.textAlign = "center";
  drawContext.textBaseline = "middle";
  drawContext.fillText(label, canvasWidthPx / 2, canvasHeightPx / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0);
  sprite.position.set(0, nodeSize + 2, 0);
  sprite.renderOrder = 999;

  const cssWidth = canvasWidthPx / DEVICE_PIXEL_RATIO;
  const cssHeight = canvasHeightPx / DEVICE_PIXEL_RATIO;
  sprite.scale.set(
    cssWidth * WORLD_UNITS_PER_CSS_PX,
    cssHeight * WORLD_UNITS_PER_CSS_PX,
    1,
  );
  return sprite;
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height,
  );
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}
