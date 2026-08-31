import { z } from 'zod';

export const InvoiceLineItemSchema = z.object({
  id: z.string(),
  sort_order: z.number().int(),
  kind: z.string(),
  label: z.string(),
  quantity: z.number(),
  unit_price_minor: z.number().int(),
  amount_minor: z.number().int(),
  metadata: z.record(z.unknown()).nullable().optional(),
});
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

export const InvoiceSchema = z.object({
  id: z.string(),
  booking_id: z.string(),
  invoice_number: z.string(),
  status: z.string(),
  currency: z.string(),
  subtotal_minor: z.number().int(),
  tax_minor: z.number().int(),
  total_minor: z.number().int(),
  paid_minor: z.number().int(),
  balance_minor: z.number().int(),
  issued_at: z.string().nullable().optional(),
  pdf_download_url: z.string().nullable().optional(),
  line_items: z.array(InvoiceLineItemSchema),
  allowed_actions: z.array(z.string()).optional(),
  payment_method: z.string().nullable().optional(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const InvoiceSummarySchema = z.object({
  id: z.string(),
  status: z.string(),
  balance_minor: z.number().int(),
  invoice_number: z.string().nullable().optional(),
});
export type InvoiceSummary = z.infer<typeof InvoiceSummarySchema>;
