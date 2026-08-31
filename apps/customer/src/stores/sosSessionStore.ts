import { create } from 'zustand';

type SosSessionState = {
  activeTicketId: string | null;
  setActiveTicketId: (id: string | null) => void;
};

export const useSosSessionStore = create<SosSessionState>((set) => ({
  activeTicketId: null,
  setActiveTicketId: (id) => set({ activeTicketId: id }),
}));
