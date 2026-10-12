import { query } from '../db/connection.js';

export interface PricingInput {
  shopId: string;
  paperSize: 'A4' | 'A3' | 'LEGAL' | 'LETTER';
  colorMode: 'BW' | 'COLOR';
  isDuplex: boolean;
  copies: number;
  pageCount: number;
}

export interface PricingBreakdown {
  unitPrice: number;
  subtotal: number;
  discount: number;
  total: number;
  sheetsPerCopy: number;
  totalSheets: number;
  appliedRule: {
    paperSize: string;
    colorMode: string;
    singleSidedPrice: number;
    doubleSidedPrice: number;
    discountThreshold: number;
    discountRate: number;
  };
}

export class PricingService {
  public async calculatePrice(input: PricingInput): Promise<PricingBreakdown> {
    const { shopId, paperSize, colorMode, isDuplex, copies, pageCount } = input;
    const safeCopies = Math.max(1, copies || 1);
    const safePages = Math.max(1, pageCount || 1);

    // Fetch shop rule
    const res = await query(`
      SELECT paper_size, color_mode, single_sided_price, double_sided_price,
             per_page_discount_threshold, per_page_discount_rate
      FROM shop_pricing_rules
      WHERE shop_id = $1 AND paper_size = $2 AND color_mode = $3
      LIMIT 1;
    `, [shopId, paperSize, colorMode]);

    let rule = res.rows[0];

    // Fallback default rules if not configured for this specific paper/color
    if (!rule) {
      const isColor = colorMode === 'COLOR';
      const isLarge = paperSize === 'A3';
      const baseSingle = isColor ? (isLarge ? 20.00 : 10.00) : (isLarge ? 5.00 : 2.00);
      const baseDouble = isColor ? (isLarge ? 35.00 : 18.00) : (isLarge ? 8.00 : 3.00);

      rule = {
        paper_size: paperSize,
        color_mode: colorMode,
        single_sided_price: baseSingle,
        double_sided_price: baseDouble,
        per_page_discount_threshold: 50,
        per_page_discount_rate: isColor ? 1.00 : 0.20
      };
    }

    const singlePrice = parseFloat(rule.single_sided_price);
    const doublePrice = parseFloat(rule.double_sided_price);
    const discountThreshold = parseInt(rule.per_page_discount_threshold, 10) || 50;
    const discountRate = parseFloat(rule.per_page_discount_rate) || 0.00;

    let sheetsPerCopy: number;
    let unitPricePerCopy: number;

    if (isDuplex) {
      sheetsPerCopy = Math.ceil(safePages / 2);
      // If odd number of pages, last sheet is printed single-sided
      if (safePages % 2 === 1 && safePages > 1) {
        const fullDuplexSheets = Math.floor(safePages / 2);
        unitPricePerCopy = (fullDuplexSheets * doublePrice) + singlePrice;
      } else if (safePages === 1) {
        unitPricePerCopy = singlePrice;
      } else {
        unitPricePerCopy = sheetsPerCopy * doublePrice;
      }
    } else {
      sheetsPerCopy = safePages;
      unitPricePerCopy = safePages * singlePrice;
    }

    const totalSheets = sheetsPerCopy * safeCopies;
    const totalPages = safePages * safeCopies;
    let subtotal = unitPricePerCopy * safeCopies;

    // Apply volume discount if threshold met
    let discount = 0;
    if (totalPages >= discountThreshold && discountRate > 0) {
      discount = totalPages * discountRate;
      if (discount > subtotal * 0.5) {
        // Cap discount at 50%
        discount = subtotal * 0.5;
      }
    }

    // Fetch shop min_order_amount
    const shopRes = await query(`
      SELECT min_order_amount FROM shops WHERE id = $1 LIMIT 1;
    `, [shopId]);
    const minOrderAmount = shopRes.rows.length > 0 && shopRes.rows[0].min_order_amount != null
      ? parseFloat(shopRes.rows[0].min_order_amount)
      : 5.00;

    let total = parseFloat((subtotal - discount).toFixed(2));
    if (total < minOrderAmount) {
      total = minOrderAmount;
    }

    return {
      unitPrice: parseFloat(unitPricePerCopy.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      minOrderAmount,
      total,
      sheetsPerCopy,
      totalSheets,
      appliedRule: {
        paperSize: rule.paper_size,
        colorMode: rule.color_mode,
        singleSidedPrice: singlePrice,
        doubleSidedPrice: doublePrice,
        discountThreshold,
        discountRate
      }
    };
  }
}

export const pricingService = new PricingService();
