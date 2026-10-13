/*
 * DOM-synced media planes for the project cards.
 * Each plane shows a live 3D scene (rendered into a texture) and reacts to:
 *  - motion: the sheet bends and splits its colour channels while the gallery moves
 *  - hover: zooms in, bulges towards the camera and ripples around the cursor
 *  - reveal: a wavy wipe uncovers the scene the first time it enters the viewport
 */
export const planeVertex = /* glsl */ `
uniform vec2 uVelocity;
uniform float uHover;
uniform float uReveal;

varying vec2 vUv;

const float PI = 3.141592653589793;

void main() {
  vUv = uv;
  vec3 p = position;

  float bowX = sin(uv.y * PI);
  float bowY = sin(uv.x * PI);
  p.x -= bowX * uVelocity.x * 0.07;
  p.y += bowY * uVelocity.y * 0.07;

  float pillow = sin(uv.x * PI) * sin(uv.y * PI);
  p.z += pillow * (uHover * 28.0 + (abs(uVelocity.x) + abs(uVelocity.y)) * 90.0);
  p.z -= (1.0 - uReveal) * pillow * 140.0;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const planeFragment = /* glsl */ `
uniform sampler2D uTexture;
uniform vec2 uPlaneSize;
uniform float uRadius;
uniform float uHover;
uniform vec2 uMouse;
uniform vec2 uVelocity;
uniform float uReveal;
uniform float uTime;
uniform vec3 uTint;

varying vec2 vUv;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 uv = vUv;

  // Reveal wipe (bottom → top with a travelling wave)
  float wave = sin(uv.x * 7.0 + uTime * 2.2) * 0.03;
  float line = uReveal * 1.3 - 0.15 + wave;
  float revealMask = 1.0 - smoothstep(line - 0.12, line, uv.y);

  // Zoom: starts close during the reveal, pushes in on hover
  float zoom = 1.0 - uHover * 0.07 - (1.0 - uReveal) * 0.25;
  vec2 cuv = (uv - 0.5) * zoom + 0.5;

  // Ripple around the cursor
  vec2 aspect = vec2(uPlaneSize.x / uPlaneSize.y, 1.0);
  vec2 toMouse = (uv - uMouse) * aspect;
  float dist = length(toMouse);
  float ripple = sin(dist * 26.0 - uTime * 5.0) * smoothstep(0.5, 0.0, dist) * uHover * 0.009;
  cuv += (toMouse / max(dist, 0.0001)) / aspect * ripple;

  // Chromatic split driven by motion
  float speed = clamp(length(uVelocity), 0.0, 1.0);
  vec2 dir = speed > 0.0001 ? normalize(uVelocity) : vec2(1.0, 0.0);
  float shift = speed * 0.028 + uHover * 0.0015;
  vec3 color;
  color.r = texture2D(uTexture, cuv + dir * shift).r;
  color.g = texture2D(uTexture, cuv).g;
  color.b = texture2D(uTexture, cuv - dir * shift).b;

  // Vignette, hover light sweep and a tint on the edges
  float vignette = smoothstep(1.25, 0.25, length((uv - 0.5) * vec2(1.15, 1.0)));
  color *= mix(0.72, 1.0, vignette);
  float sweep = smoothstep(0.12, 0.0, abs((uv.x + uv.y * 0.6) - (uMouse.x + uMouse.y * 0.6))) * uHover * 0.12;
  color += uTint * sweep;

  // Rounded corners
  vec2 p = (uv - 0.5) * uPlaneSize;
  float d = roundedBox(p, uPlaneSize * 0.5, uRadius);
  float mask = 1.0 - smoothstep(-1.0, 0.5, d);

  gl_FragColor = vec4(color, mask * revealMask);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
