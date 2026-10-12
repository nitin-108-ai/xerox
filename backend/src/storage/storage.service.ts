import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { config } from '../config/index.js';

export interface FileValidationResult {
  isValid: boolean;
  detectedMime: string | null;
  pageCount: number;
  malwareStatus: 'CLEAN' | 'FLAGGED';
  error?: string;
}

export class StorageService {
  private baseStorageDir: string;

  constructor() {
    this.baseStorageDir = config.storagePath;
    if (!fs.existsSync(this.baseStorageDir)) {
      fs.mkdirSync(this.baseStorageDir, { recursive: true });
    }
  }

  /**
   * Validates file headers (magic bytes) against spoofed extensions.
   */
  public validateMagicBytes(buffer: Buffer): { isValid: boolean; detectedMime: string | null } {
    if (!buffer || buffer.length < 8) {
      return { isValid: false, detectedMime: null };
    }

    // PDF Magic Bytes: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46 &&
      buffer[4] === 0x2d
    ) {
      return { isValid: true, detectedMime: 'application/pdf' };
    }

    // PNG Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { isValid: true, detectedMime: 'image/png' };
    }

    // JPEG Magic Bytes: FF D8 FF
    if (
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return { isValid: true, detectedMime: 'image/jpeg' };
    }

    return { isValid: false, detectedMime: null };
  }

  /**
   * Lightweight malware & malicious content heuristics check:
   * Inspects for embedded executables (MZ header), suspicious shell commands, or malicious PDF launch actions.
   */
  public checkMalwareHeuristics(buffer: Buffer, mime: string): 'CLEAN' | 'FLAGGED' {
    // Check for DOS / PE executable header (MZ)
    if (buffer.length > 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
      return 'FLAGGED';
    }

    if (mime === 'application/pdf') {
      const textHeader = buffer.subarray(0, Math.min(buffer.length, 32768)).toString('latin1');
      // Look for PDF automatic action execution tags
      if (textHeader.includes('/Launch') || textHeader.includes('/EmbeddedFiles')) {
        return 'FLAGGED';
      }
    }

    return 'CLEAN';
  }

  /**
   * Inspects document to determine actual page count.
   */
  public async extractPageCount(buffer: Buffer, mime: string): Promise<number> {
    if (mime === 'application/pdf') {
      try {
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        return Math.max(1, pdfDoc.getPageCount());
      } catch (err) {
        console.warn('Could not parse PDF pages strictly, fallback to 1 page:', err);
        return 1;
      }
    }

    // Images (JPG, PNG) are single-page documents
    return 1;
  }

  /**
   * Validates document thoroughly.
   */
  public async inspectAndValidate(buffer: Buffer, declaredMime: string): Promise<FileValidationResult> {
    const magicCheck = this.validateMagicBytes(buffer);
    if (!magicCheck.isValid || !magicCheck.detectedMime) {
      return {
        isValid: false,
        detectedMime: null,
        pageCount: 0,
        malwareStatus: 'FLAGGED',
        error: 'File contents do not match allowed formats (PDF, PNG, JPG). Magic bytes validation failed.'
      };
    }

    // Check size
    const maxBytes = config.maxFileSizeMb * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return {
        isValid: false,
        detectedMime: magicCheck.detectedMime,
        pageCount: 0,
        malwareStatus: 'CLEAN',
        error: `File size exceeds platform limit of ${config.maxFileSizeMb}MB.`
      };
    }

    const malwareStatus = this.checkMalwareHeuristics(buffer, magicCheck.detectedMime);
    if (malwareStatus === 'FLAGGED') {
      return {
        isValid: false,
        detectedMime: magicCheck.detectedMime,
        pageCount: 0,
        malwareStatus: 'FLAGGED',
        error: 'Document flagged by security inspection for embedded executable or suspicious script structures.'
      };
    }

    const pageCount = await this.extractPageCount(buffer, magicCheck.detectedMime);

    return {
      isValid: true,
      detectedMime: magicCheck.detectedMime,
      pageCount,
      malwareStatus: 'CLEAN'
    };
  }

  /**
   * Persists file to private storage outside web root.
   */
  public async saveFile(buffer: Buffer, originalFilename: string, mimeType: string): Promise<{
    storageKey: string;
    storedFilename: string;
    sha256Hash: string;
    fileSize: number;
  }> {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const safeExt = mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/png' ? '.png' : '.jpg';
    const randomKey = crypto.randomBytes(16).toString('hex');
    const storedFilename = `doc_${randomKey}${safeExt}`;
    const storageKey = storedFilename;
    const fullPath = path.join(this.baseStorageDir, storedFilename);

    await fs.promises.writeFile(fullPath, buffer);

    return {
      storageKey,
      storedFilename,
      sha256Hash: hash,
      fileSize: buffer.length
    };
  }

  /**
   * Resolves absolute file path with directory traversal protection.
   */
  public getFilePath(storageKey: string): string | null {
    // Sanitize storage key
    const sanitizedKey = path.basename(storageKey);
    const fullPath = path.join(this.baseStorageDir, sanitizedKey);

    // Verify it resides inside baseStorageDir
    if (!fullPath.startsWith(this.baseStorageDir)) {
      return null;
    }

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    return fullPath;
  }

  /**
   * Physically removes file from storage.
   */
  public async deletePhysicalFile(storageKey: string): Promise<boolean> {
    const filePath = this.getFilePath(storageKey);
    if (!filePath) {
      return false;
    }

    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch (err: any) {
      console.error(`Error deleting file ${storageKey}:`, err.message);
      return false;
    }
  }
}

export const storageService = new StorageService();
