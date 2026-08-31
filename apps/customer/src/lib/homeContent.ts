import type { CatalogHomeResponse } from '@caratom/contracts';

import { colors } from '../theme/tokens';

import type { ModeTabId } from './modeTabs';

export type TabPresentation = {
  tab: ModeTabId;
  policyNote: string | null;
  policyTone: 'brand' | 'warn' | null;
  priceLabel: string | null;
  ctaLabel: string | null;
  ctaTone: 'brand' | 'warning' | 'sos';
  tabAccent: string;
};

export function priceLabelFromOffering(catalog: CatalogHomeResponse): string {
  const price = catalog.sections.general_service.offering.display_price;
  return price.label ?? `From ₹${Math.round(price.amount_minor / 100)}`;
}

export function tabAccentColor(tab: ModeTabId): string {
  return tab === 'sos' ? colors.sosAccent : colors.brand;
}

/** UX copy only. Never maps a tab id onto `flow_policy`. */
export function presentationForTab(
  tab: ModeTabId,
  catalog: CatalogHomeResponse,
): TabPresentation {
  const offering = catalog.sections.general_service.offering;
  const priceLabel = priceLabelFromOffering(catalog);

  switch (tab) {
    case 'general':
      return {
        tab,
        policyNote: offering.policy_note,
        policyTone: 'brand',
        priceLabel,
        ctaLabel: 'Start job card',
        ctaTone: 'brand',
        tabAccent: colors.brand,
      };
    case 'repair':
      return {
        tab,
        policyNote: catalog.sections.service_repair_entry.policy_note_warn,
        policyTone: 'warn',
        priceLabel,
        ctaLabel: catalog.sections.service_repair_entry.cta_label,
        ctaTone: 'brand',
        tabAccent: colors.brand,
      };
    case 'oneman':
      return {
        tab,
        policyNote: 'Direct book · no advisor for listed jobs',
        policyTone: 'brand',
        priceLabel: null,
        ctaLabel: null,
        ctaTone: 'brand',
        tabAccent: colors.brand,
      };
    case 'sos':
      return {
        tab,
        policyNote: null,
        policyTone: null,
        priceLabel: null,
        ctaLabel: 'Get help now',
        ctaTone: 'sos',
        tabAccent: colors.sosAccent,
      };
  }
}
