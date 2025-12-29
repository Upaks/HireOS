/**
 * Enhanced file upload security
 * Validates MIME types, file content, and prevents malicious uploads
 */

import { Request } from 'express';
import { fileTypeFromBuffer } from 'file-type';

// Allowed MIME types for resume uploads
const ALLOWED_MIME_TYPES = [
  'application/pdf',
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.pdf'];

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Validate file MIME type
 */
export async function validateMimeType(buffer: Buffer, filename: string): Promise<boolean> {
  // Check file extension
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return false;
  }

  // Check actual file content (not just extension)
  const fileTypeResult = await fileTypeFromBuffer(buffer);
  if (!fileTypeResult) {
    // Some PDFs might not be detected, but extension check passed
    // Allow if extension is .pdf
    return ext === '.pdf';
  }

  return ALLOWED_MIME_TYPES.includes(fileTypeResult.mime);
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

/**
 * Check for malicious content patterns
 */
export function checkForMaliciousContent(buffer: Buffer): { safe: boolean; reason?: string } {
  // Check first 1KB for suspicious patterns
  const preview = buffer.slice(0, 1024).toString('utf-8', 0, 1024);
  
  // Check for script tags
  if (preview.includes('<script') || preview.includes('</script>')) {
    return { safe: false, reason: 'File contains script tags' };
  }

  // Check for javascript: protocol
  if (preview.toLowerCase().includes('javascript:')) {
    return { safe: false, reason: 'File contains javascript: protocol' };
  }

  // Check for data: URLs with executable content
  if (preview.includes('data:text/html') || preview.includes('data:application/javascript')) {
    return { safe: false, reason: 'File contains executable data URLs' };
  }

  // Check for suspicious file signatures (not exhaustive, but catches common issues)
  // PDF should start with %PDF
  if (buffer.length > 4) {
    const header = buffer.slice(0, 4).toString('ascii');
    if (!header.startsWith('%PDF') && buffer.length < 1000) {
      // Small files that don't look like PDFs might be suspicious
      return { safe: false, reason: 'File does not appear to be a valid PDF' };
    }
  }

  return { safe: true };
}

/**
 * Comprehensive file validation
 */
export async function validateFile(
  file: Express.Multer.File,
  req?: Request
): Promise<{ valid: boolean; error?: string }> {
  // Check file exists
  if (!file || !file.buffer) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (!validateFileSize(file.size)) {
    return {
      valid: false,
      error: `File size must be between 1 byte and ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }

  // Check MIME type
  const isValidMime = await validateMimeType(file.buffer, file.originalname);
  if (!isValidMime) {
    return {
      valid: false,
      error: 'Only PDF files are allowed'
    };
  }

  // Check for malicious content
  const contentCheck = checkForMaliciousContent(file.buffer);
  if (!contentCheck.safe) {
    return {
      valid: false,
      error: contentCheck.reason || 'File contains potentially malicious content'
    };
  }

  return { valid: true };
}

/**
 * Get file type from buffer
 */
export async function getFileType(buffer: Buffer): Promise<string | undefined> {
  const result = await fileTypeFromBuffer(buffer);
  return result?.mime;
}

