import { create } from 'zustand';

export type DetailsDraft = {
  full_name: string;
  phone: string;
  line1: string;
  locality: string;
  city: string;
  postal_code: string;
  latitude?: number;
  longitude?: number;
};

const emptyDetails: DetailsDraft = {
  full_name: '',
  phone: '',
  line1: '',
  locality: '',
  city: '',
  postal_code: '',
};

type JobCardFlowState = {
  activeJobCardId: string | null;
  offeringSlug: string;
  flowKind: 'gs' | 'gpr' | 'oneman' | 'ir';
  detailsDraft: DetailsDraft;
  symptoms: string;
  photoAssetIds: string[];
  lastIrStep: string | null;
  setJobCard: (id: string, offeringSlug?: string) => void;
  setOfferingSlug: (slug: string) => void;
  setFlowKind: (kind: 'gs' | 'gpr' | 'oneman' | 'ir') => void;
  setDetailsDraft: (patch: Partial<DetailsDraft>) => void;
  setSymptoms: (text: string) => void;
  setPhotoAssetIds: (ids: string[]) => void;
  setLastIrStep: (step: string | null) => void;
  clear: () => void;
};

export const useJobCardFlowStore = create<JobCardFlowState>((set) => ({
  activeJobCardId: null,
  offeringSlug: 'general-service-health-report',
  flowKind: 'gs',
  detailsDraft: emptyDetails,
  symptoms: '',
  photoAssetIds: [],
  lastIrStep: null,
  setJobCard: (id, offeringSlug) =>
    set((state) => ({
      activeJobCardId: id,
      offeringSlug: offeringSlug ?? state.offeringSlug,
    })),
  setOfferingSlug: (slug) => set({ offeringSlug: slug }),
  setFlowKind: (kind) => set({ flowKind: kind }),
  setDetailsDraft: (patch) =>
    set((state) => ({ detailsDraft: { ...state.detailsDraft, ...patch } })),
  setSymptoms: (text) => set({ symptoms: text }),
  setPhotoAssetIds: (ids) => set({ photoAssetIds: ids }),
  setLastIrStep: (step) => set({ lastIrStep: step }),
  clear: () =>
    set({
      activeJobCardId: null,
      offeringSlug: 'general-service-health-report',
      flowKind: 'gs',
      detailsDraft: emptyDetails,
      symptoms: '',
      photoAssetIds: [],
      lastIrStep: null,
    }),
}));
