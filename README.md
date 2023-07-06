# BarcodeDetector API Polyfill

## The problem

The web [BarcodeDetector API](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) is amazing because it's very easy to use and it works surprizingly well even with detecting muliple barcodes in a single image. However there is a problem with this API - [its current browser support](https://caniuse.com/mdn-api_barcodedetector) (or the lack of such, to be more precise). The current browser support can be summarized like this:

- Mobile
  - Android - only Chromium-based browsers
  - iOS - N/A
- Desktop
  - Windows - N/A
  - Linux - N/A
  - macOS - only Chromium-based browsers *(WTF?)*

As you can see there is a huge gap in the support across mobile and desktop platforms and this project is here to fill it.

## The solution

This project implements a polyfill for the BarcodeDetector API that follows the [W3C specification](https://wicg.github.io/shape-detection-api/#barcode-detection-api) with the help of the [ZXing library](https://github.com/zxing-js/library) and [its browser layer](https://github.com/zxing-js/browser). ZXing ("zebra crossing") is a popular open-source library that works with 1D and 2D barcode formats. It was originally written in Java but was eventually ported to many different languages including JavaScript and TypeScript.

## How to use?

### Standalone browser script

Download the latest build and use it as a regular JS file in a `<script>` tag or include it to your script imports if you use a bundler. This build takes care of adding the missing BarcodeDetector object to the global scope and you are able to use it the same way as the real BarcodeDetector API.

### Module import

If you just want to have the detector and handle the polyfilling by yourself you can simply import the `BarcodeDetector` class in your code. A valid use case for this could be if you use a bundler and you want to lazy load the polyfill only when its needed.

## Important notes and known drawbacks

### Consistency with the native API

The ZXing reader detects only a single barcode from the image source. Because of that, you can never have more than 1 barcode result.

Barcode results from ZXing don't always include 4 corner points. For example, for 1-dimensional barcodes it returns only 2 points so you end up with coordinates for a line rather than a quadrangle. This might be an issue if you want to use these coordinates in your app to draw an outline of the detected barcode on a canvas.

### Reliability

Although for the most part ZXing works well, it's not as reliable as the native BarcodeDetector API. It might struggle in situations like:

- the barcode is not focused well
- the barcode is at a very narrow angle
- the image is not clean enough

### Performance

Although it might be obvious, the image recognition logic is now handled entirely in the JavaScript code, therefore you can't expect performance as good as the native API. If you are going to use the detector with static images, you don't need to worry about that, but if you want to use the detector continuously on a streaming video, you can potentially expect performance issues.

### Bundle size

Due to the presence of all ZXing decoders, the minified JS build of the polyfill is ~430 kb (before gzip compression). This could be a deal breaker for low bandwidth connections and Core Web Vitals scores. You can potentially work your way around this by lazy loading the polyfill which involves additional effort.

## How it's done?

This section here is for the curious ones who are interested in the development itself (and maybe want to contribute too). The polyfill is basically a class that implements the specified BarcodeDetector interface, and [the MDN documentation](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) has been very helpful during the development. The class uses a ZXing multi-format reader internally and initializes it with a specific list of formats (if such are passed to the constructor). The class has the public static method `getSupportedFormats()`  and the instance method `detect()`, both of can be used the same way as the native API.

The implementation of the `detect()` method was a challenge because unlike the BarcodeDetector API, ZXing doesn't have this silver bullet detection method that accepts all kinds of image sources but rather has different methods that decode from different sources (canvas, video, image, stream, etc.). Because of this, the polyfill implementation conditionally calls different methods for one-time detection based on the type of the image source.

Another challange was to align the differences between the barcode formats of ZXing and the BarcodeDetector API. The barcode formats in ZXing are presented as an `enum` while the BarcodeDetector API accepts (and returns) strings. To make the methods of the polyfill work as expected, two special map-like objects had to be created to make it possible to map barcode formats back and forth.
