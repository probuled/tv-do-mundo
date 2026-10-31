import { useEffect, useRef } from "react";
import Globe from "globe.gl";
import * as THREE from "three";
import { catColor, subsolarPoint, type WorldData } from "../data";
import { getState, matchesFilters, setState, tune, useStore } from "../store";

const TEX = `${import.meta.env.BASE_URL}textures/`;

// Terra com terminador dia/noite: textura de dia de um lado, luzes das cidades
// do outro, com o Sol na posição real do momento.
const earthVertex = /* glsl */ `
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vN = normalize((modelMatrix * vec4(position, 1.0)).xyz);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const earthFragment = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform vec3 uSun;
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    float i = dot(normalize(vN), normalize(uSun));
    vec3 day = texture2D(uDay, vUv).rgb * (0.45 + 0.75 * max(i, 0.0));
    vec3 night = texture2D(uNight, vUv).rgb * 1.6 + vec3(0.004, 0.006, 0.014);
    vec3 col = mix(night, day, smoothstep(-0.1, 0.12, i));
    // faixa de crepúsculo
    col += vec3(1.0, 0.42, 0.12) * 0.12 * (1.0 - smoothstep(0.0, 0.12, abs(i)));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

// Canais: um único THREE.Points com brilho aditivo.
const pointsVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aState; // 0 normal, 1 fora do filtro, 2 falhou
  attribute float aIdx;
  uniform float uHover;
  uniform float uCurrent;
  uniform float uTime;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSel;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    float facing = dot(normalize(wp.xyz), normalize(cameraPosition - wp.xyz));
    vec4 mv = viewMatrix * wp;
    float sel = step(abs(aIdx - uCurrent), 0.5);
    float hov = step(abs(aIdx - uHover), 0.5);
    float size = 1.0 + hov * 1.3 + sel * (2.2 + 0.6 * sin(uTime * 5.0));
    gl_PointSize = clamp(size * uScale / -mv.z, 2.0, 40.0);
    vAlpha = smoothstep(0.0, 0.2, facing) * (aState > 1.5 ? 0.25 : aState > 0.5 ? 0.07 : 1.0);
    vColor = aState > 1.5 ? vec3(0.45) : mix(aColor, vec3(1.0), hov * 0.5 + sel * 0.5);
    vSel = sel;
    gl_Position = projectionMatrix * mv;
  }
`;
const pointsFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSel;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    float ring = vSel * smoothstep(0.08, 0.0, abs(d - 0.42));
    // núcleo sólido com halo suave: legível mesmo em aglomerados densos
    float a = (smoothstep(0.5, 0.3, d) * 0.9 + pow(core, 2.0) * 0.4 + ring) * vAlpha;
    gl_FragColor = vec4(vColor * (0.85 + core * 0.5), min(a, 1.0));
  }
