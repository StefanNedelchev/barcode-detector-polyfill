import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, IllegalArgumentException, NotFoundException, Result, ResultPoint } from '@zxing/library';
import { ImageData as ImageDataCanvas, CanvasRenderingContext2D } from 'canvas';
import { BarcodeDetector } from '../src/BarcodeDetector';
import { nativeToZxingFormat, zxingToNativeFormat } from '../src/constants';
import { IDetectedBarcode } from '../src/models';

let acceptedFormats: BarcodeFormat[] = [];

// Global mocks
jest.mock('@zxing/browser', () => {
  class MockedBrowserMultiFormatReader {
    constructor(hints?: Map<DecodeHintType, unknown>) {
      if (hints?.has(DecodeHintType.POSSIBLE_FORMATS)) {
        acceptedFormats = hints.get(DecodeHintType.POSSIBLE_FORMATS) as BarcodeFormat[];
      }
    }

    scanOneResult(): Promise<Result> {
      return Promise.resolve(new Result('12345', new Uint8Array(), 5, [], BarcodeFormat.CODE_39));
    }

    decodeFromCanvas(): Result {
      return new Result('12345', new Uint8Array(), 5, [], BarcodeFormat.CODE_39);
    }
  }

  return {
    BrowserMultiFormatReader: MockedBrowserMultiFormatReader,
  };
});

