import { clamp, type Range, sampleRange, SeededRng } from './rng';

export type Params = {
  warp: number;
  warpPasses: number;
  fold: number;
  tileMix: number;
  tileCount: number;
  sweep: number;
  fRad: number;
  fAng: number;
  fX: number;
  fY: number;
  ribbons: number;
  sharp: number;
  gloss: number;
  hueShift: number;
  frame: number;
  layers: number;
  smear: number;
  smearTaps: number;
  panels: number;
  panelHard: number;
  steps: number;
  rgbSplit: number;
  blendMode: number;
  frameBands: number;
};

export type Palette = {
  palA: [number, number, number];
  palB: [number, number, number];
  palC: [number, number, number];
  palD: [number, number, number];
};

export type Instance = {
  id: string;
  seed: number;
  presetId: string;
  params: Params;
  palette: Palette;
  parent?: { seed: number; params: Params };
};

type PaletteRanges = {
  palA: [Range, Range, Range];
  palB: [Range, Range, Range];
  palC: [Range, Range, Range];
  palD: [Range, Range, Range];
};

export type Preset = {
  id: string;
  name: string;
  mutationStrength: number;
  paramRanges: Record<keyof Params, Range>;
  paletteRanges: PaletteRanges;
};

const baseParamRanges: Record<keyof Params, Range> = {
  warp: { min: 0, max: 2.5 },
  warpPasses: { min: 3, max: 6 },
  fold: { min: 0, max: 1 },
  tileMix: { min: 0, max: 1 },
  tileCount: { min: 1, max: 14 },
  sweep: { min: 0, max: 1 },
  fRad: { min: 0.5, max: 18 },
  fAng: { min: 0.5, max: 18 },
  fX: { min: 0.5, max: 24 },
  fY: { min: 0.5, max: 24 },
  ribbons: { min: 0, max: 1 },
  sharp: { min: 0.2, max: 3 },
  gloss: { min: 0, max: 1 },
  hueShift: { min: -1, max: 1 },
  frame: { min: 0, max: 1 },
  layers: { min: 2, max: 6 },
  smear: { min: 0, max: 1 },
  smearTaps: { min: 6, max: 24 },
  panels: { min: 0, max: 4 },
  panelHard: { min: 0, max: 1 },
  steps: { min: 0, max: 64 },
  rgbSplit: { min: 0, max: 1 },
  blendMode: { min: 0, max: 4 },
  frameBands: { min: 1, max: 4 }
};

const paletteStableIridescent: PaletteRanges = {
  palA: [{ min: 0.38, max: 0.58 }, { min: 0.35, max: 0.56 }, { min: 0.4, max: 0.62 }],
  palB: [{ min: 0.3, max: 0.58 }, { min: 0.25, max: 0.5 }, { min: 0.35, max: 0.6 }],
  palC: [{ min: 0.65, max: 1.5 }, { min: 0.75, max: 1.65 }, { min: 0.6, max: 1.45 }],
  palD: [{ min: 0.05, max: 0.95 }, { min: 0.15, max: 1.1 }, { min: 0.05, max: 1.2 }]
};

const mergeRanges = (partial: Partial<Record<keyof Params, Range>>): Record<keyof Params, Range> => ({
  ...baseParamRanges,
  ...partial
});

