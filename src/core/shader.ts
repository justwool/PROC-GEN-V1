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
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c) * p;
}

float boxSdf(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float panelLines(vec2 uv, float densX, float densY, float soft) {
  float lx = smoothstep(0.5, 0.5 - soft, abs(fract(uv.x * densX) - 0.5));
  float ly = smoothstep(0.5, 0.5 - soft, abs(fract(uv.y * densY) - 0.5));
  return max(lx, ly);
}

float layeredField(vec2 p0, float seed, float warp, float warpPasses, float fX, float fY, float fRad, float fAng, float ribbons, float sharp) {
  vec2 p = p0;

  for (int i = 0; i < 6; i++) {
    float enabled = step(float(i) + 0.5, warpPasses);
    float fi = 0.8 + float(i) * 0.4 + hash11(seed + float(i) * 3.1) * 2.5;
    float ph = hash11(seed * 0.7 + float(i) * 5.9) * 6.28318;
    vec2 d = warp * 0.08 * vec2(
      sin(p.y * fi + ph),
      cos(p.x * fi + ph * 1.2)
    );
    d += warp * 0.045 * vec2(
      sin((p.x + p.y) * fi * 0.7 + ph),
      cos((p.x - p.y) * fi * 0.6 + ph)
    );
    p += d * enabled;
  }

  float r = length(p);
  float a = atan(p.y, p.x);
  float sRad = sin(r * fRad + hash11(seed + 19.0) * 6.28318);
  float sAng = cos(a * fAng + hash11(seed + 23.0) * 6.28318);
  float sAx = sin(p.x * fX + sRad * 2.0) + cos(p.y * fY + sAng * 2.0);
  float stripe = sin(sAx + sRad + sAng);
  float ribbon = smoothstep(0.3, 0.7, 0.5 + 0.5 * stripe) * 2.0 - 1.0;
  float sig = mix(stripe, ribbon, ribbons);
  return sign(sig) * pow(abs(sig), max(0.001, sharp));
}

float pickSignal(float idx, float a, float b, float c, float d, float e, float f) {
  float s = a;
  s += (b - s) * (1.0 - step(0.5, abs(idx - 1.0)));
  s += (c - s) * (1.0 - step(0.5, abs(idx - 2.0)));
  s += (d - s) * (1.0 - step(0.5, abs(idx - 3.0)));
  s += (e - s) * (1.0 - step(0.5, abs(idx - 4.0)));
  s += (f - s) * (1.0 - step(0.5, abs(idx - 5.0)));
  return s;
}

float blendModeFn(float x, float y, float mode) {
  float m0 = 1.0 - step(0.5, abs(mode - 0.0));
  float m1 = 1.0 - step(0.5, abs(mode - 1.0));
  float m2 = 1.0 - step(0.5, abs(mode - 2.0));
  float m3 = 1.0 - step(0.5, abs(mode - 3.0));
  float m4 = 1.0 - step(0.5, abs(mode - 4.0));

  float mixV = mix(x, y, 0.5);
  float addV = clamp(x + y * 0.65, -1.0, 1.0);
  float mulV = clamp(x * y * 1.7, -1.0, 1.0);
  float screen = 1.0 - (1.0 - (x * 0.5 + 0.5)) * (1.0 - (y * 0.5 + 0.5));
  screen = screen * 2.0 - 1.0;
  float maxV = max(x, y);
  return mixV * m0 + addV * m1 + mulV * m2 + screen * m3 + maxV * m4;
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

  // Inner framed canvas (portrait or landscape) with black surround
  float artAspect = mix(0.55, 2.1, hash11(uSeed + 300.0));
  vec2 fit = vec2(1.0, 1.0);
  if (artAspect > 1.0) {
    fit.y = 1.0 / artAspect;
  } else {
    fit.x = artAspect;
  }

  vec2 artUv = (uv - 0.5) / fit + 0.5;
  vec2 ap = artUv * 2.0 - 1.0;
  ap.x *= uResolution.x / max(uResolution.y, 1.0);
  float inside = step(0.0, artUv.x) * step(0.0, artUv.y) * step(artUv.x, 1.0) * step(artUv.y, 1.0);

  vec2 sweepCoord = vec2(mix(0.0, ap.x, sweep), mix(0.0, ap.y, sweep));

  float s0 = layeredField(ap + vec2(-0.15, 0.07), uSeed + 11.0, warp, warpPasses, fX, fY, fRad, fAng, ribbons, sharp);
  float s1 = layeredField(rot2(ap, 0.35), uSeed + 29.0, warp, warpPasses, fX * 0.9, fY * 1.1, fRad * 1.1, fAng * 0.95, ribbons, sharp);
  float s2 = layeredField(vec2(ap.x, -ap.y), uSeed + 43.0, warp, warpPasses, fX * 1.2, fY * 0.8, fRad * 0.9, fAng * 1.2, ribbons, sharp);
  float s3 = layeredField(rot2(ap, -0.6), uSeed + 61.0, warp, warpPasses, fX * 0.75, fY * 1.25, fRad * 1.3, fAng * 0.8, ribbons, sharp);
  float s4 = layeredField(ap + vec2(0.2, -0.1), uSeed + 79.0, warp, warpPasses, fX * 1.05, fY * 1.05, fRad, fAng, ribbons, sharp);
  float s5 = layeredField(rot2(ap, 1.1), uSeed + 97.0, warp, warpPasses, fX * 1.3, fY * 0.7, fRad * 1.15, fAng * 1.15, ribbons, sharp);

  // hard panel / plane partitions like references
  float planeA = step(ap.y, ap.x * (0.6 + 0.5 * hash11(uSeed + 400.0)) + (hash11(uSeed + 401.0) - 0.5) * 0.7);
  float planeB = step(ap.y, -ap.x * (0.5 + 0.8 * hash11(uSeed + 402.0)) + (hash11(uSeed + 403.0) - 0.5) * 0.6);
  float vCurtain = smoothstep(0.25, 0.0, abs(fract(artUv.x * (6.0 + floor(hash11(uSeed + 404.0) * 18.0))) - 0.5));
  float hCurtain = smoothstep(0.25, 0.0, abs(fract(artUv.y * (4.0 + floor(hash11(uSeed + 405.0) * 14.0))) - 0.5));

  float panelMask = 0.0;
  panelMask += planeA * step(0.5, panels);
  panelMask += planeB * step(1.5, panels);
  panelMask += vCurtain * step(2.5, panels);
  panelMask += hCurtain * step(3.5, panels);
  panelMask = clamp(panelMask * mix(0.25, 1.0, panelHard), 0.0, 1.0);

  float idx = floor(hash11(uSeed + floor(artUv.x * 17.0) + floor(artUv.y * 19.0)) * max(layers, 1.0));
  idx = clamp(idx, 0.0, 5.0);
  float baseSel = pickSignal(idx, s0, s1, s2, s3, s4, s5);

  // style families inspired by references (soft neon fields, arcs, curtains, reflections)
  float style = mod(floor(hash11(uSeed + 410.0) * 5.0) + floor(blendMode), 5.0);
  float mode0 = 1.0 - step(0.5, abs(style - 0.0));
  float mode1 = 1.0 - step(0.5, abs(style - 1.0));
  float mode2 = 1.0 - step(0.5, abs(style - 2.0));
  float mode3 = 1.0 - step(0.5, abs(style - 3.0));
  float mode4 = 1.0 - step(0.5, abs(style - 4.0));

  float verticalBands = sin(artUv.x * (12.0 + fX * 0.5) + baseSel * 2.4);
  float diagonalSweep = sin((ap.x + ap.y) * (8.0 + fAng * 0.8) + s2 * 1.8);
  float arcField = sin(length(ap - vec2(-0.55 + hash11(uSeed + 420.0), 0.1 + hash11(uSeed + 421.0) * 0.8)) * (10.0 + fRad * 0.7) + s1 * 2.7);
  float horizonY = 0.48 + (hash11(uSeed + 422.0) - 0.5) * 0.3;
  float reflection = layeredField(vec2(ap.x, abs(ap.y - horizonY)), uSeed + 423.0, warp, warpPasses, fX, fY, fRad, fAng, ribbons, sharp);
  float curtains = smoothstep(0.1, 0.0, abs(fract(artUv.x * (10.0 + fX * 0.4)) - 0.5)) * 2.0 - 1.0;

  float styleSig = 0.0;
  styleSig += verticalBands * mode0;
  styleSig += mix(arcField, reflection, smoothstep(horizonY - 0.05, horizonY + 0.05, ap.y)) * mode1;
  styleSig += diagonalSweep * mode2;
  styleSig += curtains * mode3;
  styleSig += mix(verticalBands, diagonalSweep, 0.5) * mode4;

  float signal = mix(styleSig, baseSel, 0.45 + panelMask * 0.35);

  // directional smear / slit-scan
  vec2 smearDir = normalize(vec2(cos(hash11(uSeed + 440.0) * 6.28318), sin(hash11(uSeed + 441.0) * 6.28318)) + vec2(0.001));
  float smA = 0.0;
  float smM = -10.0;
  float denom = max(smearTaps - 1.0, 1.0);
  for (int t = 0; t < 24; t++) {
    float enabled = step(float(t) + 0.5, smearTaps);
    float f = float(t) / denom - 0.5;
    vec2 sp = ap + smearDir * f * smear * (0.18 + 0.4 * hash11(uSeed + 442.0));
    float sv = layeredField(sp, uSeed + 443.0, warp, warpPasses, fX, fY, fRad, fAng, ribbons, sharp);
    smA += sv * enabled;
    smM = max(smM, mix(-10.0, sv, enabled));
  }
  smA /= max(smearTaps, 1.0);
  float sm = mix(smA, smM, step(0.5, hash11(uSeed + 444.0)));
  signal = mix(signal, sm, smear * (0.35 + 0.65 * panelMask));

  if (steps > 0.5) {
    float q = floor((signal * 0.5 + 0.5) * steps) / max(steps, 1.0);
    q = q * 2.0 - 1.0;
    signal = mix(signal, q, clamp(panelMask + panelLines(artUv, 9.0, 7.0, 0.08) * 0.7, 0.0, 1.0));
  }

  float comp = blendModeFn(signal, s3 * 0.7 + s4 * 0.3, blendMode);
  comp = blendModeFn(comp, s1 * 0.4 + s5 * 0.6, mod(blendMode + floor(hash11(uSeed + 470.0) * 4.0), 5.0));

  // palette + optional split
  vec2 splitDir = normalize(vec2(cos(hash11(uSeed + 480.0) * 6.28318), sin(hash11(uSeed + 481.0) * 6.28318)) + vec2(0.001));
  vec2 rgbOff = splitDir * rgbSplit * (0.06 + 0.09 * hash11(uSeed + 482.0));

  float sigR = comp + dot(rgbOff, vec2(1.0, -1.0));
  float sigG = comp;
  float sigB = comp - dot(rgbOff, vec2(1.0, -1.0));

  float phaseNudge = hueShift + panelMask * (0.12 + 0.3 * hash11(uSeed + 483.0));
  vec3 phase = vec3(sigR, sigG, sigB) + phaseNudge;
  vec3 col = uPalA.xyz + uPalB.xyz * cos(6.28318 * (uPalC.xyz * phase + uPalD.xyz));

  // soft glow + edge stars at line intersections
  float g = length(vec2(dFdx(comp), dFdy(comp)));
  float spec = pow(clamp(g * 2.6, 0.0, 1.0), 1.25) * gloss;
  float starGrid = panelLines(artUv, 11.0 + fX * 0.15, 8.0 + fY * 0.12, 0.05);
  col += spec * vec3(0.27, 0.22, 0.35) + pow(starGrid, 5.0) * 0.18;
  col *= 1.0 + spec * 1.2;

  // interior vignette / matte
  float inner = smoothstep(0.06, 0.22, min(min(artUv.x, 1.0 - artUv.x), min(artUv.y, 1.0 - artUv.y)));
  col = mix(col * 0.45, col, inner);

  // nested frame bands inside art rect
  float e = min(min(artUv.x, 1.0 - artUv.x), min(artUv.y, 1.0 - artUv.y));
  for (int b = 0; b < 4; b++) {
    float enabled = step(float(b) + 0.5, frameBands);
    float thick = (0.012 + frame * 0.024) * (1.0 + float(b) * 0.44);
    float start = 0.008 + float(b) * (0.02 + 0.014 * hash11(uSeed + float(b) * 5.7));
    float band = smoothstep(start, start + thick, e) - smoothstep(start + thick, start + thick * (1.6 + 0.3 * hash11(uSeed + float(b) * 6.4)), e);
    float tint = 0.05 + 0.11 * hash11(uSeed + float(b) * 8.2);
    col += vec3(tint, tint * (0.85 + 0.3 * hash11(uSeed + float(b) * 2.5)), tint * 1.15) * band * enabled;
    col *= mix(1.0, 0.76 + 0.12 * float(b), band * enabled);
  }

  // black outside art frame
  col *= inside;

  col = max(col, vec3(0.0));
  col = pow(col, vec3(1.0 / 2.2));
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;
