import { describe, it, expect, beforeAll } from 'vitest';
import { pricingService } from '../src/services/pricing.service.js';
import { initDb } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { runSeed } from '../src/db/seed.js';

describe('Pricing Service Unit Tests', () => {
  beforeAll(async () => {
    await initDb();
    await runMigrations();
    await runSeed();
  });

  it('should calculate standard single-sided A4 B&W pricing correctly', async () => {
    // QuickCopy Express has single-sided A4 BW @ ₹2.00
    const result = await pricingService.calculatePrice({
      shopId: 'shp-quickcopy-001',
      paperSize: 'A4',
      colorMode: 'BW',
      isDuplex: false,
      copies: 1,
      pageCount: 5,
    });

    expect(result.sheetsPerCopy).toBe(5);
    expect(result.totalSheets).toBe(5);
    expect(result.subtotal).toBe(10.00); // 5 * 2.00
    expect(result.total).toBe(10.00);
  });

  it('should calculate duplex (double-sided) A4 B&W pricing correctly', async () => {
    // QuickCopy Express has double-sided A4 BW @ ₹3.00 per sheet
    const result = await pricingService.calculatePrice({
      shopId: 'shp-quickcopy-001',
      paperSize: 'A4',
      colorMode: 'BW',
      isDuplex: true,
      copies: 1,
      pageCount: 6, // 3 double-sided sheets
    });

    expect(result.sheetsPerCopy).toBe(3);
    expect(result.totalSheets).toBe(3);
    expect(result.subtotal).toBe(9.00); // 3 * 3.00
    expect(result.total).toBe(9.00);
  });

  it('should handle odd page count for duplex printing', async () => {
    // 5 pages duplex = 2 full duplex sheets (2 * 3.00 = 6) + 1 single sheet (2.00) = ₹8.00
    const result = await pricingService.calculatePrice({
      shopId: 'shp-quickcopy-001',
      paperSize: 'A4',
      colorMode: 'BW',
      isDuplex: true,
      copies: 1,
      pageCount: 5,
    });

    expect(result.subtotal).toBe(8.00);
    expect(result.total).toBe(8.00);
  });

  it('should apply volume discount when threshold is reached', async () => {
    // QuickCopy Express threshold: 50 pages, discount: 0.20 per page
    const result = await pricingService.calculatePrice({
      shopId: 'shp-quickcopy-001',
      paperSize: 'A4',
      colorMode: 'BW',
      isDuplex: false,
      copies: 1,
      pageCount: 100, // 100 pages * 2.00 = 200, discount = 100 * 0.20 = 20
    });

    expect(result.subtotal).toBe(200.00);
    expect(result.discount).toBe(20.00);
    expect(result.total).toBe(180.00);
  });
});
