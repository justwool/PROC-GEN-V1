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
uniform vec4 uPalA;
uniform vec4 uPalB;
uniform vec4 uPalC;
uniform vec4 uPalD;

float hash11(float p) {
  return fract(sin(p * 127.1 + 311.7) * 43758.5453123);
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

  float sx = mix(0.0, p.x, sweep);
  float sy = mix(0.0, p.y, sweep);

  for (int i = 0; i < 6; i++) {
    float fi = 1.0 + float(i) * 0.41 + hash11(uSeed + float(i) * 2.13) * 2.2;
    float phase = hash11(uSeed * 0.73 + float(i) * 17.0) * 6.28318;
    float enabled = step(float(i) + 0.5, warpPasses);

    vec2 delta = warp * 0.12 * vec2(
      sin(p.y * fi + phase + sx * 2.0),
      cos(p.x * fi + phase * 1.37 + sy * 2.0)
    );

    delta += warp * 0.05 * vec2(
      sin((p.x + p.y) * fi * 0.7 + phase),
      cos((p.x - p.y) * fi * 0.6 + phase)
    );

    p += delta * enabled;
  }

  vec2 pFold = abs(p);
  p = mix(p, pFold, fold);

  float safeTileCount = max(1.0, tileCount);
  vec2 q = fract(p * safeTileCount) - 0.5;
  p = mix(p, q, tileMix);

  float r = length(p);
  float a = atan(p.y, p.x);

  float seedA = hash11(uSeed * 0.91 + 5.1) * 6.28318;
  float seedB = hash11(uSeed * 1.07 + 8.6) * 6.28318;

  float sRad = sin(r * fRad + seedA + sx * 3.0);
  float sAng = cos(a * fAng + seedB + sy * 3.0);
  float sAx = sin(p.x * fX + sRad * 2.0) + cos(p.y * fY + sAng * 2.0);

  float stripe = sin(sAx + sRad + sAng);
  float t = 0.5 + 0.5 * stripe;
  float ribbon = smoothstep(0.35, 0.65, t);
  float signal = mix(stripe, ribbon * 2.0 - 1.0, ribbons);

  signal = sign(signal) * pow(abs(signal), max(sharp, 0.001));

  float g = length(vec2(dFdx(signal), dFdy(signal)));
  float spec = pow(clamp(g * 2.0, 0.0, 1.0), 1.4) * gloss;

  vec3 col = uPalA.xyz + uPalB.xyz * cos(6.28318 * (uPalC.xyz * (signal + hueShift) + uPalD.xyz));
  col += spec * vec3(0.25, 0.2, 0.35);
  col *= 1.0 + spec * 1.2;

  float e = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float outer = smoothstep(0.0, 0.03 + frame * 0.08, e);
  float lineIn = smoothstep(0.035 + frame * 0.02, 0.04 + frame * 0.03, e);
  float lineOut = smoothstep(0.055 + frame * 0.03, 0.06 + frame * 0.03, e);
  float innerBand = clamp(lineOut - lineIn, 0.0, 1.0);

  col *= mix(0.24, 1.0, outer);
  col += innerBand * 0.11;

  col = max(col, vec3(0.0));
  col = pow(col, vec3(1.0 / 2.2));
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;
