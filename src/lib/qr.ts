import QRCode from "qrcode";

/**
 * Verilen URL için SVG string üretir.
 */
export async function generateQRSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

/**
 * Verilen URL için Data URI (PNG) üretir (indir için).
 */
export async function generateQRDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    type: "image/png",
    margin: 2,
    width: 512,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}
