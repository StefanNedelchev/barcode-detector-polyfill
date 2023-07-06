import { WindowWithBarcodeDetector } from './models';
import { BarcodeDetector } from './BarcodeDetector';

if (!('BarcodeDetector' in window)) {
  (window as WindowWithBarcodeDetector).BarcodeDetector = BarcodeDetector;
}
