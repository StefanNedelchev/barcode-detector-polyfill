import { IBarcodeDetector } from './IBarcodeDetector';

export type WindowWithBarcodeDetector = Window
  & typeof globalThis
  & {
    BarcodeDetector: {
      prototype: IBarcodeDetector;
      new(options?: { formats?: string[] }): IBarcodeDetector;
      getSupportedFormats(): Promise<string[]>;
    };
  };