`;

export function GlobeView({ world }: { world: WorldData }) {
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<{ fly: (i: number) => void; refresh: () => void } | null>(null);

  useEffect(() => {
    const container = el.current!;
    const globe = new Globe(container, { rendererConfig: { antialias: true, powerPreference: "high-performance" } })
      .width(container.clientWidth)
      .height(container.clientHeight)
      .backgroundImageUrl(TEX + "night-sky.png")
      .showAtmosphere(true)
      .atmosphereColor("#5ec8ff")
      .atmosphereAltitude(0.17)
      .pointOfView({ lat: -14, lng: -45, altitude: 2.6 });

    // --- Terra com dia/noite ---
    const loader = new THREE.TextureLoader();
    const tex = (f: string) => {
      const t = loader.load(TEX + f);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    };
    const earth = new THREE.ShaderMaterial({
      uniforms: {
        uDay: { value: tex("earth-blue-marble.jpg") },
        uNight: { value: tex("earth-night.jpg") },
        uSun: { value: new THREE.Vector3(1, 0, 0) },
      },
      vertexShader: earthVertex,
      fragmentShader: earthFragment,
    });
    globe.globeMaterial(earth);
    const updateSun = () => {
      const s = subsolarPoint();
      const c = globe.getCoords(s.lat, s.lng, 0);
      earth.uniforms.uSun.value.set(c.x, c.y, c.z).normalize();
    };
    updateSun();
    const sunTimer = setInterval(updateSun, 60_000);

    // --- pontos dos canais ---
    const n = world.channels.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const st = new Float32Array(n);
    const idx = new Float32Array(n);
    const c = new THREE.Color();
    world.channels.forEach((ch, i) => {
      const p = globe.getCoords(ch.la, ch.lo, 0.006);
      pos.set([p.x, p.y, p.z], i * 3);
      c.set(catColor(ch.cat)).toArray(col, i * 3);
      idx[i] = i;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aState", new THREE.BufferAttribute(st, 1));
    geo.setAttribute("aIdx", new THREE.BufferAttribute(idx, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uHover: { value: -1 }, uCurrent: { value: -1 }, uTime: { value: 0 }, uScale: { value: 1 } },
      vertexShader: pointsVertex,
      fragmentShader: pointsFragment,
      transparent: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 10;
    globe.scene().add(points);

    const refresh = () => {
      const s = getState();
      for (let i = 0; i < n; i++) {
        st[i] = s.failed.has(world.channels[i].id) ? 2 : matchesFilters(i, s) ? 0 : 1;
      }
      geo.getAttribute("aState").needsUpdate = true;
    };
    refresh();

    // --- animação e auto-rotação ---
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableDamping = true;
    let raf = 0;
    let dragging = false;
    const clock = new THREE.Clock();
    const loop = () => {
      const s = getState();
      mat.uniforms.uTime.value = clock.getElapsedTime();
      mat.uniforms.uHover.value = s.hover ?? -1;
      mat.uniforms.uCurrent.value = s.current ?? -1;
      mat.uniforms.uScale.value = 1050 * Math.min(window.devicePixelRatio, 2) * (window.innerWidth < 700 ? 0.8 : 1);
      controls.autoRotate = s.current === null && !dragging;
      raf = requestAnimationFrame(loop);
    };
    loop();

    // --- seleção: canal mais próximo do cursor na tela ---
    const camera = globe.camera();
    const v = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    const pick = (x: number, y: number, radius: number): number | null => {
      const rect = container.getBoundingClientRect();
      let best: number | null = null;
      let bestD = radius * radius;
      camDir.copy(camera.position);
      for (let i = 0; i < n; i++) {
        if (st[i] === 1) continue;
        v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        // só o lado visível do globo
        if (v.dot(camDir) - v.lengthSq() < 0) continue;
        v.project(camera);
        const sx = ((v.x + 1) / 2) * rect.width;
        const sy = ((1 - v.y) / 2) * rect.height;
        const d = (sx - x) ** 2 + (sy - y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    };

    let down: { x: number; y: number } | null = null;
    let pending = false;
    let last = { x: 0, y: 0 };
    const canvas = globe.renderer().domElement;
    const onMove = (e: PointerEvent) => {
      last = { x: e.offsetX, y: e.offsetY };
      if (down && Math.hypot(e.offsetX - down.x, e.offsetY - down.y) > 4) dragging = true;
      if (pending || e.pointerType === "touch") return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        const h = dragging ? null : pick(last.x, last.y, 12);
        if (h !== getState().hover) setState({ hover: h });
        canvas.style.cursor = h !== null ? "pointer" : "";
      });
    };
    const onDown = (e: PointerEvent) => {
      down = { x: e.offsetX, y: e.offsetY };
      dragging = false;
    };
    const onUp = (e: PointerEvent) => {
      if (down && !dragging) {
        const i = pick(e.offsetX, e.offsetY, e.pointerType === "touch" ? 22 : 12);
        if (i !== null) {
          setState({ zapping: false });
          tune(i);
        }
      }
      down = null;
      dragging = false;
    };
    const onLeave = () => setState({ hover: null });
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);

    const fly = (i: number) => {
      const ch = world.channels[i];
      const alt = Math.min(globe.pointOfView().altitude, 1.4);
      // no desktop o player fica à direita: desloca o ponto para a esquerda da tela
      const shift = window.innerWidth > 900 ? alt * 14 : 0;
      globe.pointOfView(
        { lat: ch.la - (window.innerWidth <= 900 ? alt * 10 : 0), lng: ch.lo + shift, altitude: alt },
        1600,
      );
    };
    api.current = { fly, refresh };

    const onResize = () => globe.width(container.clientWidth).height(container.clientHeight);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(sunTimer);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      geo.dispose();
      mat.dispose();
      earth.dispose();
      globe._destructor();
      container.innerHTML = "";
    };
  }, [world]);

  // filtros / falhas mudaram: atualiza os pontos
  const filters = useStore((s) => s.filters);
  const failed = useStore((s) => s.failed);
  useEffect(() => api.current?.refresh(), [filters, failed]);

  // canal mudou por fora (zapear, busca, link): voa até ele
  const current = useStore((s) => s.current);
  useEffect(() => {
    if (current !== null) api.current?.fly(current);
  }, [current]);

  return <div ref={el} className="globe" />;
}
