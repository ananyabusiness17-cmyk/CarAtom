import { apiClient } from './api';
import { concernForKind } from './jobConcern';
import { isDraftComplete, type VehicleDraft } from './vehicleDraft';

export async function createFlowJobCard(opts: {
  kind: 'gs' | 'gpr' | 'ir';
  offeringSlug: string;
  vehicle: VehicleDraft;
  symptoms?: string;
  photoAssetIds?: string[];
  repairSlugs?: string[];
  repairQuantities?: Record<string, number>;
}): Promise<string> {
  if (!isDraftComplete(opts.vehicle)) {
    throw new Error('Select make, model, year, and fuel first.');
  }
  const created = await apiClient.createJobCard({
    service_offering_slug: opts.offeringSlug,
    vehicle_context: {
      make: opts.vehicle.make as string,
      model: opts.vehicle.model as string,
      year: opts.vehicle.year as number,
      fuel_type: opts.vehicle.fuelType as string,
      transmission: opts.vehicle.transmission as string,
    },
    concerns: [{ text: concernForKind(opts.kind, opts.symptoms) }],
    photo_asset_ids: opts.kind === 'ir' ? opts.photoAssetIds : undefined,
  });
  if (opts.kind === 'gpr') {
    const lines = opts.repairQuantities
      ? Object.entries(opts.repairQuantities)
      : (opts.repairSlugs ?? []).map((slug) => [slug, 1] as const);
    for (const [slug, quantity] of lines) {
      const qty = Number(quantity);
      if (!slug || qty < 1) continue;
      await apiClient.addJobCardItem(created.job_card.id, {
        kind: 'REPAIR',
        repair_offering_slug: slug,
        quantity: Math.min(10, Math.max(1, Math.trunc(qty))),
      });
    }
  }
  return created.job_card.id;
}
