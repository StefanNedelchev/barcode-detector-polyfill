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
  let decodeFromCanvasSpy: jest.SpyInstance<Result, [HTMLCanvasElement]>;

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
    displayHeight = 200;
    displayWidth = 300;
    duration: number | null = null;
    format: VideoPixelFormat | null = null;
    timestamp = 0;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    allocationSize(_options?: VideoFrameCopyToOptions): number {
      return 0;
    }

    clone(): VideoFrame {
      return structuredClone(this);
    }

    close(): void {
      // empty
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    copyTo(_destination: BufferSource, _options?: VideoFrameCopyToOptions): Promise<PlaneLayout[]> {
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

  function createLoadedImage(): HTMLImageElement {
    const image = document.createElement('img');
    Object.defineProperties(image, {
      complete: { configurable: true, value: true },
      naturalWidth: { configurable: true, value: 300 },
      naturalHeight: { configurable: true, value: 200 },
    });
    return image;
  }

  function createReadyVideo(): HTMLVideoElement {
    const video = document.createElement('video');
    Object.defineProperties(video, {
      readyState: { configurable: true, value: video.HAVE_CURRENT_DATA },
      videoWidth: { configurable: true, value: 300 },
      videoHeight: { configurable: true, value: 200 },
    });
    return video;
  }

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

    it('should throw when formats is empty', () => {
      expect(() => new BarcodeDetector({ formats: [] })).toThrow(TypeError);
    });

    it('should throw when a format is unsupported', () => {
      expect(() => new BarcodeDetector({ formats: ['unknown'] })).toThrow(TypeError);
      expect(() => new BarcodeDetector({ formats: ['not_a_format'] })).toThrow(TypeError);
    });
  });

  describe('detect()', () => {
    it('should use ZXing scanOneResult() from image source', async () => {
      // Arrange
      const detector = new BarcodeDetector();
      const image = createLoadedImage();

      // Act
      await detector.detect(image);

      // Assert
      expect(decodeFromCanvasSpy).not.toHaveBeenCalled();
      expect(scanOneResultSpy).toHaveBeenCalledWith(image, false);
    });

    it('should use ZXing scanOneResult() from video source', async () => {
      // Arrange
      const detector = new BarcodeDetector();
      const video = createReadyVideo();

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
      class ImageBitmapMock {
        width = 300;
        height = 200;

        close(): void {
          // empty
        }
      }
      Object.defineProperty(window, 'ImageBitmap', {
        writable: true,
        configurable: true,
        value: ImageBitmapMock,
      });
      const detector = new BarcodeDetector();
      const imageBitmap = new ImageBitmap();
      const drawImageSpy = jest.spyOn(CanvasRenderingContext2D.prototype, 'drawImage').mockImplementation(jest.fn());

      // Act
      await detector.detect(imageBitmap);

      // Assert
      expect(scanOneResultSpy).not.toHaveBeenCalled();
      expect(decodeFromCanvasSpy).toHaveBeenCalled();
      const canvas = decodeFromCanvasSpy.mock.calls[0]?.[0];
      expect(canvas?.width).toBe(300);
      expect(canvas?.height).toBe(200);
      expect(drawImageSpy).toHaveBeenCalledWith(imageBitmap, 0, 0, 300, 200);
    });

    it('should use ZXing decodeFromCanvas() from ImageData source', async () => {
      // Arrange
      const detector = new BarcodeDetector();
      const imageData = new ImageData(300, 200);
      const putImageDataSpy = jest.spyOn(CanvasRenderingContext2D.prototype, 'putImageData');

      // Act
      await detector.detect(imageData);

      // Assert
      expect(scanOneResultSpy).not.toHaveBeenCalled();
      expect(decodeFromCanvasSpy).toHaveBeenCalled();
      const canvas = decodeFromCanvasSpy.mock.calls[0]?.[0];
      expect(canvas?.width).toBe(300);
      expect(canvas?.height).toBe(200);
      expect(putImageDataSpy).toHaveBeenCalledWith(imageData, 0, 0);
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
      const canvas = decodeFromCanvasSpy.mock.calls[0]?.[0];
      expect(canvas?.width).toBe(300);
      expect(canvas?.height).toBe(200);
    });

    it('should use ZXing decodeFromCanvas() from SVGImageElement source', async () => {
      // Arrange
      class SVGImageElementMock {
        width = { baseVal: { value: 300 } };
        height = { baseVal: { value: 200 } };
      }
      Object.defineProperty(window, 'SVGImageElement', {
        writable: true,
        configurable: true,
        value: SVGImageElementMock,
      });
      const image = new SVGImageElement();
      const detector = new BarcodeDetector();
      const drawImageSpy = jest.spyOn(CanvasRenderingContext2D.prototype, 'drawImage').mockImplementation(jest.fn());

      // Act
      await detector.detect(image);

      // Assert
      expect(decodeFromCanvasSpy).toHaveBeenCalled();
      expect(drawImageSpy).toHaveBeenCalledWith(image, 0, 0, 300, 200);
    });

    it('should use ZXing decodeFromCanvas() from OffscreenCanvas source', async () => {
      // Arrange
      class OffscreenCanvasMock {
        constructor(public width: number, public height: number) {}
      }
      Object.defineProperty(window, 'OffscreenCanvas', {
        writable: true,
        configurable: true,
        value: OffscreenCanvasMock,
      });
      const source = new OffscreenCanvas(300, 200);
      const detector = new BarcodeDetector();
      const drawImageSpy = jest.spyOn(CanvasRenderingContext2D.prototype, 'drawImage').mockImplementation(jest.fn());

      // Act
      await detector.detect(source);

      // Assert
      expect(decodeFromCanvasSpy).toHaveBeenCalled();
      expect(drawImageSpy).toHaveBeenCalledWith(source, 0, 0, 300, 200);
    });

    it('should reject images that are not fully decodable', async () => {
      const detector = new BarcodeDetector();

      await expect(detector.detect(document.createElement('img'))).rejects.toMatchObject({
        name: 'InvalidStateError',
      });
    });

    it('should reject videos that do not have frame data', async () => {
      const detector = new BarcodeDetector();

      await expect(detector.detect(document.createElement('video'))).rejects.toMatchObject({
        name: 'InvalidStateError',
      });
    });

    it('should resolve to an empty array for a zero-sized canvas', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 0;
      canvas.height = 0;
      const detector = new BarcodeDetector();

      await expect(detector.detect(canvas)).resolves.toEqual([]);
      expect(decodeFromCanvasSpy).not.toHaveBeenCalled();
    });

    it('should reslove to empty array when ZXing throws NotFoundException', async () => {
      // Arrange
      scanOneResultSpy = jest.spyOn(BrowserMultiFormatReader.prototype, 'scanOneResult')
        .mockRejectedValue(new NotFoundException('TEST'));
      const detector = new BarcodeDetector();
      const image = createLoadedImage();

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
      const image = createLoadedImage();

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
        boundingBox: new DOMRectReadOnly(100, 200, 100, 10),
      };
      scanOneResultSpy = jest.spyOn(BrowserMultiFormatReader.prototype, 'scanOneResult').mockResolvedValue(zxingResult);
      const detector = new BarcodeDetector();

      // Act
      const result = await detector.detect(createLoadedImage());

      // Assert
      expect(result).toEqual([nativeResult]);
      expect(DOMRectReadOnly).toHaveBeenLastCalledWith(100, 200, 100, 10);
    });
  });
});