export const PRESETS: Preset[] = [
  {
    id: 'liquid-ribbons',
    name: 'Liquid Ribbons',
    mutationStrength: 0.11,
    paramRanges: mergeRanges({
      warp: { min: 1.25, max: 2.4 },
      fold: { min: 0.0, max: 0.35 },
      tileMix: { min: 0.0, max: 0.25 },
      sweep: { min: 0.1, max: 0.5 },
      ribbons: { min: 0.62, max: 1.0 },
      gloss: { min: 0.42, max: 1.0 },
      layers: { min: 3, max: 6 },
      smear: { min: 0.2, max: 0.85 },
      smearTaps: { min: 8, max: 24 },
      panels: { min: 1, max: 3 },
      panelHard: { min: 0.35, max: 0.9 },
      steps: { min: 0, max: 26 },
      rgbSplit: { min: 0.05, max: 0.35 },
      blendMode: { min: 0, max: 3 },
      frameBands: { min: 2, max: 4 }
    }),
    paletteRanges: paletteStableIridescent
  },
  {
    id: 'panel-drift',
    name: 'Panel Drift',
    mutationStrength: 0.14,
    paramRanges: mergeRanges({
      warp: { min: 0.7, max: 1.7 },
      fold: { min: 0.25, max: 0.72 },
      tileMix: { min: 0.25, max: 0.72 },
      tileCount: { min: 6, max: 14 },
      sweep: { min: 0.28, max: 0.72 },
      gloss: { min: 0.35, max: 0.8 },
      layers: { min: 3, max: 6 },
      smear: { min: 0.35, max: 1.0 },
      smearTaps: { min: 10, max: 24 },
      panels: { min: 2, max: 4 },
      panelHard: { min: 0.65, max: 1.0 },
      steps: { min: 6, max: 48 },
      rgbSplit: { min: 0.0, max: 0.25 },
      blendMode: { min: 0, max: 4 },
      frameBands: { min: 2, max: 4 }
    }),
    paletteRanges: paletteStableIridescent
  },
  {
    id: 'sweep-strata',
    name: 'Sweep Strata',
    mutationStrength: 0.1,
    paramRanges: mergeRanges({
      sweep: { min: 0.62, max: 1.0 },
      warp: { min: 0.7, max: 1.7 },
      fold: { min: 0.1, max: 0.55 },
      tileMix: { min: 0.0, max: 0.28 },
      ribbons: { min: 0.35, max: 0.75 },
      gloss: { min: 0.3, max: 0.75 },
      layers: { min: 3, max: 5 },
      smear: { min: 0.15, max: 0.55 },
      smearTaps: { min: 6, max: 18 },
      panels: { min: 1, max: 3 },
      panelHard: { min: 0.4, max: 0.85 },
      steps: { min: 14, max: 64 },
      rgbSplit: { min: 0.05, max: 0.4 },
      blendMode: { min: 0, max: 2 },
      frameBands: { min: 1, max: 4 }
    }),
    paletteRanges: paletteStableIridescent
  },
  {
    id: 'hard-fold-gloss',
    name: 'Hard Fold Gloss',
    mutationStrength: 0.12,
    paramRanges: mergeRanges({
      fold: { min: 0.62, max: 1.0 },
      warp: { min: 0.75, max: 1.8 },
      tileMix: { min: 0.15, max: 0.5 },
      ribbons: { min: 0.6, max: 1.0 },
      sharp: { min: 1.2, max: 3.0 },
      gloss: { min: 0.62, max: 1.0 },
      layers: { min: 2, max: 5 },
      smear: { min: 0.05, max: 0.45 },
      smearTaps: { min: 6, max: 14 },
      panels: { min: 1, max: 4 },
      panelHard: { min: 0.75, max: 1.0 },
      steps: { min: 10, max: 56 },
      rgbSplit: { min: 0.0, max: 0.2 },
      blendMode: { min: 2, max: 4 },
      frameBands: { min: 2, max: 4 }
    }),
    paletteRanges: paletteStableIridescent
  },
  {
    id: 'soft-bloom',
    name: 'Soft Bloom',
    mutationStrength: 0.08,
    paramRanges: mergeRanges({
      warp: { min: 0.55, max: 1.45 },
      fold: { min: 0, max: 0.28 },
      tileMix: { min: 0, max: 0.22 },
      ribbons: { min: 0.25, max: 0.6 },
      sharp: { min: 0.2, max: 1.1 },
      gloss: { min: 0.1, max: 0.62 },
      layers: { min: 2, max: 4 },
      smear: { min: 0.2, max: 0.75 },
      smearTaps: { min: 10, max: 24 },
      panels: { min: 0, max: 2 },
      panelHard: { min: 0.15, max: 0.55 },
      steps: { min: 0, max: 22 },
      rgbSplit: { min: 0.1, max: 0.55 },
      blendMode: { min: 0, max: 1 },
      frameBands: { min: 1, max: 3 }
    }),
    paletteRanges: paletteStableIridescent
  },
  {
    id: 'dense-interference',
    name: 'Dense Interference',
    mutationStrength: 0.16,
    paramRanges: mergeRanges({
      fX: { min: 8, max: 24 },
      fY: { min: 8, max: 24 },
      fRad: { min: 6, max: 18 },
      fAng: { min: 6, max: 18 },
      warp: { min: 0.75, max: 1.8 },
      ribbons: { min: 0.4, max: 0.85 },
      sharp: { min: 0.95, max: 2.7 },
      layers: { min: 4, max: 6 },
      smear: { min: 0.2, max: 0.8 },
      smearTaps: { min: 12, max: 24 },
      panels: { min: 1, max: 4 },
      panelHard: { min: 0.45, max: 0.95 },
      steps: { min: 12, max: 64 },
      rgbSplit: { min: 0.0, max: 0.45 },
      blendMode: { min: 0, max: 4 },
      frameBands: { min: 2, max: 4 }
    }),
    paletteRanges: paletteStableIridescent
  }
];

const PARAM_KEYS = Object.keys(baseParamRanges) as (keyof Params)[];
const STRUCTURAL_KEYS: (keyof Params)[] = ['fold', 'tileMix', 'sweep'];
const INTEGER_KEYS: (keyof Params)[] = ['warpPasses', 'tileCount', 'layers', 'smearTaps', 'panels', 'steps', 'blendMode', 'frameBands'];

export const sampleParams = (preset: Preset, rng: SeededRng): Params => {
  const params = {} as Params;
  for (const key of PARAM_KEYS) {
    params[key] = sampleRange(rng, preset.paramRanges[key], INTEGER_KEYS.includes(key));
  }
  return params;
};

export const samplePalette = (preset: Preset, rng: SeededRng): Palette => {
  const fromRanges = (ranges: [Range, Range, Range]): [number, number, number] => [
    sampleRange(rng, ranges[0]),
    sampleRange(rng, ranges[1]),
    sampleRange(rng, ranges[2])
  ];

  return {
    palA: fromRanges(preset.paletteRanges.palA),
    palB: fromRanges(preset.paletteRanges.palB),
    palC: fromRanges(preset.paletteRanges.palC),
    palD: fromRanges(preset.paletteRanges.palD)
  };
};

export const mutateParams = (parent: Params, preset: Preset, rng: SeededRng): Params => {
  const child = { ...parent };
  for (const key of PARAM_KEYS) {
    const range = preset.paramRanges[key];
    const span = range.max - range.min;
    const jitter = (rng.next() * 2 - 1) * span * preset.mutationStrength;
    child[key] = clamp(parent[key] + jitter, range.min, range.max);
    if (INTEGER_KEYS.includes(key)) {
      child[key] = Math.round(child[key]);
    }
  }

  const nudged = rng.pick(STRUCTURAL_KEYS);
  const range = preset.paramRanges[nudged];
  const span = range.max - range.min;
  child[nudged] = clamp(child[nudged] + (rng.next() * 2 - 1) * span * preset.mutationStrength * 2.4, range.min, range.max);

  return child;
};
