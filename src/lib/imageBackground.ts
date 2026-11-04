/**
 * White background removal for product photos.
 *
 * The background is found by flood-filling inward from the picture border, so white areas that
 * belong to the product itself (a white label, a pearl cap, a highlight) stay untouched. Pixels on
 * the cut edge are feathered so the result does not show a hard white halo on coloured cards.
 */

export interface RemovalOptions {
  /** How far a colour may be from pure white and still count as background (0 to 255). */
  tolerance?: number;
  /** Width of the soft edge, in colour distance units beyond the tolerance. */
  feather?: number;
}

const DEFAULT_TOLERANCE = 22;
const DEFAULT_FEATHER = 40;
const MAX_SIDE = 1600;
const MIN_SIDE = 800;
export const BACKGROUND_REMOVAL_MAX_BYTES = 5 * 1024 * 1024;

function whiteDistance(data: Uint8ClampedArray, offset: number): number {
  return Math.max(255 - data[offset], 255 - data[offset + 1], 255 - data[offset + 2]);
}

/**
 * Edits RGBA pixel data in place and returns the number of pixels that became transparent.
 * Pixels that are already transparent count as background, so PNG cut-outs pass through unchanged.
 */
export function removeWhiteBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: RemovalOptions = {},
): number {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const feather = options.feather ?? DEFAULT_FEATHER;
  const total = width * height;
  const isBackground = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  function qualifies(index: number): boolean {
    const offset = index * 4;
    return data[offset + 3] < 10 || whiteDistance(data, offset) <= tolerance;
  }

  function push(index: number) {
    if (isBackground[index] === 1 || !qualifies(index)) return;
    isBackground[index] = 1;
    queue[tail] = index;
    tail += 1;
  }

  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (index >= width) push(index - width);
    if (index < total - width) push(index + width);
  }

  let removed = 0;
  for (let index = 0; index < total; index += 1) {
    const offset = index * 4;
    if (isBackground[index] === 1) {
      data[offset + 3] = 0;
      removed += 1;
      continue;
    }
    const x = index % width;
    const touchesBackground =
      (x > 0 && isBackground[index - 1] === 1) ||
      (x < width - 1 && isBackground[index + 1] === 1) ||
      (index >= width && isBackground[index - width] === 1) ||
      (index < total - width && isBackground[index + width] === 1);
    if (!touchesBackground) continue;
    const distance = whiteDistance(data, offset);
    if (distance < tolerance + feather) {
      const strength = Math.max(0, (distance - tolerance) / feather);
      data[offset + 3] = Math.round(data[offset + 3] * Math.min(1, 0.25 + strength * 0.75));
    }
  }
  return removed;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image_load_failed'));
    };
    image.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png_encode_failed'))), 'image/png');
  });
}

function pngName(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 60) || 'product';
  return `${base}-cutout.png`;
}

/**
 * Reads an image from the device, removes its white background on a canvas and returns a PNG file.
 * Large pictures are scaled down (and retried smaller if the PNG is still too big to upload).
 */
export async function whiteBackgroundToPng(file: File): Promise<File> {
  const image = await loadImage(file);
  let side = Math.min(MAX_SIDE, Math.max(image.naturalWidth, image.naturalHeight));

  for (;;) {
    const ratio = Math.min(1, side / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('canvas_unavailable');
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height);
    removeWhiteBackground(pixels.data, width, height);
    context.putImageData(pixels, 0, 0);
    const blob = await toBlob(canvas);
    if (blob.size <= BACKGROUND_REMOVAL_MAX_BYTES || side <= MIN_SIDE) {
      return new File([blob], pngName(file), { type: 'image/png' });
    }
    side = Math.round(side * 0.75);
  }
}
