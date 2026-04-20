/**
 * Tarayıcıda: QR görseli + ortada logo birleştirir (PNG data URL).
 * QR kaynağı CORS vermezse veya çizim başarısızsa null döner — düz QR gösterilir.
 */

export function qrCodeApiUrl(targetUrl: string, size: number): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&ecc=H&margin=10&data=${encodeURIComponent(targetUrl)}`;
}

function loadImage(src: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Görsel yüklenemedi"));
    img.src = src;
  });
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/**
 * Önce yüksek çözünürlükte birleştirip sonra hedef boyuta indirger; logo daha az bulanık olur.
 * (Küçük logo dosyası büyütülürken yine yumuşar — mümkünse en az ~200px kare yükleyin.)
 */
function pickInternalQrSize(outputSize: number): number {
  const scaled = Math.round(outputSize * 2.75);
  return Math.min(900, Math.max(520, scaled));
}

/**
 * @param menuUrl — QR içine kodlanacak URL
 * @param outputSize — çıktı kare piksel
 * @param centerLogoSrc — data URL veya tam URL (örn. origin + /ks-logo.png)
 */
export async function createQrPngWithCenterLogo(
  menuUrl: string,
  outputSize: number,
  centerLogoSrc: string,
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const internalSize = pickInternalQrSize(outputSize);
  const qrSrc = qrCodeApiUrl(menuUrl, internalSize);

  try {
    const qrImg = await loadImage(qrSrc, true);
    const logoCrossOrigin = !centerLogoSrc.startsWith("data:");
    const logoImg = await loadImage(centerLogoSrc, logoCrossOrigin);

    const hi = document.createElement("canvas");
    hi.width = internalSize;
    hi.height = internalSize;
    const ctx = hi.getContext("2d");
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(qrImg, 0, 0, internalSize, internalSize);

    const box = internalSize * 0.26;
    const half = box / 2;
    const cx = internalSize / 2;
    const cy = internalSize / 2;
    const cornerR = box * 0.2;

    ctx.fillStyle = "#ffffff";
    fillRoundRect(ctx, Math.floor(cx - half), Math.floor(cy - half), box, box, cornerR);
    ctx.fill();

    const innerPad = box * 0.14;
    const innerSize = box - 2 * innerPad;
    const ix = Math.floor(cx - innerSize / 2);
    const iy = Math.floor(cy - innerSize / 2);

    const iw = logoImg.naturalWidth || logoImg.width;
    const ih = logoImg.naturalHeight || logoImg.height;
    if (iw > 0 && ih > 0) {
      const scale = Math.min(innerSize / iw, innerSize / ih);
      const dw = Math.round(iw * scale);
      const dh = Math.round(ih * scale);
      const dx = Math.floor(cx - dw / 2);
      const dy = Math.floor(cy - dh / 2);

      ctx.save();
      fillRoundRect(ctx, ix, iy, innerSize, innerSize, cornerR * 0.55);
      ctx.clip();
      ctx.drawImage(logoImg, 0, 0, iw, ih, dx, dy, dw, dh);
      ctx.restore();
    }

    const out = document.createElement("canvas");
    out.width = outputSize;
    out.height = outputSize;
    const octx = out.getContext("2d");
    if (!octx) return null;
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(hi, 0, 0, internalSize, internalSize, 0, 0, outputSize, outputSize);

    return out.toDataURL("image/png");
  } catch {
    return null;
  }
}

export function defaultKendiSepetimLogoUrl(): string {
  if (typeof window === "undefined") return "/ks-logo.png";
  return `${window.location.origin}/ks-logo.png`;
}
