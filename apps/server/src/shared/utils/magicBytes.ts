import { promises as fs } from "fs";

// Each entry: bytes to match, optional offset, MIME category it belongs to
const SIGNATURES: { bytes: number[]; offset?: number; mimePrefix: string }[] = [
  // Images
  { bytes: [0xFF, 0xD8, 0xFF],                               mimePrefix: "image/" }, // JPEG
  { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], mimePrefix: "image/" }, // PNG
  { bytes: [0x47, 0x49, 0x46, 0x38],                         mimePrefix: "image/" }, // GIF87a / GIF89a
  { bytes: [0x52, 0x49, 0x46, 0x46],                         mimePrefix: "image/" }, // WebP (RIFF header)
  { bytes: [0x42, 0x4D],                                     mimePrefix: "image/" }, // BMP
  // Video / Audio with ISO base media (MP4, MOV, M4A, M4V…) — "ftyp" box at offset 4
  { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4,              mimePrefix: "video/" },
  { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4,              mimePrefix: "audio/" },
  // WebM / MKV
  { bytes: [0x1A, 0x45, 0xDF, 0xA3],                        mimePrefix: "video/" },
  // Audio
  { bytes: [0x49, 0x44, 0x33],                               mimePrefix: "audio/" }, // MP3 with ID3 tag
  { bytes: [0xFF, 0xFB],                                     mimePrefix: "audio/" }, // MP3 frame sync
  { bytes: [0xFF, 0xF3],                                     mimePrefix: "audio/" }, // MP3 frame sync
  { bytes: [0xFF, 0xF2],                                     mimePrefix: "audio/" }, // MP3 frame sync
  { bytes: [0xFF, 0xF1],                                     mimePrefix: "audio/" }, // AAC ADTS
  { bytes: [0x4F, 0x67, 0x67, 0x53],                        mimePrefix: "audio/" }, // OGG
  { bytes: [0x66, 0x4C, 0x61, 0x43],                        mimePrefix: "audio/" }, // FLAC
  // Documents
  { bytes: [0x25, 0x50, 0x44, 0x46],                        mimePrefix: "application/" }, // PDF (%PDF)
  { bytes: [0xD0, 0xCF, 0x11, 0xE0],                        mimePrefix: "application/" }, // MS Office legacy (.doc, .xls)
  { bytes: [0x50, 0x4B, 0x03, 0x04],                        mimePrefix: "application/" }, // ZIP-based (docx, xlsx, pptx)
];

const READ_BYTES = 16;

/**
 * Returns the MIME category prefix ("image/", "video/", "audio/") detected from
 * the file's magic bytes, or null if unrecognised.
 */
export async function detectMimeCategory(filePath: string): Promise<string | null> {
  try {
    const fd = await fs.open(filePath, "r");
    const buffer = Buffer.alloc(READ_BYTES);
    await fd.read(buffer, 0, READ_BYTES, 0);
    await fd.close();

    for (const { bytes, offset = 0, mimePrefix } of SIGNATURES) {
      if (bytes.every((b, i) => buffer[offset + i] === b)) {
        return mimePrefix;
      }
    }
    return null;
  } catch {
    return null;
  }
}
