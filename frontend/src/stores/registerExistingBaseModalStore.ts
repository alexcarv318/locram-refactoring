import { create } from "zustand";

type RegisterExistingBaseModalState = {
  isOpen: boolean;
  closeModal: () => void;
  openModal: () => void;
};

export const useRegisterExistingBaseModalStore = create<RegisterExistingBaseModalState>((set) => ({
  isOpen: false,
  closeModal: () => set({ isOpen: false }),
  openModal: () => set({ isOpen: true }),
}));
