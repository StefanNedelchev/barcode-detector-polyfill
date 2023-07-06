import { ICornerPoint } from './ICornerPoint';

export interface IDetectedBarcode {
  boundingBox: DOMRectReadOnly;
  cornerPoints: ICornerPoint[];
  format: string;
  rawValue: string;
}
