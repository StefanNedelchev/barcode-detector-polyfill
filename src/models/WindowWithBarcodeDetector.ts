import { IBarcodeDetector } from './IBarcodeDetector';

export type WindowWithBarcodeDetector = Window
  & typeof globalThis
  & {
    BarcodeDetector: {
      prototype: IBarcodeDetector;
      new(): IBarcodeDetector;
      getSupportedFormats(): Promise<string[]>;
    }
  };