describe('BarcodeDetector', () => {
  let scanOneResultSpy: jest.SpyInstance<Promise<Result>>;
  let decodeFromCanvasSpy: jest.SpyInstance<Result>;

  Object.defineProperty(window, 'DOMRectReadOnly', {
    writable: true,
    configurable: true,
    value: jest.fn(),
  });

  Object.defineProperty(window, 'ImageData', {
    writable: true,
    configurable: true,
    value: ImageDataCanvas,
  });

  class VideoFrameMock implements VideoFrame {
    codedHeight = 0;
    codedWidth = 0;
    codedRect: DOMRectReadOnly | null = null;
    visibleRect: DOMRectReadOnly | null = null;
    colorSpace: VideoColorSpace = {} as VideoColorSpace;
    displayHeight = 0;
    displayWidth = 0;
    duration: number | null = null;
    format: VideoPixelFormat | null = null;
    timestamp = 0;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    allocationSize(_options?: VideoFrameCopyToOptions | undefined): number {
      return 0;
    }

    clone(): VideoFrame {
      return structuredClone(this) as unknown as VideoFrame;
    }

    close(): void {
      // empty
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    copyTo(_destination: BufferSource, _options?: VideoFrameCopyToOptions | undefined): Promise<PlaneLayout[]> {
      return Promise.resolve([]);
    }
  }

  Object.defineProperty(window, 'VideoFrame', {
    writable: true,
    configurable: true,
    value: VideoFrameMock,
  });

  beforeEach(() => {
    acceptedFormats = [];
    scanOneResultSpy = jest.spyOn(BrowserMultiFormatReader.prototype, 'scanOneResult')
      .mockResolvedValue(new Result('12345', new Uint8Array(), 5, [], BarcodeFormat.CODE_39));
    decodeFromCanvasSpy = jest.spyOn(BrowserMultiFormatReader.prototype, 'decodeFromCanvas')
      .mockReturnValue(new Result('12345', new Uint8Array(), 5, [], BarcodeFormat.CODE_39));
  });

  it('should be created', () => {
    const detector = new BarcodeDetector();
    expect(detector).toBeTruthy();
  });

  describe('getSupportedFormats()', () => {
    it('should return supported formats', async () => {
      // Arrange
      const expectedFormats = Object.values(zxingToNativeFormat);

      // Act
      const result = await BarcodeDetector.getSupportedFormats();

      // Assert
      expect(result).toEqual(expectedFormats);
    });
  });

  describe('constructor()', () => {
    it('should initialize with all supported formats', () => {
      // Arrange
      const expectedZXingFormats = Object.values(nativeToZxingFormat);

      // Act
      new BarcodeDetector();

      // Assert
      expect(acceptedFormats).toEqual(expectedZXingFormats);
    });

    it('should initialize with specific formats', () => {
      // Arrange
      const testFormats: string[] = ['qr_code', 'code_39', 'upc_a'];
      const expectedZXingFormats: BarcodeFormat[] = [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_39, BarcodeFormat.UPC_A];

      // Act
      new BarcodeDetector({ formats: testFormats });

      // Assert
      expect(acceptedFormats).toEqual(expectedZXingFormats);
    });
  });

  describe('detect()', () => {
    it('should use ZXing scanOneResult() from image source', async () => {
      // Arrange
      const detector = new BarcodeDetector();
      const image = document.createElement('img');

      // Act
      await detector.detect(image);

      // Assert
      expect(decodeFromCanvasSpy).not.toHaveBeenCalled();
      expect(scanOneResultSpy).toHaveBeenCalledWith(image, false);
    });

    it('should use ZXing scanOneResult() from video source', async () => {
      // Arrange
      const detector = new BarcodeDetector();
      const video = document.createElement('video');

      // Act
      await detector.detect(video);

      // Assert
      expect(decodeFromCanvasSpy).not.toHaveBeenCalled();
      expect(scanOneResultSpy).toHaveBeenCalledWith(video, false);
    });

    it('should use ZXing decodeFromCanvas() from canvas source', async () => {
      // Arrange
      const detector = new BarcodeDetector();
      const canvas = document.createElement('canvas');

      // Act
      await detector.detect(canvas);

      // Assert
      expect(scanOneResultSpy).not.toHaveBeenCalled();
      expect(decodeFromCanvasSpy).toHaveBeenCalledWith(canvas);
    });

    it('should use ZXing decodeFromCanvas() from ImageBitmap source', async () => {
      // Arrange
      Object.defineProperty(window, 'ImageBitmap', {
        writable: true,
        configurable: true,
        value: jest.fn(),
      });
      const detector = new BarcodeDetector();
      const imageBitmap = new ImageBitmap();

      // Act
      await detector.detect(imageBitmap);

      // Assert
      expect(scanOneResultSpy).not.toHaveBeenCalled();
      expect(decodeFromCanvasSpy).toHaveBeenCalled();
    });

    it('should use ZXing decodeFromCanvas() from ImageData source', async () => {
      // Arrange
      const detector = new BarcodeDetector();
      const imageData = new ImageData(300, 200);

      // Act
      await detector.detect(imageData);

      // Assert
      expect(scanOneResultSpy).not.toHaveBeenCalled();
      expect(decodeFromCanvasSpy).toHaveBeenCalled();
    });

    it('should use ZXing decodeFromCanvas() from VideoFrame source', async () => {
      // Arrange
      const detector = new BarcodeDetector();
      const videoFrame = new VideoFrame(document.createElement('img'));
      jest.spyOn(CanvasRenderingContext2D.prototype, 'drawImage').mockImplementation(jest.fn());

      // Act
      await detector.detect(videoFrame);

      // Assert
      expect(scanOneResultSpy).not.toHaveBeenCalled();
      expect(decodeFromCanvasSpy).toHaveBeenCalled();
    });

    it('should reslove to empty array when ZXing throws NotFoundException', async () => {
      // Arrange
      scanOneResultSpy = jest.spyOn(BrowserMultiFormatReader.prototype, 'scanOneResult')
        .mockRejectedValue(new NotFoundException('TEST'));
      const detector = new BarcodeDetector();
      const image = document.createElement('img');

      // Act
      const result = await detector.detect(image);

      // Assert
      expect(result).toHaveLength(0);
    });


    it('should re-throw any other error', async () => {
      // Arrange
      scanOneResultSpy = jest.spyOn(BrowserMultiFormatReader.prototype, 'scanOneResult')
        .mockRejectedValue(new IllegalArgumentException('TEST'));
      const detector = new BarcodeDetector();
      const image = document.createElement('img');

      // Act/Assert
      await expect(detector.detect(image)).rejects.toThrow('TEST');
    });

    it('should throw on unsupported format', async () => {
      // Arrange
      const detector = new BarcodeDetector();

      // Act/Assert
      await expect(detector.detect(null as unknown as ImageBitmapSource)).rejects.toThrow('Image source is not supported');
    });

    it('should map ZXing result correctly', async () => {
      // Arrange
      const resultText = '1234567890';
      const resultPoints = [{ x: 100, y: 200 }, { x: 200, y: 210 }];
      const resultFormat = BarcodeFormat.CODE_128;
      const zxingResult = new Result(
        resultText,
        new Uint8Array(),
        10,
        resultPoints.map((p) => new ResultPoint(p.x, p.y)),
        resultFormat,
      );
      const nativeResult: IDetectedBarcode = {
        rawValue: resultText,
        cornerPoints: resultPoints,
        format: zxingToNativeFormat[resultFormat],
        boundingBox: new DOMRectReadOnly(),
      };
      scanOneResultSpy = jest.spyOn(BrowserMultiFormatReader.prototype, 'scanOneResult').mockResolvedValue(zxingResult);
      const detector = new BarcodeDetector();

      // Act
      const result = await detector.detect(document.createElement('img'));

      // Assert
      expect(result).toEqual([nativeResult]);
    });
  });
});
