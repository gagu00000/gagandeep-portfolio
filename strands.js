// strands.js - Vanilla JS port of React Bits Strands component

const MAX_STRANDS = 12;
const MAX_COLORS = 8;

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColors[${MAX_COLORS}];
uniform int uColorCount;
uniform int uStrandCount;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaviness;
uniform float uThickness;
uniform float uGlow;
uniform float uTaper;
uniform float uSpread;
uniform float uHueShift;
uniform float uIntensity;
uniform float uOpacity;
uniform float uScale;
uniform float uSaturation;

out vec4 fragColor;

const float PI = 3.14159265;

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.00, 0.33, 0.67)));
}

vec3 samplePalette(float t) {
  t = fract(t);
  float scaled = t * float(uColorCount);
  int idx = int(floor(scaled));
  float blend = fract(scaled);
  int nextIdx = idx + 1;
  if (nextIdx >= uColorCount) nextIdx = 0;
  return mix(uColors[idx], uColors[nextIdx], blend);
}

vec3 strandColor(float t) {
  if (uColorCount > 0) return samplePalette(t);
  return spectrum(t);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  uv /= max(uScale, 0.0001);

  float e = 0.06 + uIntensity * 0.94;
  float env = pow(max(cos(uv.x * PI * 1.3), 0.0), uTaper);

  vec3 col = vec3(0.0);

  for (int i = 0; i < ${MAX_STRANDS}; i++) {
    if (i >= uStrandCount) break;

    float fi = float(i);
    float ph = fi * 1.7 * uSpread;
    float freq = (2.0 + fi * 0.35) * uWaviness;
    float spd = 1.4 + fi * 1.2;

    float tt = uTime * uSpeed;
    float w = sin(uv.x * freq + tt * spd + ph) * 0.60
            + sin(uv.x * freq * 1.1 - tt * spd * 0.7 + ph * 1.7) * 0.40;

    float amp = (0.1 + 0.02 * e) * env * uAmplitude;
    float y = w * amp;

    float d = abs(uv.y - y);
    float thick = (0.001 + 0.05 * e) * (0.35 + env) * uThickness;
    float g = thick / (d + thick * 0.45);
    g = g * g;

    float h = fi / float(uStrandCount) + uv.x * 0.30 + uTime * 0.04 + uHueShift;
    col += strandColor(h) * g * env;
  }

  col *= 0.45 + 0.7 * e;
  col = 1.0 - exp(-col * uGlow);

  float gray = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(gray), col, uSaturation), 0.0);

  float lum = max(max(col.r, col.g), col.b);
  float alpha = clamp(lum, 0.0, 1.0) * uOpacity;

  fragColor = vec4(col * uOpacity, alpha);
}
`;

const GLASS_FRAG = `#version 300 es
precision highp float;

uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uRadius;
uniform float uRefraction;
uniform float uDispersion;

out vec4 fragColor;

