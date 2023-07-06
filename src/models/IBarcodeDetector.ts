import { IDetectedBarcode } from './IDetectedBarcode';

export interface IBarcodeDetector {
  detect(image: ImageBitmapSource): Promise<IDetectedBarcode[]>;
}
