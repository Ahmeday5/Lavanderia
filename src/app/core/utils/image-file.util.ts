/**
 * Client-side validation + normalization for image uploads.
 *
 * The file's *content* is the source of truth, never its name or the
 * browser-reported MIME type (both are trivially wrong: a renamed `.exe`,
 * or a real JPEG saved as `.jfif` that the backend then rejects by
 * extension). `prepareImageUpload` therefore:
 *
 *   1. checks size limits
 *   2. sniffs the magic bytes to identify the real format
 *   3. decodes the image to prove it isn't corrupt and to read its dimensions
 *   4. returns a new `File` whose extension + MIME match the real format
 *      (`photo.jfif` → `photo.jpg`), so the backend's extension check passes
 *
 * Keep `IMAGE_UPLOAD_RULES` aligned with the backend's own limits.
 */

export type ImageFormat = 'jpeg' | 'png' | 'webp';

interface FormatInfo {
  mime: string;
  ext: string;
  label: string;
}

const FORMATS: Record<ImageFormat, FormatInfo> = {
  jpeg: { mime: 'image/jpeg', ext: 'jpg', label: 'JPG' },
  png: { mime: 'image/png', ext: 'png', label: 'PNG' },
  webp: { mime: 'image/webp', ext: 'webp', label: 'WEBP' },
};

export const IMAGE_UPLOAD_RULES = {
  maxBytes: 5 * 1024 * 1024,
  minDimension: 64,
  maxDimension: 8000,
} as const;

/** Human-readable list of supported formats, e.g. "JPG، PNG، WEBP". */
export const SUPPORTED_IMAGE_LABEL = Object.values(FORMATS)
  .map((f) => f.label)
  .join('، ');

/**
 * `accept` attribute for `<input type="file">`. Lists JPEG's alias
 * extensions too so `.jfif` files remain pickable — they get normalized.
 */
export const IMAGE_ACCEPT_ATTR = [
  ...Object.values(FORMATS).map((f) => f.mime),
  '.jpg', '.jpeg', '.jfif', '.jpe', '.pjpeg', '.pjp', '.png', '.webp',
].join(',');

export type PreparedImage =
  | {
      ok: true;
      file: File;
      width: number;
      height: number;
      format: ImageFormat;
      /** True when the extension/MIME were corrected (e.g. `.jfif` → `.jpg`). */
      normalized: boolean;
    }
  | { ok: false; error: string };

export async function prepareImageUpload(
  file: File,
  rules: typeof IMAGE_UPLOAD_RULES = IMAGE_UPLOAD_RULES,
): Promise<PreparedImage> {
  if (!file || file.size === 0) {
    return { ok: false, error: 'الملف المختار فارغ.' };
  }
  if (file.size > rules.maxBytes) {
    return {
      ok: false,
      error: `حجم الصورة ${formatBytes(file.size)} يتجاوز الحد المسموح (${formatBytes(rules.maxBytes)}).`,
    };
  }

  let header: Uint8Array;
  try {
    header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  } catch {
    return { ok: false, error: 'تعذّرت قراءة الملف. حاول اختياره مرة أخرى.' };
  }

  const format = detectFormat(header);
  if (!format) {
    const known = detectUnsupported(header);
    return {
      ok: false,
      error: known
        ? `صيغة ${known} غير مدعومة. الصيغ المدعومة: ${SUPPORTED_IMAGE_LABEL}.`
        : `الملف ليس صورة صالحة. الصيغ المدعومة: ${SUPPORTED_IMAGE_LABEL}.`,
    };
  }

  const size = await readDimensions(file);
  if (!size) {
    return { ok: false, error: 'تعذّر فتح الصورة — قد يكون الملف تالفًا.' };
  }
  if (size.width < rules.minDimension || size.height < rules.minDimension) {
    return {
      ok: false,
      error: `أبعاد الصورة (${size.width}×${size.height}) صغيرة جدًا. الحد الأدنى ${rules.minDimension}×${rules.minDimension} بكسل.`,
    };
  }
  if (size.width > rules.maxDimension || size.height > rules.maxDimension) {
    return {
      ok: false,
      error: `أبعاد الصورة (${size.width}×${size.height}) كبيرة جدًا. الحد الأقصى ${rules.maxDimension} بكسل لكل ضلع.`,
    };
  }

  const info = FORMATS[format];
  const name = `${safeBaseName(file.name)}.${info.ext}`;
  const normalized = name !== file.name || file.type !== info.mime;
  const output = normalized
    ? new File([file], name, { type: info.mime, lastModified: file.lastModified })
    : file;

  return { ok: true, file: output, width: size.width, height: size.height, format, normalized };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} كيلوبايت`;
  const mb = bytes / (1024 * 1024);
  return `${mb % 1 === 0 ? mb : mb.toFixed(1)} ميجابايت`;
}

// ─────────── internals ───────────

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((b, i) => bytes[offset + i] === b);
}

function detectFormat(h: Uint8Array): ImageFormat | null {
  // JPEG (incl. JFIF/EXIF variants): FF D8 FF
  if (startsWith(h, [0xff, 0xd8, 0xff])) return 'jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(h, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  // WEBP: "RIFF" .... "WEBP"
  if (startsWith(h, [0x52, 0x49, 0x46, 0x46]) && startsWith(h, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'webp';
  }
  return null;
}

/** Recognizes common image formats we *don't* accept, for a precise error message. */
function detectUnsupported(h: Uint8Array): string | null {
  if (startsWith(h, [0x47, 0x49, 0x46, 0x38])) return 'GIF';
  if (startsWith(h, [0x42, 0x4d])) return 'BMP';
  if (startsWith(h, [0x66, 0x74, 0x79, 0x70], 4)) return 'HEIC/AVIF';
  if (startsWith(h, [0x3c, 0x3f, 0x78, 0x6d]) || startsWith(h, [0x3c, 0x73, 0x76, 0x67])) return 'SVG';
  if (startsWith(h, [0x49, 0x49, 0x2a, 0x00]) || startsWith(h, [0x4d, 0x4d, 0x00, 0x2a])) return 'TIFF';
  return null;
}

async function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return size;
    } catch {
      /* fall through to <img> decoding */
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Filename without extension, stripped of characters that commonly break servers/storage. */
function safeBaseName(name: string): string {
  const base = name.replace(/\.[^.]*$/, '');
  const cleaned = base
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return cleaned || 'image';
}
