import * as THREE from 'three';

/** A hard-edged lighting ramp: one RGB colour per band, darkest first. */
export function rampTexture(bands) {
  const data = new Uint8Array(bands.flatMap(([r, g, b]) => [r, g, b, 255]));
  const tex = new THREE.DataTexture(data, bands.length, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

const CHUNK = 'gradientmap_pars_fragment';
const SAMPLE_R = 'texture2D( gradientMap, coord ).r';

/**
 * MeshToonMaterial samples only the red channel of `gradientMap`, so a coloured ramp renders as grey bands.
 * This swaps in the rgb sample. It throws when three's chunk no longer contains the text it replaces, so an
 * upgrade that changes the shader fails here instead of silently going grey again.
 */
export function patchToonRamp(material) {
  const chunk = THREE.ShaderChunk[CHUNK];
  const patched = chunk.replace(SAMPLE_R, 'texture2D( gradientMap, coord ).rgb');
  if (patched === chunk) throw new Error(`toon ramp patch: "${SAMPLE_R}" not found in ${CHUNK}; three changed`);
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(`#include <${CHUNK}>`, patched);
  };
  material.customProgramCacheKey = () => 'toon-ramp-rgb';
  return material;
}

export function toonMaterial({ color, bands, patch = true }) {
  const material = new THREE.MeshToonMaterial({ color, gradientMap: rampTexture(bands) });
  return patch ? patchToonRamp(material) : material;
}
