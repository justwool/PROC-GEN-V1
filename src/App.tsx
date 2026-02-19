import { useEffect, useMemo, useRef, useState } from 'react';
import { PRESETS, mutateParams, samplePalette, sampleParams, type Instance, type Params, type Preset } from './core/presets';
import { clamp, hashSeed, makeInstanceId, SeededRng } from './core/rng';
import { ProcgenRenderer } from './core/renderer';

type Thumb = {
  instance: Instance;
  image: string;
};

const THUMB_COUNT = 24;
const THUMB_SIZE = 256;
const PREVIEW_SIZE = 1024;

const DIVERSE_KEYS: (keyof Params)[] = ['layers', 'panels', 'steps', 'smear', 'smearTaps', 'blendMode', 'rgbSplit', 'tileMix', 'fold', 'fRad', 'fAng', 'fX', 'fY'];

const makeSeedFromNow = (): number => (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;

const remap = (t: number, min: number, max: number): number => min + (max - min) * t;

const setByRange = (params: Params, preset: Preset, key: keyof Params, value01: number, integer = false): void => {
  const range = preset.paramRanges[key];
  const value = remap(clamp(value01, 0, 1), range.min, range.max);
  params[key] = integer ? Math.round(value) : value;
};

const diversifyParams = (params: Params, preset: Preset, i: number, rng: SeededRng): Params => {
  const next = { ...params };
  const row = Math.floor(i / 6);
  const col = i % 6;
  const zig = (col % 2 === 0 ? 1 : -1) * (row % 2 === 0 ? 1 : -1);

  setByRange(next, preset, 'layers', row / 3, true);
  setByRange(next, preset, 'panels', col / 5, true);
  setByRange(next, preset, 'frameBands', ((row + col) % 4) / 3, true);
  setByRange(next, preset, 'blendMode', (i % 5) / 4, true);
  setByRange(next, preset, 'steps', ((row * 2 + col) % 12) / 11, true);
  setByRange(next, preset, 'smear', (col / 5) * 0.65 + (rng.next() * 0.35));
  setByRange(next, preset, 'smearTaps', (row / 3) * 0.6 + rng.next() * 0.4, true);
  setByRange(next, preset, 'rgbSplit', ((5 - col) / 5) * 0.55 + rng.next() * 0.45);
  setByRange(next, preset, 'tileMix', (row / 3) * 0.5 + ((col + 1) / 6) * 0.5);
  setByRange(next, preset, 'fold', ((3 - row) / 3) * 0.55 + rng.next() * 0.45);
  setByRange(next, preset, 'fRad', (i % THUMB_COUNT) / (THUMB_COUNT - 1));
  setByRange(next, preset, 'fAng', ((i * 7) % THUMB_COUNT) / (THUMB_COUNT - 1));
  setByRange(next, preset, 'fX', ((i * 11) % THUMB_COUNT) / (THUMB_COUNT - 1));
  setByRange(next, preset, 'fY', ((i * 17) % THUMB_COUNT) / (THUMB_COUNT - 1));

  next.hueShift = clamp(next.hueShift + zig * 0.2 + (rng.next() * 2 - 1) * 0.15, preset.paramRanges.hueShift.min, preset.paramRanges.hueShift.max);
  next.sweep = clamp(next.sweep + (row - 1.5) * 0.12 + (rng.next() * 2 - 1) * 0.08, preset.paramRanges.sweep.min, preset.paramRanges.sweep.max);

  return next;
};

const diversifyMutation = (params: Params, parent: Params, preset: Preset, i: number, rng: SeededRng): Params => {
  const next = { ...params };
  const row = Math.floor(i / 6);
  const col = i % 6;

  for (const key of DIVERSE_KEYS) {
    const range = preset.paramRanges[key];
    const span = range.max - range.min;
    const drift = (rng.next() * 2 - 1) * span * (preset.mutationStrength * 0.9);
    next[key] = clamp(next[key] + drift, range.min, range.max);
  }

  const panelBias = col / 5;
  const smearBias = row / 3;
  setByRange(next, preset, 'blendMode', (i % 5) / 4, true);
  setByRange(next, preset, 'panels', panelBias, true);
  setByRange(next, preset, 'smear', clamp((parent.smear * 0.45 + smearBias * 0.55), 0, 1));
  setByRange(next, preset, 'steps', clamp((parent.steps / 64) * 0.4 + ((row + col) % 6) / 5 * 0.6, 0, 1), true);

  return next;
};

const generateBatch = (preset: Preset): Instance[] => {
  const batchSeed = makeSeedFromNow();
  return Array.from({ length: THUMB_COUNT }, (_, i) => {
    const seed = hashSeed(batchSeed, i + 1);
    const localRng = new SeededRng(seed);
    return {
      id: makeInstanceId(seed, preset.id),
      seed,
      presetId: preset.id,
      params: diversifyParams(sampleParams(preset, localRng), preset, i, localRng),
      palette: samplePalette(preset, localRng)
    };
  });
};

const mutateBatch = (selected: Instance, preset: Preset): Instance[] =>
  Array.from({ length: THUMB_COUNT }, (_, i) => {
    const seed = hashSeed(selected.seed, i + 1);
    const rng = new SeededRng(seed);
    return {
      id: makeInstanceId(seed, preset.id),
      seed,
      presetId: preset.id,
      params: diversifyMutation(mutateParams(selected.params, preset, rng), selected.params, preset, i, rng),
      palette: samplePalette(preset, rng),
      parent: { seed: selected.seed, params: selected.params }
    };
  });

export default function App() {
  const rendererRef = useRef<ProcgenRenderer | null>(null);
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [thumbs, setThumbs] = useState<Thumb[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [preview, setPreview] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const preset = useMemo(() => PRESETS.find((item) => item.id === presetId) ?? PRESETS[0], [presetId]);
  const selected = useMemo(() => thumbs.find((thumb) => thumb.instance.id === selectedId)?.instance, [selectedId, thumbs]);

  useEffect(() => {
    rendererRef.current = new ProcgenRenderer();
    return () => rendererRef.current?.dispose();
  }, []);

  const renderInstances = (instances: Instance[]) => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    setBusy(true);
    requestAnimationFrame(() => {
      const nextThumbs = instances.map((instance) => ({
        instance,
        image: renderer.renderToDataUrl(instance, THUMB_SIZE)
      }));
      setThumbs(nextThumbs);
      setSelectedId(nextThumbs[0]?.instance.id ?? '');
      setPreview(nextThumbs[0] ? renderer.renderToDataUrl(nextThumbs[0].instance, PREVIEW_SIZE) : '');
      setBusy(false);
    });
  };

  const handleGenerate = () => {
    renderInstances(generateBatch(preset));
  };

  const handleMutate = () => {
    if (!selected) return;
    renderInstances(mutateBatch(selected, preset));
  };

  const handleSelect = (instance: Instance) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    setSelectedId(instance.id);
    setPreview(renderer.renderToDataUrl(instance, PREVIEW_SIZE));
  };

  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  return (
    <main className="app">
      <header className="controls">
        <h1>PROC-GEN-V1</h1>
        <label>
          Preset
          <select value={presetId} onChange={(event) => setPresetId(event.target.value)}>
            {PRESETS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button onClick={handleGenerate} disabled={busy}>
          Generate (24)
        </button>
        <button onClick={handleMutate} disabled={!selected || busy}>
          Mutate Selected (24)
        </button>
      </header>

      <section className="preview-wrap">
        {preview ? <img className="preview" src={preview} alt="Selected preview" /> : <div className="placeholder">Select an image</div>}
      </section>

      <section className="grid">
        {thumbs.map(({ instance, image }) => (
          <button
            key={instance.id}
            className={`thumb-card ${selectedId === instance.id ? 'selected' : ''}`}
            onClick={() => handleSelect(instance)}
          >
            <img src={image} alt={`${instance.presetId} ${instance.seed}`} width={THUMB_SIZE} height={THUMB_SIZE} />
            <div className="meta">{preset.name}</div>
            <div className="meta">seed: {instance.seed}</div>
          </button>
        ))}
      </section>
    </main>
  );
}
