"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const PARTICLE_COUNT = 18000;
const LERP_SPEED = 0.04;

export default function PirateShipHero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.025);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(8, 3, 10);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0a, 1);
    container.appendChild(renderer.domElement);

    // Particle geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const targets = new Float32Array(PARTICLE_COUNT * 3);
    const targetColors = new Float32Array(PARTICLE_COUNT * 3);

    // Initialize randomly scattered
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      colors[i * 3] = 0.1;
      colors[i * 3 + 1] = 0.1;
      colors[i * 3 + 2] = 0.15;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Ship parameters
    const waveH = 1.2;
    const waveSpd = 1.0;
    const rockAmt = 0.5;

    const count = PARTICLE_COUNT;
    const NW = Math.floor(count * 0.55);
    const NH = Math.floor(count * 0.2);
    const NM = Math.floor(count * 0.05);
    const NS = Math.floor(count * 0.15);

    const tempColor = new THREE.Color();

    function computeTargets(time: number) {
      const bobY = Math.sin(time * 0.7 * waveSpd) * 0.22 * rockAmt - 1.1;
      const rAng = Math.sin(time * 0.5 * waveSpd) * 0.08 * rockAmt;
      const cR = Math.cos(rAng);
      const sR = Math.sin(rAng);

      for (let i = 0; i < count; i++) {
        let tx = 0,
          ty = 0,
          tz = 0;

        if (i < NW) {
          // Ocean
          const gs = Math.floor(Math.sqrt(NW));
          const wx = ((i % gs) / (gs - 1) - 0.5) * 30.0;
          const wz = (Math.floor(i / gs) / (gs - 1) - 0.5) * 30.0;
          const t = time * waveSpd;
          const wy =
            Math.sin(wx * 0.38 + t) * waveH +
            Math.sin(wz * 0.32 + t * 1.15) * waveH * 0.75 +
            Math.sin((wx - wz) * 0.22 + t * 0.85) * waveH * 0.5 +
            Math.cos(wx * 0.5 + wz * 0.28 + t * 1.4) * waveH * 0.28 -
            1.6;
          tx = wx;
          ty = wy;
          tz = wz;

          const wn = Math.max(
            0,
            Math.min(1, (wy + 1.6 + waveH * 2.5) / (waveH * 5.0 + 0.01))
          );
          tempColor.setHSL(0.57 + wn * 0.05, 0.8, 0.18 + wn * 0.35);
        } else if (i < NW + NH) {
          // Hull
          const hi = i - NW;
          const uN = Math.floor(Math.sqrt(NH * 2.5));
          const vN = Math.ceil(NH / uN);
          const u = (hi % uN) / (uN - 1 + 0.001);
          const v = Math.floor(hi / uN) / (vN - 1 + 0.001);
          const hx = (u - 0.5) * 5.5;
          const bowW = 1.0 - Math.max(0, (u - 0.58) / 0.42);
          const sternW = Math.min(u * 2.2, 1.0);
          const wt = Math.max(0, bowW) * sternW;
          const hullW = wt * 1.1;
          const hullD = wt * 0.85 + 0.12;
          const ang = v * Math.PI;
          const ly = -Math.sin(ang) * hullD;
          const lz = Math.cos(ang) * hullW;
          tx = hx;
          ty = ly * cR - lz * sR + bobY;
          tz = ly * sR + lz * cR;

          tempColor.setHSL(0.07 + u * 0.02, 0.55, 0.27 + wt * 0.1);
        } else if (i < NW + NH + NM) {
          // Masts
          const mi = i - NW - NH;
          const mn = mi / NM;
          const mIdx = mn < 0.55 ? 0 : mn < 0.8 ? 1 : 2;
          const mt =
            mIdx === 0
              ? mn / 0.55
              : mIdx === 1
                ? (mn - 0.55) / 0.25
                : (mn - 0.8) / 0.2;
          const mx = mIdx === 0 ? -0.2 : mIdx === 1 ? 1.2 : -1.6;
          const mh = mIdx === 0 ? 4.5 : mIdx === 1 ? 3.6 : 3.0;
          const ly = mt * mh;
          tx = mx;
          ty = ly * cR + bobY;
          tz = ly * sR;

          tempColor.setHSL(0.07, 0.4, 0.22);
        } else if (i < NW + NH + NM + NS) {
          // Sails
          const si = i - NW - NH - NM;
          const s0 = Math.floor(NS * 0.45);
          const s1 = Math.floor(NS * 0.3);
          const sIdx = si < s0 ? 0 : si < s0 + s1 ? 1 : 2;
          const sr = sIdx === 0 ? si : sIdx === 1 ? si - s0 : si - s0 - s1;
          const ssz = sIdx === 0 ? s0 : sIdx === 1 ? s1 : NS - s0 - s1;
          const cols = 40;
          const rows = Math.max(1, Math.ceil(ssz / cols));
          const su = (sr % cols) / (cols - 1 + 0.001);
          const sv = Math.floor(sr / cols) / (rows - 1 + 0.001);
          const smx = sIdx === 0 ? -0.2 : sIdx === 1 ? -0.2 : 1.2;
          const sby = sIdx === 0 ? 0.3 : sIdx === 1 ? 2.2 : 0.3;
          const sww = sIdx === 0 ? 2.5 : sIdx === 1 ? 1.9 : 2.0;
          const shh = sIdx === 0 ? 1.9 : sIdx === 1 ? 1.2 : 1.6;
          const billow =
            Math.sin(su * Math.PI) *
            (0.38 + Math.sin(time * waveSpd * 0.9) * 0.12);
          const lx = smx + (su - 0.5) * sww;
          const ly = sby + sv * shh;
          const lz = billow;
          tx = lx;
          ty = ly * cR - lz * sR + bobY;
          tz = ly * sR + lz * cR;

          tempColor.setHSL(0.1, 0.12, 0.86 - sv * 0.07);
        } else {
          // Jolly Roger flag
          const fi = i - NW - NH - NM - NS;
          const fTot = count - NW - NH - NM - NS;
          const fCols = 24;
          const fRows = Math.max(1, Math.ceil(fTot / fCols));
          const fu = (fi % fCols) / (fCols - 1 + 0.001);
          const fv = Math.floor(fi / fCols) / (fRows - 1 + 0.001);
          const fw =
            Math.sin(fu * Math.PI * 2.0 + time * 2.8 * waveSpd) * fu * 0.22;
          const lx = -0.2 + fu * 0.72;
          const ly = 4.3 - fv * 0.44;
          tx = lx;
          ty = ly * cR - fw * sR + bobY;
          tz = ly * sR + fw * cR;

          const inSkull =
            Math.abs(fu - 0.42) < 0.17 && Math.abs(fv - 0.5) < 0.3;
          tempColor.setHSL(0.0, 0.0, inSkull ? 0.92 : 0.05);
        }

        targets[i * 3] = tx;
        targets[i * 3 + 1] = ty;
        targets[i * 3 + 2] = tz;
        targetColors[i * 3] = tempColor.r;
        targetColors[i * 3 + 1] = tempColor.g;
        targetColors[i * 3 + 2] = tempColor.b;
      }
    }

    // Mouse interaction for subtle camera orbit
    let mouseX = 0;
    let mouseY = 0;
    const handleMouse = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouse);

    const clock = new THREE.Clock();
    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      computeTargets(time);

      // Lerp positions and colors toward targets
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      const col = geometry.attributes.color as THREE.BufferAttribute;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        pos.array[i3] += (targets[i3] - pos.array[i3]) * LERP_SPEED;
        pos.array[i3 + 1] +=
          (targets[i3 + 1] - pos.array[i3 + 1]) * LERP_SPEED;
        pos.array[i3 + 2] +=
          (targets[i3 + 2] - pos.array[i3 + 2]) * LERP_SPEED;

        col.array[i3] += (targetColors[i3] - col.array[i3]) * 0.02;
        col.array[i3 + 1] +=
          (targetColors[i3 + 1] - col.array[i3 + 1]) * 0.02;
        col.array[i3 + 2] +=
          (targetColors[i3 + 2] - col.array[i3 + 2]) * 0.02;
      }

      pos.needsUpdate = true;
      col.needsUpdate = true;

      // Subtle camera orbit
      camera.position.x += (8 + mouseX * 1.5 - camera.position.x) * 0.02;
      camera.position.y += (3 - mouseY * 0.8 - camera.position.y) * 0.02;
      camera.lookAt(0, 0.5, 0);

      renderer.render(scene, camera);
    }

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      <div ref={containerRef} id="hero-canvas" />

      {/* Gradient overlay at bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#0a0a0a] to-transparent" />

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-white md:text-7xl">
          Cole Ryan
        </h1>
        <p className="mb-8 max-w-lg text-lg text-white/60 md:text-xl">
          Writing insights on business, life, philosophy, and entrepreneurship.
        </p>
        <div className="flex gap-4">
          <a
            href="#subscribe"
            className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-black transition-all hover:bg-accent-hover hover:scale-105"
          >
            Subscribe
          </a>
          <a
            href="#articles"
            className="rounded-full border border-white/20 px-8 py-3 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5"
          >
            Read Articles
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg
          className="h-6 w-6 text-white/40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
}