vec2 toUv(vec2 p) {
  return p * (uResolution.y / uResolution) + 0.5;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float d = length(p);
  float r = uRadius;

  float edge = fwidth(d) * 1.5;
  float mask = 1.0 - smoothstep(r - edge, r + edge, d);
  if (mask <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }

  // sphere height: 0 at the rim, 1 at the center
  float z = sqrt(max(r * r - d * d, 0.0)) / r;
  float nd = d / r; // 0 at the center, 1 at the rim

  // refraction is confined to a narrow band near the rim; the rest stays undistorted
  vec2 dir = d > 0.0 ? p / d : vec2(0.0);
  float lens = smoothstep(0.85, 1.0, nd) * pow(nd, 6.0);
  vec2 offset = -dir * lens * uRefraction * 0.15;
  vec2 disp = -dir * lens * uDispersion * 0.012;

  vec3 light;
  light.r = texture(uScene, toUv(p + offset - disp)).r;
  light.g = texture(uScene, toUv(p + offset)).g;
  light.b = texture(uScene, toUv(p + offset + disp)).b;

  // neutral fresnel rim (no color tint so the glass stays clear)
  float fres = pow(1.0 - z, 3.0);
  vec3 rim = vec3(1.0) * fres * 0.18;

  // specular highlight from the upper-left
  vec2 lightDir = normalize(vec2(-0.55, 0.6));
  float spec = pow(max(dot(p / max(r, 1e-4), lightDir), 0.0), 6.0);
  spec *= smoothstep(r, r * 0.55, d);

  vec3 emissive = light + rim + vec3(spec) * 0.4;
  float emissiveA = clamp(max(max(emissive.r, emissive.g), emissive.b), 0.0, 1.0);

  // almost clear glass body: only a faint neutral darkening, mostly near the rim
  float bodyA = 0.05 + fres * 0.05;

  // composite emissive light over the clear body (premultiplied)
  float outA = emissiveA + bodyA * (1.0 - emissiveA);
  vec3 outRGB = emissive;

  outRGB *= mask;
  outA *= mask;

  fragColor = vec4(outRGB, outA);
}
`;

export default async function initStrands(container, userOptions = {}) {
  if (!container || !window.WebGLRenderingContext) return null;

  let ogl;
  try {
    ogl = await import("https://cdn.jsdelivr.net/npm/ogl@1.0.11/+esm");
  } catch (e) {
    console.error("Failed to load OGL", e);
    return null;
  }

  const { Renderer, Program, Mesh, Color, Triangle, RenderTarget } = ogl;

  const defaultOptions = {
    colors: ['#FF4242', '#7C3AED', '#06B6D4', '#EAB308'],
    count: 3,
    speed: 0.5,
    amplitude: 1,
    waviness: 1,
    thickness: 0.7,
    glow: 2.6,
    taper: 3,
    spread: 1,
    hueShift: 0,
    intensity: 0.6,
    saturation: 1.5,
    opacity: 1,
    scale: 1.5,
    glass: false,
    refraction: 1,
    dispersion: 1,
    glassSize: 1,
  };

  const options = { ...defaultOptions, ...userOptions };

  const buildPalette = (colors) => {
    const filled = colors && colors.length ? colors : ['#ffffff'];
    const padded = [];
    for (let i = 0; i < MAX_COLORS; i++) {
      const hex = filled[i] ?? filled[filled.length - 1];
      const c = new Color(hex);
      padded.push([c.r, c.g, c.b]);
    }
    return padded;
  };

  const renderer = new Renderer({
    // full-screen fragment shader — keep the pixel budget low on phones
    dpr: Math.min(window.devicePixelRatio || 1, window.innerWidth < 860 ? 1 : 1.5),
    alpha: true,
    premultipliedAlpha: true,
    antialias: true
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.canvas.style.backgroundColor = 'transparent';
  gl.canvas.style.display = 'block';
  gl.canvas.style.width = '100%';
  gl.canvas.style.height = '100%';

  const geometry = new Triangle(gl);
  if (geometry.attributes.uv) {
    delete geometry.attributes.uv;
  }

  const program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: [container.offsetWidth, container.offsetHeight] },
      uColors: { value: buildPalette(options.colors) },
      uColorCount: { value: Math.min(options.colors.length, MAX_COLORS) },
      uStrandCount: { value: Math.min(options.count, MAX_STRANDS) },
      uSpeed: { value: options.speed },
      uAmplitude: { value: options.amplitude },
      uWaviness: { value: options.waviness },
      uThickness: { value: options.thickness },
      uGlow: { value: options.glow },
      uTaper: { value: options.taper },
      uSpread: { value: options.spread },
      uHueShift: { value: options.hueShift },
      uIntensity: { value: options.intensity },
      uOpacity: { value: options.opacity },
      uScale: { value: options.scale },
      uSaturation: { value: options.saturation }
    }
  });

  const mesh = new Mesh(gl, { geometry, program });

  // the glass pass needs an extra full-size render target — only pay for it
  // when the effect is actually enabled
  let renderTarget = null;
  let glassProgram = null;
  let glassMesh = null;
  if (options.glass) {
    renderTarget = new RenderTarget(gl, {
      width: container.offsetWidth,
      height: container.offsetHeight
    });
    glassProgram = new Program(gl, {
      vertex: VERT,
      fragment: GLASS_FRAG,
      uniforms: {
        uScene: { value: renderTarget.texture },
        uResolution: { value: [container.offsetWidth, container.offsetHeight] },
        uRadius: { value: 0.46 * options.glassSize },
        uRefraction: { value: options.refraction },
        uDispersion: { value: options.dispersion }
      }
    });
    glassMesh = new Mesh(gl, { geometry, program: glassProgram });
  }

  container.appendChild(gl.canvas);

  function resize() {
    if (!container) return;
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    renderer.setSize(width, height);
    program.uniforms.uResolution.value = [width, height];
    if (renderTarget) renderTarget.setSize(width, height);
    if (glassProgram) glassProgram.uniforms.uResolution.value = [width, height];
  }
  window.addEventListener('resize', resize);
  resize();

  let animateId = 0;
  let running = false;
  const update = t => {
    animateId = requestAnimationFrame(update);
    program.uniforms.uTime.value = t * 0.001;

    if (options.glass && glassProgram) {
      renderer.render({ scene: mesh, target: renderTarget });
      glassProgram.uniforms.uScene.value = renderTarget.texture;
      renderer.render({ scene: glassMesh });
    } else {
      renderer.render({ scene: mesh });
    }
  };
  const start = () => {
    if (running || document.hidden) return;
    running = true;
    animateId = requestAnimationFrame(update);
  };
  const stop = () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(animateId);
  };
  // don't render while the tab is in the background
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  start();

  return {
    pause: stop,
    resume: start,
    destroy: () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
      if (container && gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
    updateOptions: (newOptions) => {
      Object.assign(options, newOptions);
      program.uniforms.uColors.value = buildPalette(options.colors);
      program.uniforms.uColorCount.value = Math.min(options.colors.length, MAX_COLORS);
      program.uniforms.uStrandCount.value = Math.min(Math.max(Math.round(options.count), 1), MAX_STRANDS);
      program.uniforms.uSpeed.value = options.speed;
      program.uniforms.uAmplitude.value = options.amplitude;
      program.uniforms.uWaviness.value = options.waviness;
      program.uniforms.uThickness.value = options.thickness;
      program.uniforms.uGlow.value = options.glow;
      program.uniforms.uTaper.value = options.taper;
      program.uniforms.uSpread.value = options.spread;
      program.uniforms.uHueShift.value = options.hueShift;
      program.uniforms.uIntensity.value = options.intensity;
      program.uniforms.uOpacity.value = options.opacity;
      program.uniforms.uScale.value = options.scale;
      program.uniforms.uSaturation.value = options.saturation;
      if (glassProgram) {
        glassProgram.uniforms.uRefraction.value = options.refraction;
        glassProgram.uniforms.uDispersion.value = options.dispersion;
        glassProgram.uniforms.uRadius.value = 0.46 * options.glassSize;
      }
    }
  };
}
