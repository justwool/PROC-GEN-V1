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

float layerSignal(vec2 p0, vec2 sweepCoord, float layerIndex, float layerSeed, float warp, float warpPasses, float fold, float tileMix, float tileCount, float fRad, float fAng, float fX, float fY, float ribbons, float sharp) {
  vec2 p = p0;
  vec2 localSweep = sweepCoord * (1.0 + layerIndex * 0.23);

  for (int w = 0; w < 6; w++) {
    float enabled = step(float(w) + 0.5, warpPasses);
    float fi = 0.85 + float(w) * 0.33 + hash11(layerSeed + float(w) * 1.87) * 2.9 + layerIndex * 0.31;
    float phase = hash11(layerSeed * 0.49 + float(w) * 9.73) * 6.28318;

    vec2 delta = warp * (0.08 + 0.015 * layerIndex) * vec2(
      sin(p.y * fi + phase + localSweep.x * (1.6 + layerIndex * 0.15)),
      cos(p.x * fi + phase * 1.29 + localSweep.y * (1.4 + layerIndex * 0.12))
    );

    delta += warp * 0.045 * vec2(
      sin((p.x + p.y * (1.0 + 0.2 * layerIndex)) * fi * 0.73 + phase),
      cos((p.x - p.y) * fi * 0.58 + phase * 1.2)
    );

    p += delta * enabled;
  }

  vec2 pFold = abs(p);
  p = mix(p, pFold, fold * (0.6 + 0.1 * layerIndex));

  float safeTiles = max(1.0, tileCount + floor(layerIndex * 0.7));
  vec2 q = fract(p * safeTiles) - 0.5;
  p = mix(p, q, clamp(tileMix + 0.1 * hash11(layerSeed), 0.0, 1.0));

  float r = length(p * vec2(1.0 + 0.4 * hash11(layerSeed + 2.0), 1.0 + 0.4 * hash11(layerSeed + 4.0)));
  float a = atan(p.y, p.x);

  float seedA = hash11(layerSeed * 0.91 + 5.1) * 6.28318;
  float seedB = hash11(layerSeed * 1.07 + 8.6) * 6.28318;

  float sRad = sin(r * (fRad + layerIndex * 1.1) + seedA + localSweep.x * 2.7);
  float sAng = cos(a * (fAng + layerIndex * 0.9) + seedB + localSweep.y * 2.8);
  float sAx = sin(p.x * (fX + layerIndex * 0.8) + sRad * 2.0) + cos(p.y * (fY + layerIndex * 0.65) + sAng * 2.0);

  float stripe = sin(sAx + sRad + sAng + sin((p.x + p.y) * (2.1 + layerIndex)) * 0.5);
  float t = 0.5 + 0.5 * stripe;
  float ribbon = smoothstep(0.28, 0.72, t);
  float signal = mix(stripe, ribbon * 2.0 - 1.0, clamp(ribbons + 0.08 * hash11(layerSeed + 6.0), 0.0, 1.0));

  return sign(signal) * pow(abs(signal), max(sharp, 0.001));
}

