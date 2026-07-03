import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, NotFoundException, Result } from '@zxing/library';
import type { ICornerPoint, IDetectedBarcode, IBarcodeDetector } from './models';
import { nativeToZxingFormat, zxingToNativeFormat } from './constants';

export class BarcodeDetector implements IBarcodeDetector {
  private reader: BrowserMultiFormatReader;

  constructor(options?: { formats?: string[] }) {
    const formats = options?.formats;

    if (formats?.length === 0) {
      throw new TypeError('At least one barcode format must be specified');
    }

    if (formats) {
      for (const format of formats) {
        if (!Object.hasOwn(nativeToZxingFormat, format)) {
          throw new TypeError(`Barcode format "${format}" is not supported`);
        }
      }
    }

    const hints = new Map<DecodeHintType, unknown>([
      [DecodeHintType.TRY_HARDER, true],
      [
        DecodeHintType.POSSIBLE_FORMATS,
        formats
          ? formats.map((f) => nativeToZxingFormat[f])
          : Object.values(nativeToZxingFormat),
      ],
    ]);

    this.reader = new BrowserMultiFormatReader(hints);
  }

  public static getSupportedFormats(): Promise<string[]> {
    return Promise.resolve(Object.values(zxingToNativeFormat));
  }

  public async detect(imageSource: ImageBitmapSource): Promise<IDetectedBarcode[]> {
    try {
      let result: Result;

      if (imageSource instanceof HTMLVideoElement) {
        if (imageSource.readyState <= imageSource.HAVE_METADATA) {
          throw new DOMException('The video does not have enough data', 'InvalidStateError');
        }

        if (imageSource.videoWidth === 0 || imageSource.videoHeight === 0) {
          return [];
        }

        result = await this.reader.scanOneResult(imageSource, false);
      } else if (imageSource instanceof HTMLImageElement) {
        if (!imageSource.complete || imageSource.naturalWidth === 0 || imageSource.naturalHeight === 0) {
          throw new DOMException('The image is not fully decodable', 'InvalidStateError');
        }

        result = await this.reader.scanOneResult(imageSource, false);
      } else if (imageSource instanceof HTMLCanvasElement) {
        if (imageSource.width === 0 || imageSource.height === 0) {
          return [];
        }

        result = this.reader.decodeFromCanvas(imageSource);
      } else if (imageSource instanceof Blob) {
        const image = await this.blobToImage(imageSource);
        result = await this.reader.scanOneResult(image, false);
      } else if (
        (typeof SVGImageElement !== 'undefined' && imageSource instanceof SVGImageElement)
        || (typeof OffscreenCanvas !== 'undefined' && imageSource instanceof OffscreenCanvas)
        || (typeof ImageBitmap !== 'undefined' && imageSource instanceof ImageBitmap)
        || imageSource instanceof ImageData
        || (typeof VideoFrame !== 'undefined' && imageSource instanceof VideoFrame)
      ) {
        const canvas = this.imageSourceToCanvas(imageSource);

        if (canvas.width === 0 || canvas.height === 0) {
          return [];
        }

        result = this.reader.decodeFromCanvas(canvas);
      } else {
        throw new TypeError('Image source is not supported');
      }

      const cornerPoints = result.getResultPoints()
        .map<ICornerPoint>((point) => ({ x: point.getX(), y: point.getY() }));

      return [{
        rawValue: result.getText(),
        format: zxingToNativeFormat[result.getBarcodeFormat()],
        boundingBox: this.getBoundingBox(cornerPoints),
        cornerPoints,
      }];
    } catch (err) {
      if (err && !(err instanceof NotFoundException)) {
        throw err;
      }

      return [];
    }
  }

  private async blobToImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const imageObjUrl = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(imageObjUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(imageObjUrl);
        reject(new DOMException('Failed to decode image from Blob', 'InvalidStateError'));
      };

      image.src = imageObjUrl;
    });
  }

  private imageSourceToCanvas(
    source: SVGImageElement | OffscreenCanvas | ImageBitmap | ImageData | VideoFrame,
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const { width, height } = this.getImageSourceDimensions(source);
    canvas.width = width;
    canvas.height = height;

    if (width === 0 || height === 0) {
      return canvas;
    }

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not create a 2D canvas context');
    }

    if (source instanceof ImageData) {
      ctx.putImageData(source, 0, 0);
    } else {
      ctx.drawImage(source, 0, 0, width, height);
    }

    return canvas;
  }

  private getImageSourceDimensions(
    source: SVGImageElement | OffscreenCanvas | ImageBitmap | ImageData | VideoFrame,
  ): { width: number; height: number } {
    if (typeof VideoFrame !== 'undefined' && source instanceof VideoFrame) {
      return { width: source.displayWidth, height: source.displayHeight };
    }

    if (typeof SVGImageElement !== 'undefined' && source instanceof SVGImageElement) {
      return { width: source.width.baseVal.value, height: source.height.baseVal.value };
    }

    const bitmapSource = source as OffscreenCanvas | ImageBitmap | ImageData;
    return { width: bitmapSource.width, height: bitmapSource.height };
  }

  private getBoundingBox(cornerPoints: ICornerPoint[]): DOMRectReadOnly {
    if (cornerPoints.length === 0) {
      return new DOMRectReadOnly();
    }

    const xCoordinates = cornerPoints.map((point) => point.x);
    const yCoordinates = cornerPoints.map((point) => point.y);
    const left = Math.min(...xCoordinates);
    const right = Math.max(...xCoordinates);
    const top = Math.min(...yCoordinates);
    const bottom = Math.max(...yCoordinates);

    return new DOMRectReadOnly(left, top, right - left, bottom - top);
  }
}
