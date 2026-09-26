// 3D scenes for the hero, written in plain WebGL (no libraries, no network).
// Each scene is a signed-distance field raymarched in one fragment shader and lit with the
// site's own three colors; the light follows the cursor. The same code ships inside every
// exported site (section 6 · SCENE) and renders still snapshots for gallery thumbnails.

export const SCENE_IDS = ['none', 'blob', 'vase', 'rings', 'orbs', 'crystal', 'waves'] as const;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScene;
uniform vec3 uBg;
uniform vec3 uInk;
uniform vec3 uAccent;
varying vec2 vUv;

float T;
vec2 M;
float gMat;
float gTag;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdTorus(vec3 p, vec2 t) { vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
float sdBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float sdOcta(vec3 p, float s) { p = abs(p); return (p.x + p.y + p.z - s) * 0.57735027; }

void pick(inout float d, float nd, float mat, float tag) { if (nd < d) { d = nd; gMat = mat; gTag = tag; } }

float vaseR(float y) { return 0.2 + 0.4 * exp(-pow((y + 0.2) / 0.45, 2.0)) + 0.08 * smoothstep(0.55, 0.85, y); }

float map(vec3 p) {
  p.yz *= rot(M.y * 0.28);
  p.xz *= rot(-M.x * 0.45);
  float d = 1e9;
  int s = int(uScene + 0.5);
  if (s == 1) {
    float b = sdSphere(p - vec3(sin(T * 0.7) * 0.55, cos(T * 0.9) * 0.32, sin(T * 0.5) * 0.3), 0.56);
    b = smin(b, sdSphere(p - vec3(cos(T * 0.6) * 0.62, sin(T * 0.8) * 0.42, cos(T * 0.7) * 0.25), 0.44), 0.42);
    b = smin(b, sdSphere(p - vec3(sin(T * 1.1 + 2.0) * 0.42, cos(T * 0.5 + 1.0) * 0.5, 0.1), 0.37), 0.42);
    b = smin(b, sdSphere(p - vec3(cos(T * 0.4 + 4.0) * 0.72, sin(T * 0.6 + 3.0) * 0.22, sin(T * 0.9) * 0.35), 0.3), 0.38);
    pick(d, b, 0.0, 0.0);
    pick(d, sdSphere(p - vec3(-0.95 + sin(T * 0.8) * 0.08, 0.62, -0.2), 0.12), 1.0, 0.0);
  } else if (s == 2) {
    vec3 q = p + vec3(0.0, 0.08, 0.0);
    q.xz *= rot(T * 0.9);
    float r = length(q.xz);
    float R = vaseR(q.y);
    float outer = max((r - R) * 0.7, abs(q.y - 0.025) - 0.825);
    float shell = max(outer, -((r - R + 0.05) * 0.7));
    shell = min(shell, max(r - R, abs(q.y + 0.78) - 0.035));
    pick(d, shell, 0.0, 1.0);
    vec3 w = q + vec3(0.0, 0.88, 0.0);
    pick(d, max(length(w.xz) - 1.05, abs(w.y) - 0.05) - 0.02, 1.0, 2.0);
  } else if (s == 3) {
    vec3 a = p; a.xy *= rot(T * 0.5); a.yz *= rot(T * 0.3);
    pick(d, sdTorus(a, vec2(0.92, 0.055)), 0.0, 0.0);
    vec3 b = p; b.yz *= rot(1.2 + T * 0.7); b.xz *= rot(T * 0.4);
    pick(d, sdTorus(b, vec2(0.7, 0.055)), 1.0, 0.0);
    vec3 c = p; c.xz *= rot(T * 0.9); c.xy *= rot(0.9 + T * 0.6);
    pick(d, sdTorus(c, vec2(0.48, 0.055)), 0.0, 0.0);
    pick(d, sdSphere(p, 0.22), 2.0, 0.0);
  } else if (s == 4) {
    pick(d, sdSphere(p, 0.46), 0.0, 0.0);
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float a = T * (0.5 + fi * 0.13) + fi * 1.7;
      vec3 o = vec3(cos(a) * (0.78 + fi * 0.06), sin(a * 1.3 + fi) * 0.25, sin(a) * (0.78 + fi * 0.06));
      o.xy *= rot(0.35 * fi - 0.6);
      pick(d, sdSphere(p - o, 0.1 + 0.03 * mod(fi, 3.0)), mod(fi, 2.0) + 1.0, 0.0);
    }
  } else if (s == 5) {
    vec3 q = p; q.xz *= rot(T * 0.6); q.xy *= rot(sin(T * 0.4) * 0.4);
    q.xz *= rot(q.y * 0.9);
    pick(d, sdOcta(q, 0.78) - 0.04, 0.0, 3.0);
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      vec3 o = p - vec3(cos(fi * 1.57 + T * 0.4) * 1.05, sin(T * 0.8 + fi * 2.0) * 0.35, sin(fi * 1.57 + T * 0.4) * 0.6);
      o.xy *= rot(T + fi); o.yz *= rot(T * 0.7 + fi);
      pick(d, sdBox(o, vec3(0.07), 0.015), mod(fi, 2.0) + 1.0, 0.0);
    }
  } else if (s == 6) {
    vec3 q = p + vec3(0.0, 0.35, 0.0);
    float h = 0.16 * sin(q.x * 2.6 + T * 0.9) * cos(q.z * 2.2 + T * 0.7) + 0.06 * sin(q.x * 5.1 - T * 1.3 + q.z * 3.0);
    pick(d, (q.y - h) * 0.55, 0.0, 4.0);
  }
  return d;
}

vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
}

float occlusion(vec3 p, vec3 n) {
  float o = 0.0, w = 1.0;
  for (int i = 1; i <= 4; i++) {
    float h = 0.06 * float(i);
    o += (h - map(p + n * h)) * w;
    w *= 0.6;
  }
  return clamp(1.0 - 2.2 * o, 0.0, 1.0);
}

vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }

void main() {
  T = uTime;
  M = uMouse;
  vec2 uv = (vUv * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);
  float fit = max(1.0, 1.25 / (uRes.x / uRes.y));
  int s = int(uScene + 0.5);

  vec3 bg = lin(uBg), ink = lin(uInk), acc = lin(uAccent);
  float darkBg = step(dot(uBg, vec3(0.299, 0.587, 0.114)), 0.45);

  vec3 ro = vec3(0.0, 0.1, 2.85 * fit);
  if (s == 6) ro = vec3(0.0, 1.25, 2.6 * fit);
  vec3 ta = vec3(0.0, s == 6 ? -0.2 : 0.0, 0.0);
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.9 * ww);

  // background: the page color with a soft accent glow
  vec3 col = mix(bg, mix(bg, acc, 0.16), smoothstep(-1.2, 1.0, uv.y));
  col += acc * 0.10 * exp(-dot(uv, uv) * 1.4);

  float t = 0.0;
  float hit = -1.0;
  for (int i = 0; i < 96; i++) {
    vec3 p = ro + rd * t;
    float dd = map(p);
    if (dd < 0.0012 * t) { hit = t; break; }
    t += dd;
    if (t > 9.0) break;
  }

  if (hit > 0.0) {
    vec3 p = ro + rd * hit;
    float mat = gMat, tag = gTag;
    vec3 n = normalAt(p);
    vec3 base = mat < 0.5 ? acc : (mat < 1.5 ? mix(ink, bg, 0.12) : mix(bg, acc, 0.12));

    vec3 q = p;
    q.yz *= rot(M.y * 0.28); q.xz *= rot(-M.x * 0.45);
    if (tag > 0.5 && tag < 1.5) {
      // glaze on the vase: a darker foot, a painted band that shows the spin
      vec3 v = q + vec3(0.0, 0.08, 0.0); v.xz *= rot(T * 0.9);
      float ang = atan(v.z, v.x);
      float band = smoothstep(0.0, 0.02, v.y + 0.02) * (1.0 - smoothstep(0.1, 0.12, v.y + 0.02));
      float dots = step(0.5, fract(ang * 3.0 / 3.14159));
      base = mix(base, mix(ink, bg, 0.2), band * dots * 0.85);
      base = mix(base * 0.72, base, smoothstep(-0.72, -0.55, v.y));
    } else if (tag > 1.5 && tag < 2.5) {
      vec3 w = q + vec3(0.0, 0.96, 0.0);
      base *= 0.85 + 0.15 * sin(length(w.xz) * 60.0);
    } else if (tag > 3.5) {
      float gx = abs(fract(q.x * 4.0) - 0.5), gz = abs(fract((q.z + T * 0.15) * 4.0) - 0.5);
      float line = 1.0 - smoothstep(0.02, 0.05, min(gx, gz));
      base = mix(mix(bg, acc, 0.35), acc, line);
    }

    vec3 L = normalize(vec3(0.55 + M.x * 0.9, 0.75 + M.y * 0.6, 0.65));
    float dif = clamp(dot(n, L), 0.0, 1.0);
    float amb = 0.55 + 0.45 * n.y;
    vec3 h = normalize(L - rd);
    float spe = pow(clamp(dot(n, h), 0.0, 1.0), tag > 2.5 && tag < 3.5 ? 90.0 : 48.0);
    float fre = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
    float ao = occlusion(p, n);

    vec3 lit = base * (0.22 * amb + 0.9 * dif) * ao;
    lit += base * bg * 0.25 * amb;
    lit += vec3(1.0) * spe * (tag > 2.5 && tag < 3.5 ? 1.1 : 0.55) * (0.6 + 0.4 * dif);
    lit += mix(acc, vec3(1.0), 0.45) * fre * (darkBg > 0.5 ? 0.55 : 0.35);
    float fog = 1.0 - exp(-0.02 * hit * hit);
    col = mix(lit, col, fog);
  } else if (s == 2) {
    // soft contact shadow under the wheel
    col *= 1.0 - 0.18 * exp(-dot(uv - vec2(0.0, -0.78), uv - vec2(0.0, -0.78)) * 5.0);
  }

  col = pow(col, vec3(1.0 / 2.2));
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = `attribute vec2 aPos; varying vec2 vUv; void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

/** The renderer, as source text. It runs in exported sites and (via `new Function`) in the app. */
export const SCENE_CORE_JS = `function createKilnScene(canvas, keep) {
  var gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: !!keep, powerPreference: 'low-power' });
  if (!gl) return null;
  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var vs = shader(gl.VERTEX_SHADER, \`${VERT}\`);
  var fs = shader(gl.FRAGMENT_SHADER, \`${FRAG}\`);
  if (!vs || !fs) return null;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var u = {};
  ['uRes', 'uTime', 'uMouse', 'uScene', 'uBg', 'uInk', 'uAccent'].forEach(function (n) { u[n] = gl.getUniformLocation(prog, n); });
  return {
    draw: function (o) {
      if (canvas.width !== o.w || canvas.height !== o.h) { canvas.width = o.w; canvas.height = o.h; }
      gl.viewport(0, 0, o.w, o.h);
      gl.uniform2f(u.uRes, o.w, o.h);
      gl.uniform1f(u.uTime, o.t);
      gl.uniform2f(u.uMouse, o.mx, o.my);
      gl.uniform1f(u.uScene, o.scene);
      gl.uniform3fv(u.uBg, o.bg);
      gl.uniform3fv(u.uInk, o.ink);
      gl.uniform3fv(u.uAccent, o.accent);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    lost: function () { return gl.isContextLost(); }
  };
}`;

/** Section 6 of every exported site: mounts the scene into .hero-media when body[data-scene] is set. */
export const SCENE_JS = `    // A 3D object in the hero, drawn with plain WebGL. body[data-scene] picks it:
    //   none · blob · vase · rings · orbs · crystal · waves
    // The light follows your cursor. Colors come from --bg, --ink and --accent.
    ${SCENE_CORE_JS.replace(/\n(?=.)/g, '\n    ')}
    (function () {
      var NAMES = ${JSON.stringify(SCENE_IDS)};
      var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      var host = null, canvas = null, scene = null, raf = 0, frame = 0, onScreen = true, quality = 1;
      var colors = null, mouse = [0, 0], aim = [0, 0], start = performance.now();
      var probe = document.createElement('canvas').getContext('2d');
      function rgb(value) {
        probe.fillStyle = '#000';
        probe.fillStyle = value || '#000';
        var c = probe.fillStyle;
        if (c.charAt(0) === '#') return [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16) / 255; });
        var m = c.match(/[\\d.]+/g) || [0, 0, 0];
        return [m[0] / 255, m[1] / 255, m[2] / 255];
      }
      function readColors() {
        var s = getComputedStyle(document.body);
        colors = ['--bg', '--ink', '--accent'].map(function (n) { return rgb(s.getPropertyValue(n).trim()); });
      }
      var io = new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; if (onScreen) tick(); });
      function mount() {
        host = document.querySelector('.hero-media');
        if (!host) return false;
        canvas = document.createElement('canvas');
        canvas.className = 'scene';
        canvas.setAttribute('aria-hidden', 'true');
        host.appendChild(canvas);
        scene = createKilnScene(canvas);
        if (!scene) { canvas.remove(); canvas = null; return false; }
        io.disconnect();
        io.observe(host);
        readColors();
        return true;
      }
      function unmount() {
        if (canvas) canvas.remove();
        canvas = null; scene = null; host = null;
      }
      function tick() {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }
      function loop(now) {
        var id = NAMES.indexOf(document.body.getAttribute('data-scene') || 'none');
        if (id <= 0) { unmount(); return; }
        if (!canvas || !canvas.isConnected) { unmount(); if (!mount()) return; }
        if (!onScreen || document.hidden) return;
        if (frame++ % 15 === 0) readColors();
        mouse[0] += (aim[0] - mouse[0]) * 0.06;
        mouse[1] += (aim[1] - mouse[1]) * 0.06;
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5) * quality;
        var w = Math.max(2, Math.round(host.clientWidth * dpr)), h = Math.max(2, Math.round(host.clientHeight * dpr));
        var t0 = performance.now();
        scene.draw({ w: w, h: h, t: reduce ? 1.2 : (now - start) / 1000, mx: mouse[0], my: mouse[1], scene: id, bg: colors[0], ink: colors[1], accent: colors[2] });
        var cost = performance.now() - t0;
        if (cost > 14 && quality > 0.45) quality *= 0.85;
        else if (cost < 5 && quality < 1) quality = Math.min(1, quality * 1.05);
        if (!reduce || Math.abs(aim[0] - mouse[0]) + Math.abs(aim[1] - mouse[1]) > 0.002) raf = requestAnimationFrame(loop);
      }
      addEventListener('pointermove', function (e) {
        aim = [Math.max(-1, Math.min(1, (e.clientX / innerWidth) * 2 - 1)), Math.max(-1, Math.min(1, 1 - (e.clientY / innerHeight) * 2))];
        if (reduce) tick();
      }, { passive: true });
      document.addEventListener('visibilitychange', tick);
      new MutationObserver(tick).observe(document.body, { attributes: true, attributeFilter: ['data-scene'] });
      tick();
    })();`;

// ------------------------------------------------------------------ in-app snapshots

type Renderer = { draw: (o: DrawOpts) => void; lost: () => boolean } | null;
interface DrawOpts {
  w: number;
  h: number;
  t: number;
  mx: number;
  my: number;
  scene: number;
  bg: number[];
  ink: number[];
  accent: number[];
}

let shared: { canvas: HTMLCanvasElement; r: Renderer } | null = null;
const cache = new Map<string, string>();

function hexToRgb01(hex: string): number[] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function renderer(): Renderer {
  if (!shared || shared.r?.lost()) {
    const canvas = document.createElement('canvas');
    // eslint-disable-next-line no-new-func
    const factory = new Function(`${SCENE_CORE_JS}; return createKilnScene;`)() as (c: HTMLCanvasElement, keep: boolean) => Renderer;
    shared = { canvas, r: factory(canvas, true) };
  }
  return shared.r;
}

/** A still frame of a scene as a data URL (cached), for thumbnails. */
export function sceneSnapshot(scene: string, colors: { bg: string; ink: string; accent: string }, w: number, h: number): string | null {
  const id = SCENE_IDS.indexOf(scene as (typeof SCENE_IDS)[number]);
  if (id <= 0) return null;
  const W = Math.max(8, Math.round(w));
  const H = Math.max(8, Math.round(h));
  const key = `${id}|${colors.bg}|${colors.ink}|${colors.accent}|${W}x${H}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = renderer();
  if (!r || !shared) return null;
  r.draw({ w: W, h: H, t: 2.4, mx: 0.25, my: 0.15, scene: id, bg: hexToRgb01(colors.bg), ink: hexToRgb01(colors.ink), accent: hexToRgb01(colors.accent) });
  const url = shared.canvas.toDataURL('image/jpeg', 0.86);
  if (cache.size > 400) cache.delete(cache.keys().next().value!);
  cache.set(key, url);
  return url;
}