float blendSignals(float a, float b, float mode) {
  float m0 = 1.0 - step(0.5, abs(mode - 0.0));
  float m1 = 1.0 - step(0.5, abs(mode - 1.0));
  float m2 = 1.0 - step(0.5, abs(mode - 2.0));
  float m3 = 1.0 - step(0.5, abs(mode - 3.0));
  float m4 = 1.0 - step(0.5, abs(mode - 4.0));

  float mixMode = mix(a, b, 0.5);
  float addMode = clamp(a + b * 0.55, -1.0, 1.0);
  float mulMode = clamp(a * b * 1.45, -1.0, 1.0);
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
    vec2 pi = rot2(p, hash11(layerSeed + 1.0) * 2.2 - 1.1);
    pi += vec2(hash11(layerSeed + 3.0) - 0.5, hash11(layerSeed + 5.0) - 0.5) * 0.28;
    layerVals[i] = layerSignal(pi, sweepCoord, float(i), layerSeed, warp, warpPasses, fold, tileMix, tileCount, fRad, fAng, fX, fY, ribbons, sharp) * enabled;
  }

  float idx = floor(hash11(uSeed + floor(uv.x * 13.0) + floor(uv.y * 17.0)) * layers);
  idx = clamp(idx, 0.0, max(layers - 1.0, 0.0));

  float verticalMask = step(abs(uv.x - (0.2 + 0.6 * hash11(uSeed + 21.0))), 0.08 + 0.16 * panelHard);
  vec2 rc = vec2(0.5 + (hash11(uSeed + 22.0) - 0.5) * 0.4, 0.5 + (hash11(uSeed + 23.0) - 0.5) * 0.4);
  vec2 rs = vec2(0.18 + hash11(uSeed + 24.0) * 0.2, 0.14 + hash11(uSeed + 25.0) * 0.22);
  float rectMask = step(abs(uv.x - rc.x), rs.x) * step(abs(uv.y - rc.y), rs.y);
  vec2 gc = floor(uv * vec2(2.0 + floor(hash11(uSeed + 26.0) * 3.0), 2.0 + floor(hash11(uSeed + 27.0) * 3.0)));
  float gridMask = step(0.5, mod(gc.x + gc.y + floor(hash11(uSeed + 28.0) * 2.0), 2.0));
  float diagMask = step(uv.y, uv.x * (0.55 + hash11(uSeed + 29.0) * 0.8) + (hash11(uSeed + 30.0) - 0.5) * 0.4);

  float panelEnable0 = step(0.5, panels);
  float panelEnable1 = step(1.5, panels);
  float panelEnable2 = step(2.5, panels);
  float panelEnable3 = step(3.5, panels);

  float mask0 = verticalMask * panelEnable0;
  float mask1 = rectMask * panelEnable1;
  float mask2 = gridMask * panelEnable2;
  float mask3 = diagMask * panelEnable3;

  float hardMix = mix(0.2, 1.0, panelHard);
  float panelMask = clamp(mask0 + mask1 + mask2 + mask3, 0.0, 1.0) * hardMix;

  float selected = layerVals[0];
  for (int i = 0; i < 6; i++) {
    float pick = 1.0 - step(0.5, abs(idx - float(i)));
    selected += (layerVals[i] - selected) * pick;
  }

  float baseSignal = mix(layerVals[0], selected, panelMask);

  vec2 smearDir = normalize(vec2(cos(hash11(uSeed + 41.0) * 6.28318), sin(hash11(uSeed + 42.0) * 6.28318)) + vec2(0.001));
  float smearAvg = 0.0;
  float smearMax = -10.0;
  float tapDenom = max(smearTaps - 1.0, 1.0);
  for (int t = 0; t < 24; t++) {
    float enabled = step(float(t) + 0.5, smearTaps);
    float f = float(t) / tapDenom - 0.5;
    vec2 sp = p + smearDir * f * smear * (0.22 + 0.25 * hash11(uSeed + 44.0));
    float sv = layerSignal(sp, sweepCoord, 0.0, uSeed + 51.0, warp, warpPasses, fold, tileMix, tileCount, fRad, fAng, fX, fY, ribbons, sharp);
    smearAvg += sv * enabled;
    smearMax = max(smearMax, mix(-10.0, sv, enabled));
  }
  smearAvg /= max(smearTaps, 1.0);
  float smearUseMax = step(0.5, hash11(uSeed + 47.0));
  float smeared = mix(smearAvg, smearMax, smearUseMax);
  baseSignal = mix(baseSignal, smeared, smear * (0.4 + 0.6 * panelMask));

  float quantMask = clamp(mask1 + mask2 * 0.8 + mask3 * 0.6, 0.0, 1.0);
  if (steps > 0.5) {
    float q = floor((baseSignal * 0.5 + 0.5) * steps) / max(steps, 1.0);
    q = q * 2.0 - 1.0;
    baseSignal = mix(baseSignal, q, quantMask);
  }

  float aux1 = layerVals[1] + sin(layerVals[2] * 3.1415 + panelMask * 2.0) * 0.25;
  float aux2 = layerVals[3] * 0.7 + layerVals[4] * 0.3;
  float comp = blendSignals(baseSignal, aux1, blendMode);
  comp = blendSignals(comp, aux2, mod(blendMode + floor(hash11(uSeed + 70.0) * 3.0), 5.0));

  float phaseShift = hueShift + quantMask * (0.12 + 0.35 * hash11(uSeed + 79.0));

  vec2 splitDir = normalize(vec2(cos(hash11(uSeed + 80.0) * 6.28318), sin(hash11(uSeed + 81.0) * 6.28318)) + vec2(0.001));
  vec2 rgbOff = splitDir * rgbSplit * 0.08;

  float sigR = comp + dot(rgbOff, vec2(1.0, -1.0));
  float sigG = comp;
  float sigB = comp - dot(rgbOff, vec2(1.0, -1.0));

  vec3 phase = vec3(sigR, sigG, sigB) + phaseShift;
  vec3 col = uPalA.xyz + uPalB.xyz * cos(6.28318 * (uPalC.xyz * phase + uPalD.xyz));

  float g = length(vec2(dFdx(comp), dFdy(comp)));
  float spec = pow(clamp(g * 2.5, 0.0, 1.0), 1.35) * gloss;
  col += spec * vec3(0.28, 0.2, 0.34);
  col *= 1.0 + spec * 1.18;

  float e = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  for (int b = 0; b < 4; b++) {
    float enabled = step(float(b) + 0.5, frameBands);
    float thick = (0.011 + frame * 0.02) * (1.0 + float(b) * 0.5);
    float start = 0.008 + float(b) * (0.018 + 0.014 * hash11(uSeed + float(b) * 3.7));
    float band = smoothstep(start, start + thick, e) - smoothstep(start + thick, start + thick * 1.75, e);
    float tint = 0.04 + 0.08 * hash11(uSeed + float(b) * 8.3);
    col += vec3(tint, tint * 0.9, tint * 1.1) * band * enabled;
    col *= mix(1.0, 0.76 + 0.08 * float(b), band * enabled);
  }

  float edgeOuter = smoothstep(0.0, 0.03 + frame * 0.08, e);
  col *= mix(0.16, 1.0, edgeOuter);

  col = max(col, vec3(0.0));
  col = pow(col, vec3(1.0 / 2.2));
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;
