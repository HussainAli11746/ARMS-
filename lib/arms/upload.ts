import { DomainError } from './service.ts';

// Node FormData contains strings or File objects.
export function isUploadedFile(value: unknown): value is File {
  return value instanceof File && value.size > 0;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function validateFileBytes(
  name: string,
  buffer: Buffer,
): { mime: string } {
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new DomainError(413, 'File exceeds maximum permitted size of 10 MB.');
  }

  // Minimum size for any valid file
  if (buffer.length < 24) {
    throw new DomainError(
      422,
      'The file is truncated or empty and cannot be parsed.',
    );
  }

  // PDF Validation:
  // 1. Must start with '%PDF-' (0x25, 0x50, 0x44, 0x46, 0x2D)
  // 2. Minimum reasonable PDF size is ~64 bytes
  // 3. Must contain EOF marker '%%EOF' near the end of the file
  if (
    buffer.length >= 30 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    const tail = buffer
      .subarray(Math.max(0, buffer.length - 1024))
      .toString('latin1');
    if (!tail.includes('%%EOF')) {
      throw new DomainError(
        422,
        'The PDF file appears truncated or corrupted (missing %%EOF marker).',
      );
    }
    return { mime: 'application/pdf' };
  }

  // PNG Validation:
  // 1. Must start with 8-byte PNG header: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  // 2. Must contain IHDR chunk header (0x49, 0x48, 0x44, 0x52) at offset 12
  if (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    if (
      buffer[12] !== 0x49 ||
      buffer[13] !== 0x48 ||
      buffer[14] !== 0x44 ||
      buffer[15] !== 0x52
    ) {
      throw new DomainError(
        422,
        'The PNG file appears corrupted (missing IHDR header).',
      );
    }
    return { mime: 'image/png' };
  }

  // JPEG Validation:
  // 1. Starts with SOI: 0xFF, 0xD8, 0xFF
  // 2. Minimum size >= 64 bytes
  // 3. Ends with EOI: 0xFF, 0xD9 in trailing bytes
  if (
    buffer.length >= 30 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    const lastBytes = buffer.subarray(buffer.length - 16);
    let hasEoi = false;
    for (let i = 0; i < lastBytes.length - 1; i++) {
      if (lastBytes[i] === 0xff && lastBytes[i + 1] === 0xd9) {
        hasEoi = true;
        break;
      }
    }
    if (!hasEoi) {
      throw new DomainError(
        422,
        'The JPEG file appears truncated or corrupted (missing EOI marker).',
      );
    }
    return { mime: 'image/jpeg' };
  }

  throw new DomainError(
    415,
    'Invalid file format. Only valid PDF, JPG, and PNG files are permitted.',
  );
}
