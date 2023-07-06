import { BarcodeFormat, BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, NotFoundException, Result } from '@zxing/library';
import type { ICornerPoint, IDetectedBarcode, IBarcodeDetector } from './models';

export class BarcodeDetector implements IBarcodeDetector {
  private reader: BrowserMultiFormatReader;

  // format names taken from https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API#supported_barcode_formats
  private static zxingToNativeFormat: Record<BarcodeFormat, string> = {
    [BarcodeFormat.AZTEC]: 'aztec',
    [BarcodeFormat.CODABAR]: 'codabar',
    [BarcodeFormat.CODE_39]: 'code_39',
    [BarcodeFormat.CODE_93]: 'code_93',
    [BarcodeFormat.CODE_128]: 'code_128',
    [BarcodeFormat.DATA_MATRIX]: 'data_matrix',
    [BarcodeFormat.EAN_8]: 'ean_8',
    [BarcodeFormat.EAN_13]: 'ean_13',
    [BarcodeFormat.ITF]: 'itf',
    [BarcodeFormat.PDF_417]: 'pdf417',
    [BarcodeFormat.QR_CODE]: 'qr_code',
    [BarcodeFormat.UPC_A]: 'upc_a',
    [BarcodeFormat.UPC_E]: 'upc_e',
    [BarcodeFormat.UPC_EAN_EXTENSION]: 'unknown',
    [BarcodeFormat.MAXICODE]: 'unknown',
    [BarcodeFormat.RSS_14]: 'unknown',
    [BarcodeFormat.RSS_EXPANDED]: 'unknown',
  };

  private static nativeToZxingFormat: Record<string, BarcodeFormat> = {
    aztec: BarcodeFormat.AZTEC,
    codabar: BarcodeFormat.CODABAR,
    code_39: BarcodeFormat.CODE_39,
    code_93: BarcodeFormat.CODE_93,
    code_128: BarcodeFormat.CODE_128,
    data_matrix: BarcodeFormat.DATA_MATRIX,
    ean_8: BarcodeFormat.EAN_8,
    ean_13: BarcodeFormat.EAN_13,
    itf: BarcodeFormat.ITF,
    pdf417: BarcodeFormat.PDF_417,
    qr_code: BarcodeFormat.QR_CODE,
    upc_a: BarcodeFormat.UPC_A,
    upc_e: BarcodeFormat.UPC_E,
  };

  constructor(options?: { formats: string[] }) {
    const hints = new Map<DecodeHintType, unknown>([
      [DecodeHintType.TRY_HARDER, true],
      [
        DecodeHintType.POSSIBLE_FORMATS,
        options
          ? options.formats.map((f) => BarcodeDetector.nativeToZxingFormat[f])
          : Object.values(BarcodeDetector.nativeToZxingFormat),
      ],
    ]);

    this.reader = new BrowserMultiFormatReader(hints);
  }

  public static getSupportedFormats(): Promise<string[]> {
    return Promise.resolve(Object.values(BarcodeDetector.zxingToNativeFormat));
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
      } else if (imageSource instanceof ImageBitmap) {
        result = this.reader.decodeFromCanvas(this.imageBitmapToCanvas(imageSource));
      } else {
        throw new TypeError('Image source is not supported');
      }

      return [{
        rawValue: result.getText(),
        format: BarcodeDetector.zxingToNativeFormat[result.getBarcodeFormat()],
        boundingBox: new DOMRectReadOnly(),
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
      image.onerror = () => reject();

      image.src = imageObjUrl;
    });
  }

  private imageBitmapToCanvas(imageBitmap: ImageBitmap): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(imageBitmap, imageBitmap.width, imageBitmap.height);
    }

    return canvas;
  }
}
