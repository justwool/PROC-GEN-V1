import { useEffect, useMemo, useRef, useState } from 'react';
import { PRESETS, mutateParams, samplePalette, sampleParams, type Instance, type Preset } from './core/presets';
import { hashSeed, makeInstanceId, SeededRng } from './core/rng';
import { ProcgenRenderer } from './core/renderer';

type Thumb = {
  instance: Instance;
  image: string;
};

const THUMB_COUNT = 24;
const THUMB_SIZE = 256;
const PREVIEW_SIZE = 1024;

const makeSeedFromNow = (): number => (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;

const generateBatch = (preset: Preset): Instance[] => {
  const rng = new SeededRng(makeSeedFromNow());
  return Array.from({ length: THUMB_COUNT }, () => {
    const seed = hashSeed(makeSeedFromNow(), Math.floor(rng.next() * 1e6));
    const localRng = new SeededRng(seed);
    return {
      id: makeInstanceId(seed, preset.id),
      seed,
      presetId: preset.id,
      params: sampleParams(preset, localRng),
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
      params: mutateParams(selected.params, preset, rng),
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
