import { BarcodeFormat } from '@zxing/library';

// format names taken from https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API#supported_barcode_formats

export const zxingToNativeFormat: Record<BarcodeFormat, string> = {
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

export const nativeToZxingFormat: Record<string, BarcodeFormat> = {
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
