import { create } from "zustand";

interface GameStore {
  selectedPetId: string;
  setSelectedPetId: (selectedPetId: string) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  selectedPetId: "",
  setSelectedPetId: (selectedPetId) => set({ selectedPetId })
}));
