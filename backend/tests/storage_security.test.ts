import { describe, it, expect } from 'vitest';
import { storageService } from '../src/storage/storage.service.js';

describe('Storage & Document Security Tests', () => {
  it('should accept valid PDF magic bytes (%PDF-)', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const result = await storageService.inspectAndValidate(validPdfBuffer, 'application/pdf');

    expect(result.isValid).toBe(true);
    expect(result.detectedMime).toBe('application/pdf');
    expect(result.malwareStatus).toBe('CLEAN');
  });

  it('should accept valid PNG magic bytes', async () => {
    // 89 50 4E 47 0D 0A 1A 0A
    const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const result = await storageService.inspectAndValidate(validPngHeader, 'image/png');

    expect(result.isValid).toBe(true);
    expect(result.detectedMime).toBe('image/png');
  });

  it('should accept valid JPEG magic bytes', async () => {
    // FF D8 FF
    const validJpgHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const result = await storageService.inspectAndValidate(validJpgHeader, 'image/jpeg');

    expect(result.isValid).toBe(true);
    expect(result.detectedMime).toBe('image/jpeg');
  });

  it('should reject spoofed extension with invalid magic bytes (e.g. plain text renamed to .pdf)', async () => {
    const fakePdfBuffer = Buffer.from('Hello world this is just a plain text document pretending to be PDF');
    const result = await storageService.inspectAndValidate(fakePdfBuffer, 'application/pdf');

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Magic bytes validation failed');
  });

  it('should flag DOS/PE executable disguised as document (MZ header)', async () => {
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const status = storageService.checkMalwareHeuristics(exeBuffer, 'application/pdf');

    expect(status).toBe('FLAGGED');
  });

  it('should flag suspicious PDF launch action tags (/Launch)', async () => {
    const suspiciousPdfBuffer = Buffer.from('%PDF-1.4\n/Type /Action /S /Launch /F (cmd.exe)');
    const status = storageService.checkMalwareHeuristics(suspiciousPdfBuffer, 'application/pdf');

    expect(status).toBe('FLAGGED');
  });

  it('should save file to private storage and physically delete it upon request', async () => {
    const testBuffer = Buffer.from('%PDF-1.4\nTemporary test document bytes\n%%EOF');
    const saved = await storageService.saveFile(testBuffer, 'test_contract.pdf', 'application/pdf');

    expect(saved.storageKey).toBeDefined();
    expect(saved.sha256Hash).toBeDefined();

    // Verify file exists on private disk
    const filePath = storageService.getFilePath(saved.storageKey);
    expect(filePath).not.toBeNull();

    // Physically delete file
    const deleted = await storageService.deletePhysicalFile(saved.storageKey);
    expect(deleted).toBe(true);

    // Verify file path is now null or nonexistent
    const checkPath = storageService.getFilePath(saved.storageKey);
    expect(checkPath).toBeNull();
  });
});
