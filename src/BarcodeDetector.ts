import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, NotFoundException, Result } from '@zxing/library';
import type { ICornerPoint, IDetectedBarcode, IBarcodeDetector } from './models';
import { nativeToZxingFormat, zxingToNativeFormat } from './constants';

export class BarcodeDetector implements IBarcodeDetector {
  private reader: BrowserMultiFormatReader;

  constructor(options?: { formats: string[] }) {
    const hints = new Map<DecodeHintType, unknown>([
      [DecodeHintType.TRY_HARDER, true],
      [
        DecodeHintType.POSSIBLE_FORMATS,
        options
          ? options.formats.map((f) => nativeToZxingFormat[f])
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

      if (imageSource instanceof HTMLVideoElement || imageSource instanceof HTMLImageElement) {
        result = await this.reader.scanOneResult(imageSource, false);
      } else if (imageSource instanceof HTMLCanvasElement) {
        result = this.reader.decodeFromCanvas(imageSource);
      } else if (imageSource instanceof Blob) {
        const image = await this.blobToImage(imageSource);
        result = await this.reader.scanOneResult(image, false);
      } else if (
        imageSource instanceof ImageBitmap
        || imageSource instanceof ImageData
        || imageSource instanceof VideoFrame
      ) {
        result = this.reader.decodeFromCanvas(this.imageDataSourceToCanvas(imageSource));
      } else {
        throw new TypeError('Image source is not supported');
      }

      return [{
        rawValue: result.getText(),
        format: zxingToNativeFormat[result.getBarcodeFormat()],
        boundingBox: new DOMRectReadOnly(), // TODO: think of a way to map this in a meaningful way
        cornerPoints: result.getResultPoints().map<ICornerPoint>((p) => ({ x: p.getX(), y: p.getY() })),
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
      image.onerror = () => reject(new Error('Failed to load image from blob'));

      image.src = imageObjUrl;
    });
  }

  private imageDataSourceToCanvas(source: ImageBitmap | ImageData | VideoFrame): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = source instanceof VideoFrame ? source.displayWidth : source.width;
    const height = source instanceof VideoFrame ? source.displayHeight : source.height;

    if (ctx) {
      if (source instanceof ImageData) {
        ctx.putImageData(source, width, height);
      } else {
        ctx.drawImage(source, width, height);
      }
    }

    return canvas;
  }
}
