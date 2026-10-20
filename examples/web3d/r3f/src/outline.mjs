import * as THREE from 'three';

/**
 * Inverted-hull outline: the same geometry drawn back-faces only, pushed outward.
 * 'screen' offsets in clip space by `thickness` of the viewport height, so the line is the same number of
 * pixels at any distance or object size. 'world' offsets along the normal by `thickness` metres, which
 * shrinks to nothing on a large or distant object.
 */
export function outlineMaterial({ color = 0xff0000, thickness = 0.008, mode = 'screen', aspect = 16 / 9 } = {}) {
  const common = `uniform float uThickness; uniform float uAspect;`;
  const screen = `
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vec2 dir = normalize((projectionMatrix * vec4(n, 0.0)).xy);
    clip.xy += dir * vec2(2.0 * uThickness / uAspect, 2.0 * uThickness) * clip.w;
    gl_Position = clip;`;
  const world = `
    float scale = length(modelMatrix[0].xyz); // uniform scale: keep the offset in metres
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * (uThickness / scale), 1.0);`;
  return new THREE.ShaderMaterial({
    uniforms: { uThickness: { value: thickness }, uAspect: { value: aspect }, uColor: { value: new THREE.Color(color) } },
    vertexShader: `${common}\nvoid main() {${mode === 'screen' ? screen : world}\n}`,
    fragmentShader: `uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 1.0); }`,
    side: THREE.BackSide,
  });
}
