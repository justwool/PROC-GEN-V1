export const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uSeed;
uniform vec4 uParams0;
uniform vec4 uParams1;
uniform vec4 uParams2;
uniform vec4 uParams3;
uniform vec4 uParams4;
uniform vec4 uParams5;
uniform vec4 uPalA;
uniform vec4 uPalB;
uniform vec4 uPalC;
uniform vec4 uPalD;

float hash11(float p) {
  return fract(sin(p * 127.1 + 311.7) * 43758.5453123);
}

vec2 rot2(vec2 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c) * p;
}

float layerSignal(
  vec2 p0,
  vec2 sweepCoord,
  float layerIndex,
  float layerSeed,
  float warp,
  float warpPasses,
  float fold,
  float tileMix,
  float tileCount,
  float fRad,
  float fAng,
  float fX,
  float fY,
  float ribbons,
  float sharp
) {
  vec2 p = p0;
  vec2 localSweep = sweepCoord * (1.0 + layerIndex * 0.23);

  for (int w = 0; w < 6; w++) {
    float enabled = step(float(w) + 0.5, warpPasses);
    float fi = 0.8 + float(w) * 0.31 + hash11(layerSeed + float(w) * 1.87) * 3.1 + layerIndex * 0.29;
    float phase = hash11(layerSeed * 0.49 + float(w) * 9.73) * 6.28318;

    vec2 delta = warp * (0.08 + 0.018 * layerIndex) * vec2(
      sin(p.y * fi + phase + localSweep.x * (1.5 + layerIndex * 0.13)),
      cos(p.x * fi + phase * 1.29 + localSweep.y * (1.35 + layerIndex * 0.11))
    );

    delta += warp * 0.05 * vec2(
      sin((p.x + p.y * (1.0 + 0.2 * layerIndex)) * fi * 0.73 + phase),
      cos((p.x - p.y) * fi * 0.58 + phase * 1.2)
    );

    p += delta * enabled;
  }

  vec2 pFold = abs(p);
  p = mix(p, pFold, fold * (0.55 + 0.1 * layerIndex));

  float safeTiles = max(1.0, tileCount + floor(layerIndex * (0.7 + 0.2 * hash11(layerSeed + 19.0))));
  vec2 q = fract(p * safeTiles) - 0.5;
  p = mix(p, q, clamp(tileMix + 0.12 * hash11(layerSeed + 3.0), 0.0, 1.0));

  float aniso = 1.0 + 0.7 * hash11(layerSeed + 21.0);
  p = rot2(p * vec2(aniso, 2.0 - aniso), (hash11(layerSeed + 23.0) - 0.5) * 1.8);

  float r = length(p);
  float a = atan(p.y, p.x);

  float seedA = hash11(layerSeed * 0.91 + 5.1) * 6.28318;
  float seedB = hash11(layerSeed * 1.07 + 8.6) * 6.28318;

  float sRad = sin(r * (fRad + layerIndex * 1.2) + seedA + localSweep.x * 2.7);
  float sAng = cos(a * (fAng + layerIndex * 0.95) + seedB + localSweep.y * 2.8);
  float sAx = sin(p.x * (fX + layerIndex * 0.75) + sRad * 2.0) + cos(p.y * (fY + layerIndex * 0.66) + sAng * 2.0);
  float sDiag = sin((p.x + p.y) * (2.1 + layerIndex * 0.8) + seedA * 0.7);

  float stripe = sin(sAx + sRad + sAng + sDiag * 0.65);
  float t = 0.5 + 0.5 * stripe;
  float ribbon = smoothstep(0.24, 0.76, t);
  float signal = mix(stripe, ribbon * 2.0 - 1.0, clamp(ribbons + 0.12 * hash11(layerSeed + 6.0), 0.0, 1.0));

  return sign(signal) * pow(abs(signal), max(sharp * (0.9 + 0.12 * hash11(layerSeed + 31.0)), 0.001));
}

float blendSignals(float a, float b, float mode) {
  float m0 = 1.0 - step(0.5, abs(mode - 0.0));
  float m1 = 1.0 - step(0.5, abs(mode - 1.0));
  float m2 = 1.0 - step(0.5, abs(mode - 2.0));
  float m3 = 1.0 - step(0.5, abs(mode - 3.0));
  float m4 = 1.0 - step(0.5, abs(mode - 4.0));

  float mixMode = mix(a, b, 0.5);
  float addMode = clamp(a + b * 0.62, -1.0, 1.0);
  float mulMode = clamp(a * b * 1.6, -1.0, 1.0);
  float screenMode = 1.0 - (1.0 - (a * 0.5 + 0.5)) * (1.0 - (b * 0.5 + 0.5));
  screenMode = screenMode * 2.0 - 1.0;
  float maxMode = max(a, b);

  return mixMode * m0 + addMode * m1 + mulMode * m2 + screenMode * m3 + maxMode * m4;
}

