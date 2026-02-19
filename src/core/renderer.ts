import * as THREE from 'three';
import type { Instance } from './presets';
import { fragmentShader, vertexShader } from './shader';

export class ProcgenRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  constructor() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', {
      antialias: false,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false
    });

    if (!context) {
      throw new Error('WebGL2 is required for this renderer.');
    }

    this.renderer = new THREE.WebGLRenderer({ canvas, context });
    this.renderer.setPixelRatio(1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uSeed: { value: 1 },
        uParams0: { value: new THREE.Vector4() },
        uParams1: { value: new THREE.Vector4() },
        uParams2: { value: new THREE.Vector4() },
        uParams3: { value: new THREE.Vector4() },
        uPalA: { value: new THREE.Vector4() },
        uPalB: { value: new THREE.Vector4() },
        uPalC: { value: new THREE.Vector4() },
        uPalD: { value: new THREE.Vector4() }
      }
    });

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(this.mesh);
  }

  renderToDataUrl(instance: Instance, size: number): string {
    const { params, palette, seed } = instance;
    const target = new THREE.WebGLRenderTarget(size, size, {
      depthBuffer: false,
      stencilBuffer: false,
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat
    });

    this.renderer.setSize(size, size, false);
    this.material.uniforms.uResolution.value.set(size, size);
    this.material.uniforms.uSeed.value = seed;
    this.material.uniforms.uParams0.value.set(params.warp, params.warpPasses, params.fold, params.tileMix);
    this.material.uniforms.uParams1.value.set(params.tileCount, params.sweep, params.fRad, params.fAng);
    this.material.uniforms.uParams2.value.set(params.fX, params.fY, params.ribbons, params.sharp);
    this.material.uniforms.uParams3.value.set(params.gloss, params.hueShift, params.frame, 0);
    this.material.uniforms.uPalA.value.set(...palette.palA, 0);
    this.material.uniforms.uPalB.value.set(...palette.palB, 0);
    this.material.uniforms.uPalC.value.set(...palette.palC, 0);
    this.material.uniforms.uPalD.value.set(...palette.palD, 0);

    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);

    const pixels = new Uint8Array(size * size * 4);
    this.renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      target.dispose();
      throw new Error('2D canvas context unavailable');
    }

    const imageData = ctx.createImageData(size, size);
    for (let y = 0; y < size; y += 1) {
      const srcY = size - 1 - y;
      for (let x = 0; x < size; x += 1) {
        const srcIdx = (srcY * size + x) * 4;
        const dstIdx = (y * size + x) * 4;
        imageData.data[dstIdx] = pixels[srcIdx];
        imageData.data[dstIdx + 1] = pixels[srcIdx + 1];
        imageData.data[dstIdx + 2] = pixels[srcIdx + 2];
        imageData.data[dstIdx + 3] = pixels[srcIdx + 3];
      }
    }

    ctx.putImageData(imageData, 0, 0);

    this.renderer.setRenderTarget(null);
    target.dispose();

    return canvas.toDataURL('image/png');
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}
