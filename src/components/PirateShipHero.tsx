"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const COUNT = 20000;
const NW = Math.floor(COUNT * 0.58);
const NH = Math.floor(COUNT * 0.175);
const NM = Math.floor(COUNT * 0.04);
const NS = Math.floor(COUNT * 0.135);
const OCEAN_GRID = Math.floor(Math.sqrt(NW));

export default function PirateShipHero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000610, 0.0065);

    const camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.set(22, 14, 30);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.28;
    controls.target.set(0, 1, 0);
    controls.minDistance = 6;
    controls.maxDistance = 180;

    // Post-processing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      2.0,
      0.55,
      0.0
    );
    composer.addPass(bloom);

    // Instanced mesh
    const geo = new THREE.TetrahedronGeometry(0.115, 0);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const target = new THREE.Vector3();

    // Smooth position buffer
    const sPos = new Float32Array(COUNT * 3);
    const initColor = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      sPos[i * 3] = (Math.random() - 0.5) * 60;
      sPos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      sPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
      mesh.setColorAt(i, initColor.setHSL(0.58, 0.8, 0.2));
    }

    // Parameters
    const wH = 1.6;
    const wS = 1.0;
    const tb = 1.0;
    const rk = 0.55;
    const os = 28;

    const clock = new THREE.Clock();
    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      const tW = time * wS;
      const bobY = Math.sin(tW * 0.68) * 0.2 * rk;
      const bobZ = Math.sin(tW * 0.43) * 0.08 * rk;
      const rAng =
        Math.sin(tW * 0.51) * 0.07 * rk +
        Math.sin(tW * 1.13) * 0.025 * rk;
      const cRoll = Math.cos(rAng);
      const sRoll = Math.sin(rAng);

      for (let i = 0; i < COUNT; i++) {
        if (i < NW) {
          // Ocean
          const col = i % OCEAN_GRID;
          const row = (i / OCEAN_GRID) | 0;
          const nx = col / (OCEAN_GRID - 1) - 0.5;
          const nz = row / (OCEAN_GRID - 1) - 0.5;
          const ox = nx * os * 2.2;
          const oz = nz * os * 2.2;

          const w1 = Math.sin(ox * 0.38 + tW * 1.0) * 1.0;
          const w2 = Math.sin(oz * 0.32 + tW * 1.22) * 0.88;
          const w3 = Math.sin((ox + oz) * 0.26 + tW * 0.87) * 0.68;
          const w4 = Math.cos(ox * 0.58 - tW * 1.48) * 0.42;
          const w5 = Math.cos(oz * 0.47 + tW * 1.76) * 0.34;
          const w6 = Math.sin((ox - oz) * 0.5 + tW * 2.05) * 0.22 * tb;
          const w7 =
            Math.sin(ox * 1.05 + oz * 0.68 + tW * 2.55) * 0.14 * tb;
          const w8 = Math.cos(ox * 0.22 - oz * 0.88 + tW * 0.62) * 0.18;
          const w9 =
            Math.sin(ox * 0.74 + oz * 0.44 - tW * 1.32) * 0.12 * tb;

          const oy = (w1 + w2 + w3 + w4 + w5 + w6 + w7 + w8 + w9) * wH;
          target.set(ox, oy, oz);

          const norm = Math.max(
            0,
            Math.min(1, oy / (wH * 3.2) + 0.5)
          );
          const crest = Math.max(0, norm - 0.76) * 4.0;
          const hue = 0.548 + norm * 0.072;
          const sat = 0.75 + (1.0 - norm) * 0.2;
          const lit = 0.06 + norm * 0.28 + crest * 0.5;
          color.setHSL(hue, sat, Math.min(0.98, lit));
        } else if (i < NW + NH) {
          // Hull
          const hi = i - NW;
          const uN = 64;
          const vN = Math.ceil(NH / uN);
          const u = (hi % uN) / (uN - 1 + 1e-6);
          const v = Math.floor(hi / uN) / (vN - 1 + 1e-6);
          const hx = (u - 0.5) * 6.4;
          const bowF = Math.max(0, (u - 0.62) / 0.38);
          const strnF = Math.max(0, (0.12 - u) / 0.12);
          const taper = Math.max(0.04, 1.0 - bowF * bowF - strnF * 0.55);
          const halfW = taper * 1.3 + 0.04;
          const halfD = taper * 0.92 + 0.03;
          const ang = v * Math.PI;
          const ly = -Math.sin(ang) * halfD;
          const lz = Math.cos(ang) * halfW;
          target.set(hx, ly * cRoll - lz * sRoll + bobY, ly * sRoll + lz * cRoll + bobZ);
          const dk = 0.16 + taper * 0.24;
          color.setHSL(0.072 + u * 0.018, 0.52, dk);
        } else if (i < NW + NH + NM) {
          // Masts
          const mi = i - NW - NH;
          const mn = mi / NM;
          const mIdx = mn < 0.5 ? 0 : mn < 0.78 ? 1 : 2;
          const mt =
            mIdx === 0
              ? mn / 0.5
              : mIdx === 1
                ? (mn - 0.5) / 0.28
                : (mn - 0.78) / 0.22;
          const mxPos = mIdx === 0 ? -0.2 : mIdx === 1 ? 1.5 : -1.9;
          const mHgt = mIdx === 0 ? 5.4 : mIdx === 1 ? 4.1 : 3.5;
          const ly = mt * mHgt;
          target.set(mxPos, ly * cRoll + bobY, ly * sRoll + bobZ);
          color.setHSL(0.07, 0.35, 0.24);
        } else if (i < NW + NH + NM + NS) {
          // Sails
          const si = i - NW - NH - NM;
          const s0 = Math.floor(NS * 0.44);
          const s1 = Math.floor(NS * 0.32);
          const sIdx = si < s0 ? 0 : si < s0 + s1 ? 1 : 2;
          const sr = sIdx === 0 ? si : sIdx === 1 ? si - s0 : si - s0 - s1;
          const ssz = sIdx === 0 ? s0 : sIdx === 1 ? s1 : NS - s0 - s1;
          const sC = 46;
          const sR = Math.max(1, Math.ceil(ssz / sC));
          const su = (sr % sC) / (sC - 1 + 1e-6);
          const sv = Math.floor(sr / sC) / (sR - 1 + 1e-6);
          const smx = sIdx === 0 ? -0.2 : sIdx === 1 ? -0.2 : 1.5;
          const sby = sIdx === 0 ? 0.25 : sIdx === 1 ? 2.75 : 0.25;
          const sww = sIdx === 0 ? 2.9 : sIdx === 1 ? 2.3 : 2.2;
          const shh = sIdx === 0 ? 2.4 : sIdx === 1 ? 1.5 : 1.9;
          const wind =
            0.38 + Math.sin(tW * 0.82) * 0.12 + Math.sin(tW * 2.1) * 0.04;
          const billow = Math.sin(su * Math.PI) * wind;
          const lx2 = smx + (su - 0.5) * sww;
          const ly2 = sby + sv * shh;
          const lz2 = billow;
          target.set(
            lx2,
            ly2 * cRoll - lz2 * sRoll + bobY,
            ly2 * sRoll + lz2 * cRoll + bobZ
          );
          const aged = 0.8 - sv * 0.1 + Math.sin(su * Math.PI) * 0.05;
          color.setHSL(0.1, 0.1, aged);
        } else {
          // Flag with "?"
          const fi = i - NW - NH - NM - NS;
          const fTot = COUNT - NW - NH - NM - NS;
          const fC = 32;
          const fR = Math.max(1, Math.ceil(fTot / fC));
          const fu = (fi % fC) / (fC - 1 + 1e-6);
          const fv = Math.floor(fi / fC) / (fR - 1 + 1e-6);
          const wave1 =
            Math.sin(fu * Math.PI * 2.0 + tW * 3.2) * fu * 0.24;
          const wave2 =
            Math.sin(fu * Math.PI * 3.5 + tW * 2.0) * fu * 0.08;
          const lx3 = -0.2 + fu * 0.9;
          const ly3 = 5.2 - fv * 0.55;
          const lz3 = wave1 + wave2;
          target.set(
            lx3,
            ly3 * cRoll - lz3 * sRoll + bobY,
            ly3 * sRoll + lz3 * cRoll + bobZ
          );
          // "?" SDF
          const qcx = 0.5,
            qcy = 0.7;
          const adx = fu - qcx,
            ady = fv - qcy;
          const arcR = Math.sqrt(adx * adx + ady * ady);
          const onRing = Math.abs(arcR - 0.22) < 0.09;
          const ang2 = Math.atan2(ady, adx);
          const inGap = ang2 > -2.9 && ang2 < -1.65;
          const onArc = onRing && !inGap;
          const onTail =
            Math.abs(fu - 0.5) < 0.07 && fv > qcy - 0.44 && fv < qcy - 0.25;
          const ddx = fu - 0.5,
            ddy = fv - 0.12;
          const onDot = Math.sqrt(ddx * ddx + ddy * ddy) < 0.09;
          const isQ = onArc || onTail || onDot;
          color.setHSL(0.0, 0.0, isQ ? 0.97 : 0.04);
        }

        // Smooth lerp
        const lf = 0.1;
        const sx = sPos[i * 3] + (target.x - sPos[i * 3]) * lf;
        const sy = sPos[i * 3 + 1] + (target.y - sPos[i * 3 + 1]) * lf;
        const sz = sPos[i * 3 + 2] + (target.z - sPos[i * 3 + 2]) * lf;
        sPos[i * 3] = sx;
        sPos[i * 3 + 1] = sy;
        sPos[i * 3 + 2] = sz;

        dummy.position.set(sx, sy, sz);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, color);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      controls.update();
      composer.render();
    }

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      composer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-screen w-full"
      style={{ background: "#000610" }}
    />
  );
}