void main() {
  vec2 uv = vUv;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);

  float warp = uParams0.x;
  float warpPasses = uParams0.y;
  float fold = uParams0.z;
  float tileMix = uParams0.w;
  float tileCount = uParams1.x;
  float sweep = uParams1.y;
  float fRad = uParams1.z;
  float fAng = uParams1.w;
  float fX = uParams2.x;
  float fY = uParams2.y;
  float ribbons = uParams2.z;
  float sharp = uParams2.w;
  float gloss = uParams3.x;
  float hueShift = uParams3.y;
  float frame = uParams3.z;
  float layers = uParams3.w;
  float smear = uParams4.x;
  float smearTaps = uParams4.y;
  float panels = uParams4.z;
  float panelHard = uParams4.w;
  float steps = uParams5.x;
  float rgbSplit = uParams5.y;
  float blendMode = uParams5.z;
  float frameBands = uParams5.w;

  vec2 sweepCoord = vec2(mix(0.0, p.x, sweep), mix(0.0, p.y, sweep));

  float layerVals[6];
  for (int i = 0; i < 6; i++) {
    float enabled = step(float(i) + 0.5, layers);
    float layerSeed = uSeed + 13.13 * float(i + 1);
    vec2 pi = rot2(p, hash11(layerSeed + 1.0) * 2.4 - 1.2);
    pi += vec2(hash11(layerSeed + 3.0) - 0.5, hash11(layerSeed + 5.0) - 0.5) * 0.34;
    layerVals[i] = layerSignal(pi, sweepCoord, float(i), layerSeed, warp, warpPasses, fold, tileMix, tileCount, fRad, fAng, fX, fY, ribbons, sharp) * enabled;
  }

  float idxBase = floor(hash11(uSeed + floor(uv.x * 13.0) + floor(uv.y * 17.0)) * layers);
  idxBase = clamp(idxBase, 0.0, max(layers - 1.0, 0.0));
  float idxAlt = mod(idxBase + floor(hash11(uSeed + 14.0) * layers + 1.0), max(layers, 1.0));

  float verticalMask = step(abs(uv.x - (0.16 + 0.68 * hash11(uSeed + 21.0))), 0.06 + 0.2 * panelHard);
  vec2 rc = vec2(0.5 + (hash11(uSeed + 22.0) - 0.5) * 0.5, 0.5 + (hash11(uSeed + 23.0) - 0.5) * 0.5);
  vec2 rs = vec2(0.12 + hash11(uSeed + 24.0) * 0.28, 0.12 + hash11(uSeed + 25.0) * 0.28);
  float rectMask = step(abs(uv.x - rc.x), rs.x) * step(abs(uv.y - rc.y), rs.y);
  vec2 gdim = vec2(2.0 + floor(hash11(uSeed + 26.0) * 4.0), 2.0 + floor(hash11(uSeed + 27.0) * 4.0));
  vec2 gc = floor(uv * gdim);
  float gridMask = step(0.5, mod(gc.x + gc.y + floor(hash11(uSeed + 28.0) * 3.0), 2.0));
  float diagMask = step(uv.y, uv.x * (0.5 + hash11(uSeed + 29.0) * 1.0) + (hash11(uSeed + 30.0) - 0.5) * 0.45);
  float ringMask = smoothstep(0.18, 0.22, abs(length(uv - 0.5) - (0.2 + 0.22 * hash11(uSeed + 33.0))));

  float panelEnable0 = step(0.5, panels);
  float panelEnable1 = step(1.5, panels);
  float panelEnable2 = step(2.5, panels);
  float panelEnable3 = step(3.5, panels);

  float mask0 = verticalMask * panelEnable0;
  float mask1 = rectMask * panelEnable1;
  float mask2 = gridMask * panelEnable2;
  float mask3 = (diagMask * 0.75 + ringMask * 0.6) * panelEnable3;

  float hardMix = mix(0.16, 1.0, panelHard);
  float panelMask = clamp(mask0 + mask1 + mask2 + mask3, 0.0, 1.0) * hardMix;

  float selectedA = layerVals[0];
  float selectedB = layerVals[1];
  for (int i = 0; i < 6; i++) {
    float pickA = 1.0 - step(0.5, abs(idxBase - float(i)));
    float pickB = 1.0 - step(0.5, abs(idxAlt - float(i)));
    selectedA += (layerVals[i] - selectedA) * pickA;
    selectedB += (layerVals[i] - selectedB) * pickB;
  }

  float hardSwitch = step(0.5 + 0.3 * hash11(uSeed + 35.0), fract(uv.x * (1.5 + 3.0 * hash11(uSeed + 36.0)) + uv.y * (2.0 + 2.0 * hash11(uSeed + 37.0))));
  float switched = mix(selectedA, selectedB, hardSwitch * panelMask);
  float baseSignal = mix(layerVals[0], switched, panelMask);

  vec2 smearDir = normalize(vec2(cos(hash11(uSeed + 41.0) * 6.28318), sin(hash11(uSeed + 42.0) * 6.28318)) + vec2(0.001));
  float smearAvg = 0.0;
  float smearMax = -10.0;
  float tapDenom = max(smearTaps - 1.0, 1.0);
  for (int t = 0; t < 24; t++) {
    float enabled = step(float(t) + 0.5, smearTaps);
    float f = float(t) / tapDenom - 0.5;
    vec2 sp = p + smearDir * f * smear * (0.18 + 0.38 * hash11(uSeed + 44.0));
    sp += vec2(0.0, sin(f * 12.0 + uSeed * 0.03) * smear * 0.03);
    float sv = layerSignal(sp, sweepCoord, 0.0, uSeed + 51.0, warp, warpPasses, fold, tileMix, tileCount, fRad, fAng, fX, fY, ribbons, sharp);
    smearAvg += sv * enabled;
    smearMax = max(smearMax, mix(-10.0, sv, enabled));
  }
  smearAvg /= max(smearTaps, 1.0);
  float smearUseMax = step(0.5, hash11(uSeed + 47.0));
  float smeared = mix(smearAvg, smearMax, smearUseMax);
  baseSignal = mix(baseSignal, smeared, smear * (0.35 + 0.65 * panelMask));

  float quantMask = clamp(mask1 + mask2 * 0.9 + mask3 * 0.7, 0.0, 1.0);
  if (steps > 0.5) {
    float q = floor((baseSignal * 0.5 + 0.5) * steps) / max(steps, 1.0);
    q = q * 2.0 - 1.0;
    baseSignal = mix(baseSignal, q, quantMask);
  }

  float aux1 = layerVals[1] + sin(layerVals[2] * 3.1415 + panelMask * 2.0) * 0.33;
  float aux2 = layerVals[3] * 0.7 + layerVals[4] * 0.3;
  float aux3 = sin(layerVals[5] * 4.8 + layerVals[2] * 2.9) * 0.6;

  float modeA = blendMode;
  float modeB = mod(blendMode + floor(hash11(uSeed + 70.0) * 4.0), 5.0);
  float modeC = mod(blendMode + floor(hash11(uSeed + 71.0) * 4.0), 5.0);

  float comp = blendSignals(baseSignal, aux1, modeA);
  comp = blendSignals(comp, aux2, modeB);
  comp = blendSignals(comp, aux3, modeC);

  float phaseShift = hueShift + quantMask * (0.12 + 0.45 * hash11(uSeed + 79.0));

  vec2 splitDir = normalize(vec2(cos(hash11(uSeed + 80.0) * 6.28318), sin(hash11(uSeed + 81.0) * 6.28318)) + vec2(0.001));
  vec2 rgbOff = splitDir * rgbSplit * (0.08 + 0.06 * hash11(uSeed + 82.0));

  float sigR = comp + dot(rgbOff, vec2(1.0, -1.0));
  float sigG = comp + (mask2 - 0.5) * rgbSplit * 0.14;
  float sigB = comp - dot(rgbOff, vec2(1.0, -1.0));

  vec3 phase = vec3(sigR, sigG, sigB) + phaseShift;
  vec3 col = uPalA.xyz + uPalB.xyz * cos(6.28318 * (uPalC.xyz * phase + uPalD.xyz));

  float g = length(vec2(dFdx(comp), dFdy(comp)));
  float spec = pow(clamp(g * 2.7, 0.0, 1.0), 1.3) * gloss;
  col += spec * vec3(0.3, 0.22, 0.36);
  col *= 1.0 + spec * 1.24;

  float e = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  for (int b = 0; b < 4; b++) {
    float enabled = step(float(b) + 0.5, frameBands);
    float thick = (0.01 + frame * 0.024) * (1.0 + float(b) * 0.48);
    float start = 0.008 + float(b) * (0.017 + 0.015 * hash11(uSeed + float(b) * 3.7));
    float band = smoothstep(start, start + thick, e) - smoothstep(start + thick, start + thick * (1.65 + 0.2 * hash11(uSeed + float(b) * 6.1)), e);
    float tint = 0.03 + 0.11 * hash11(uSeed + float(b) * 8.3);
    col += vec3(tint, tint * (0.84 + 0.28 * hash11(uSeed + float(b) * 2.2)), tint * 1.12) * band * enabled;
    col *= mix(1.0, 0.73 + 0.11 * float(b), band * enabled);
  }

  float edgeOuter = smoothstep(0.0, 0.032 + frame * 0.08, e);
  col *= mix(0.12, 1.0, edgeOuter);

  col = max(col, vec3(0.0));
  col = pow(col, vec3(1.0 / 2.2));
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;
