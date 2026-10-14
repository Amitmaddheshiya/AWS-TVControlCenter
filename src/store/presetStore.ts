import { create } from 'zustand';
import { DeploymentPreset } from '../types';

interface PresetState {
  presets: DeploymentPreset[];
  addPreset: (preset: DeploymentPreset) => void;
  updatePreset: (presetId: string, updates: Partial<DeploymentPreset>) => void;
  removePreset: (presetId: string) => void;
  getPreset: (presetId: string) => DeploymentPreset | undefined;
}

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: [
    {
      id: 'full-cleanup',
      name: 'Full TV Cleanup & Reboot',
      steps: []
    }
  ],
  addPreset: (preset) => set((state) => ({ presets: [...state.presets, preset] })),
  updatePreset: (presetId, updates) => set((state) => ({
    presets: state.presets.map(p => p.id === presetId ? { ...p, ...updates } : p)
  })),
  removePreset: (presetId) => set((state) => ({ presets: state.presets.filter(p => p.id !== presetId) })),
  getPreset: (presetId) => get().presets.find(p => p.id === presetId),
}));
