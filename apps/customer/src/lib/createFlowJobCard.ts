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
    for (const slug of opts.repairSlugs ?? []) {
      await apiClient.addJobCardItem(created.job_card.id, {
        kind: 'REPAIR',
        repair_offering_slug: slug,
        quantity: 1,
      });
    }
  }
  return created.job_card.id;
}
