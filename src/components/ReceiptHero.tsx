"use client";

import { useEffect, useRef } from "react";

export default function ReceiptHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* ═══════════════════════════════════════════
       Configuration
       ═══════════════════════════════════════════ */

    const COLS = 35, ROWS = 70;
    const CW = 3.0, CH = 6.0;
    const NX = COLS + 1, NY = ROWS + 1, NP = NX * NY;

    const GRAV = 0.003;
    const DAMP = 0.988;
    const ITERS = 15;
    const M_RAD = 0.65;
    const M_SPRING = 0.025;

    /* ═══════════════════════════════════════════
       Receipt Texture (1024 × 2048)
       ═══════════════════════════════════════════ */

    function makeReceipt() {
      const cv = document.createElement("canvas"), W = 1024, H = 2048;
      cv.width = W; cv.height = H;
      const x = cv.getContext("2d")!;
      const S = 2;

      x.fillStyle = "#f5f1ea";
      x.fillRect(0, 0, W, H);
      const id = x.getImageData(0, 0, W, H), d = id.data;
      for (let p = 0; p < d.length; p += 4) {
        const n = (Math.random() - 0.5) * 10;
        d[p] += n; d[p + 1] += n; d[p + 2] += n;
      }
      x.putImageData(id, 0, 0);

      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(245,241,234,0)");
      g.addColorStop(0.97, "rgba(245,241,234,0)");
      g.addColorStop(1, "rgba(220,216,208,.6)");
      x.fillStyle = g; x.fillRect(0, 0, W, H);

      x.textBaseline = "top"; x.fillStyle = "#1a1a1a";
      let y = 96;
      const lh = 60, mg = 100;

      function ctr(t: string, font?: string, col?: string) {
        x.font = font || (16 * S) + "px 'Courier New',monospace";
        if (col) x.fillStyle = col;
        x.textAlign = "center"; x.fillText(t, W / 2, y);
        x.fillStyle = "#1a1a1a"; y += lh;
      }
      function lft(t: string) {
        x.font = (16 * S) + "px 'Courier New',monospace";
        x.textAlign = "left"; x.fillText(t, mg, y); y += lh;
      }
      function lr(l: string, r: string) {
        x.font = (16 * S) + "px 'Courier New',monospace";
        x.textAlign = "left"; x.fillText(l, mg, y);
        x.textAlign = "right"; x.fillText(r, W - mg, y); y += lh;
      }
      function dash() {
        x.font = (14 * S) + "px 'Courier New',monospace";
        x.textAlign = "center"; x.fillStyle = "#999";
        x.fillText("- - - - - - - - - - - - - -", W / 2, y);
        x.fillStyle = "#1a1a1a"; y += lh;
      }
      function thick() {
        x.fillStyle = "#333";
        x.fillRect(mg, y + 20, W - mg * 2, 5);
        x.fillStyle = "#1a1a1a"; y += lh;
      }

      ctr("WHOISWRITING", "bold " + (30 * S) + "px 'Courier New',monospace");
      y += 4; thick();
      ctr("Cole Ryan", (17 * S) + "px 'Courier New',monospace");
      ctr("Newsletter & Essays", (14 * S) + "px 'Courier New',monospace", "#666");
      ctr("whoiswriting.com", (14 * S) + "px 'Courier New',monospace", "#777");
      y += 28;
      lft("Date: 2026-03-27  09:00");
      lft("Reader: #04,271");
      y += 12; dash(); y += 12;
      lr("Business Strategy", "\u2713");
      lr("Life Lessons", "\u2713");
      lr("Philosophy", "\u2713");
      lr("Entrepreneurship", "\u2713");
      lr("Weekly Delivery", "\u2713");
      y += 12; dash(); y += 12;
      lr("Frequency", "Weekly");
      lr("Read Time", "~5 min");
      y += 12; thick(); y += 12;
      x.font = "bold " + (22 * S) + "px 'Courier New',monospace";
      x.textAlign = "left"; x.fillText("SUBSCRIPTION", mg, y);
      x.textAlign = "right"; x.fillText("FREE", W - mg, y);
      y += lh + 20; dash(); y += 36;
      ctr("Thank you for reading!", (15 * S) + "px 'Courier New',monospace", "#555");
      y += 4;
      ctr("@coleryan", (13 * S) + "px 'Courier New',monospace", "#999");

      return cv;
    }

    /* ═══════════════════════════════════════════
       Particle Arrays
       ═══════════════════════════════════════════ */

    const pos = new Float32Array(NP * 3);
    const prv = new Float32Array(NP * 3);
    const pin = new Uint8Array(NP);
    const nrm = new Float32Array(NP * 3);
    const uvs = new Float32Array(NP * 2);

    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const idx = j * NX + i, i3 = idx * 3;
        const px = (i / COLS - 0.5) * CW;
        const py = -(j / ROWS) * CH;
        pos[i3] = px; pos[i3 + 1] = py; pos[i3 + 2] = 0;
        prv[i3] = px; prv[i3 + 1] = py; prv[i3 + 2] = 0;
        uvs[idx * 2] = i / COLS;
        uvs[idx * 2 + 1] = j / ROWS;
        if (j === 0) pin[idx] = 1;
      }
    }

    /* ═══════════════════════════════════════════
       Constraints
       ═══════════════════════════════════════════ */

    const _cA: number[] = [], _cB: number[] = [], _cR: number[] = [];
    function addC(a: number, b: number) {
      const dx = pos[a * 3] - pos[b * 3];
      const dy = pos[a * 3 + 1] - pos[b * 3 + 1];
      const dz = pos[a * 3 + 2] - pos[b * 3 + 2];
      _cA.push(a); _cB.push(b);
      _cR.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
    }

    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const idx = j * NX + i;
        if (i < COLS) addC(idx, idx + 1);
        if (j < ROWS) addC(idx, idx + NX);
        if (i < COLS && j < ROWS) addC(idx, idx + NX + 1);
        if (i > 0 && j < ROWS) addC(idx, idx + NX - 1);
        if (i + 2 <= COLS) addC(idx, idx + 2);
        if (j + 2 <= ROWS) addC(idx, idx + 2 * NX);
      }
    }

    const NC = _cA.length;
    const cA = new Int32Array(_cA), cB = new Int32Array(_cB), cR = new Float32Array(_cR);

    /* ═══════════════════════════════════════════
       Triangle Indices
       ═══════════════════════════════════════════ */

    const tri = new Uint16Array(COLS * ROWS * 6);
    let ti = 0;
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        const tl = j * NX + i;
        tri[ti++] = tl; tri[ti++] = tl + NX; tri[ti++] = tl + 1;
        tri[ti++] = tl + 1; tri[ti++] = tl + NX; tri[ti++] = tl + NX + 1;
      }
    }
    const NI = ti;

    /* ═══════════════════════════════════════════
       Matrix Helpers
       ═══════════════════════════════════════════ */

    function m4() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }

    function persp(o: Float32Array, fov: number, a: number, n: number, f: number) {
      const t = 1 / Math.tan(fov * 0.5), nf = 1 / (n - f);
      o.fill(0);
      o[0] = t / a; o[5] = t; o[10] = (f + n) * nf; o[11] = -1; o[14] = 2 * f * n * nf;
    }

    function lookAt(o: Float32Array, e: number[], c: number[], u: number[]) {
      let fx = c[0] - e[0], fy = c[1] - e[1], fz = c[2] - e[2];
      let l = Math.sqrt(fx * fx + fy * fy + fz * fz); fx /= l; fy /= l; fz /= l;
      let sx = fy * u[2] - fz * u[1], sy = fz * u[0] - fx * u[2], sz = fx * u[1] - fy * u[0];
      l = Math.sqrt(sx * sx + sy * sy + sz * sz); sx /= l; sy /= l; sz /= l;
      const ux = sy * fz - sz * fy, uy = sz * fx - sx * fz, uz = sx * fy - sy * fx;
      o[0] = sx; o[4] = sy; o[8] = sz; o[12] = -(sx * e[0] + sy * e[1] + sz * e[2]);
      o[1] = ux; o[5] = uy; o[9] = uz; o[13] = -(ux * e[0] + uy * e[1] + uz * e[2]);
      o[2] = -fx; o[6] = -fy; o[10] = -fz; o[14] = fx * e[0] + fy * e[1] + fz * e[2];
      o[3] = 0; o[7] = 0; o[11] = 0; o[15] = 1;
    }

    function mul(o: Float32Array, a: Float32Array, b: Float32Array) {
      for (let c = 0; c < 4; c++) {
        const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
        o[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
        o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
        o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
        o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
      }
    }

    function inv(o: Float32Array, m: Float32Array) {
      const a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5], g = m[6], h = m[7],
        ii = m[8], j = m[9], k = m[10], l = m[11], M = m[12], n = m[13], p = m[14], q = m[15];
      const t0 = a * f - b * e, t1 = a * g - c * e, t2 = a * h - d * e, t3 = b * g - c * f,
        t4 = b * h - d * f, t5 = c * h - d * g, t6 = ii * n - j * M, t7 = ii * p - k * M,
        t8 = ii * q - l * M, t9 = j * p - k * n, tA = j * q - l * n, tB = k * q - l * p;
      let D = t0 * tB - t1 * tA + t2 * t9 + t3 * t8 - t4 * t7 + t5 * t6;
      if (!D) return; D = 1 / D;
      o[0] = (f * tB - g * tA + h * t9) * D; o[1] = (c * tA - b * tB - d * t9) * D;
      o[2] = (n * t5 - p * t4 + q * t3) * D; o[3] = (k * t4 - j * t5 - l * t3) * D;
      o[4] = (g * t8 - e * tB - h * t7) * D; o[5] = (a * tB - c * t8 + d * t7) * D;
      o[6] = (p * t2 - M * t5 - q * t1) * D; o[7] = (ii * t5 - k * t2 + l * t1) * D;
      o[8] = (e * tA - f * t8 + h * t6) * D; o[9] = (b * t8 - a * tA - d * t6) * D;
      o[10] = (M * t4 - n * t2 + q * t0) * D; o[11] = (j * t2 - ii * t4 - l * t0) * D;
      o[12] = (f * t7 - e * t9 - g * t6) * D; o[13] = (a * t9 - b * t7 + c * t6) * D;
      o[14] = (n * t1 - M * t3 - p * t0) * D; o[15] = (ii * t3 - j * t1 + k * t0) * D;
    }

    /* ═══════════════════════════════════════════
       WebGL Setup
       ═══════════════════════════════════════════ */

    let cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    const gl = canvas.getContext("webgl", {
      antialias: true, alpha: true, premultipliedAlpha: false
    })!;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);

    const VS = `
      attribute vec3 aP, aN;
      attribute vec2 aU;
      uniform mat4 uVP;
      varying vec3 vN;
      varying vec2 vU;
      void main() {
        vN = aN;
        vU = aU;
        gl_Position = uVP * vec4(aP, 1.0);
      }`;

    const FS = `
      precision highp float;
      varying vec3 vN;
      varying vec2 vU;
      uniform sampler2D uT;
      void main() {
        vec3 n = normalize(gl_FrontFacing ? vN : -vN);
        vec3 L1 = normalize(vec3(0.4, 0.8, 1.0));
        vec3 L2 = normalize(vec3(-0.5, 0.3, 0.6));
        float d1 = max(dot(n, L1), 0.0);
        float d2 = max(dot(n, L2), 0.0);
        float hemi = dot(n, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
        float amb = mix(0.50, 0.62, hemi);
        vec4 tx = texture2D(uT, vU);
        vec3 col = tx.rgb * (amb + d1 * 0.38 + d2 * 0.12);
        if (!gl_FrontFacing) col *= 0.80;
        gl_FragColor = vec4(col, 1.0);
      }`;

    function mkS(type: number, src: string) {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      return s;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, mkS(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, mkS(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog); gl.useProgram(prog);

    const aP = gl.getAttribLocation(prog, "aP");
    const aN = gl.getAttribLocation(prog, "aN");
    const aU = gl.getAttribLocation(prog, "aU");
    const uVP = gl.getUniformLocation(prog, "uVP");
    const uT = gl.getUniformLocation(prog, "uT");
    gl.enableVertexAttribArray(aP);
    gl.enableVertexAttribArray(aN);
    gl.enableVertexAttribArray(aU);

    const posBuf = gl.createBuffer();
    const nrmBuf = gl.createBuffer();
    const uvBuf = gl.createBuffer();
    const idxBuf = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tri, gl.STATIC_DRAW);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, makeReceipt());
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic") ||
      gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
    if (aniso) {
      const maxAniso = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(maxAniso, 8));
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uT, 0);

    /* ── Camera ── */

    const eye = [0, -3, 8], center = [0, -3, 0];
    const vMat = m4(), pMat = m4(), vpMat = m4(), ivp = m4();
    lookAt(vMat, eye, center, [0, 1, 0]);
    persp(pMat, Math.PI * 0.28, cssW / cssH, 0.1, 100);
    mul(vpMat, pMat, vMat);
    inv(ivp, vpMat);
    gl.uniformMatrix4fv(uVP, false, vpMat);

    /* ═══════════════════════════════════════════
       Mouse Unprojection
       ═══════════════════════════════════════════ */

    function projPt(wx: number, wy: number, wz: number) {
      const x = vpMat[0] * wx + vpMat[4] * wy + vpMat[8] * wz + vpMat[12];
      const y = vpMat[1] * wx + vpMat[5] * wy + vpMat[9] * wz + vpMat[13];
      const z = vpMat[2] * wx + vpMat[6] * wy + vpMat[10] * wz + vpMat[14];
      const w = vpMat[3] * wx + vpMat[7] * wy + vpMat[11] * wz + vpMat[15];
      return [(x / w + 1) * 0.5 * cssW, (1 - y / w) * 0.5 * cssH, (z / w + 1) * 0.5];
    }

    function unprojPt(sx: number, sy: number, sz: number) {
      const nx = sx / cssW * 2 - 1, ny = 1 - sy / cssH * 2, nz = sz * 2 - 1;
      const x = ivp[0] * nx + ivp[4] * ny + ivp[8] * nz + ivp[12];
      const y = ivp[1] * nx + ivp[5] * ny + ivp[9] * nz + ivp[13];
      const z = ivp[2] * nx + ivp[6] * ny + ivp[10] * nz + ivp[14];
      const w = ivp[3] * nx + ivp[7] * ny + ivp[11] * nz + ivp[15];
      return [x / w, y / w, z / w];
    }

    let baseProj = projPt(0, -3, 0);
    let dragZ = baseProj[2];

    /* ═══════════════════════════════════════════
       Pointer Events
       ═══════════════════════════════════════════ */

    let mouseDown = false;
    let mwx = 0, mwy = 0;
    let pmwx = 0, pmwy = 0;
    let mwValid = false;

    function onPointerDown(e: PointerEvent) {
      mouseDown = true;
      canvas.classList.add("grabbing");
      canvas.setPointerCapture(e.pointerId);

      let best = -1, bd = 80;
      for (let i = 0; i < NP; i++) {
        if (pin[i]) continue;
        const sp = projPt(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        const d = Math.sqrt((sp[0] - e.clientX) ** 2 + (sp[1] - e.clientY) ** 2);
        if (d < bd) { bd = d; best = i; }
      }
      if (best >= 0) {
        const sp = projPt(pos[best * 3], pos[best * 3 + 1], pos[best * 3 + 2]);
        dragZ = sp[2];
      }

      const wp = unprojPt(e.clientX, e.clientY, dragZ);
      mwx = wp[0]; mwy = wp[1];
      pmwx = mwx; pmwy = mwy;
      mwValid = true;
    }

    function onPointerMove(e: PointerEvent) {
      if (!mouseDown) return;
      const wp = unprojPt(e.clientX, e.clientY, dragZ);
      mwx = wp[0]; mwy = wp[1];
    }

    function release() {
      mouseDown = false;
      mwValid = false;
      canvas.classList.remove("grabbing");
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);

    /* ═══════════════════════════════════════════
       Physics Simulation
       ═══════════════════════════════════════════ */

    function simulate() {
      let mdx = 0, mdy = 0;
      if (mouseDown && mwValid) {
        mdx = mwx - pmwx;
        mdy = mwy - pmwy;
        const mdLen = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdLen > 0.4) { const sc = 0.4 / mdLen; mdx *= sc; mdy *= sc; }
      }

      if (mouseDown) {
        for (let i = 0; i < NP; i++) {
          if (pin[i]) continue;
          const ix = i * 3, iy = ix + 1;
          const dx = pos[ix] - mwx, dy = pos[iy] - mwy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= M_RAD) continue;

          let inf = 1 - dist / M_RAD;
          inf *= inf;

          let vx = pos[ix] - prv[ix];
          let vy = pos[iy] - prv[iy];
          vx = mdx * inf + vx * (1 - inf);
          vy = mdy * inf + vy * (1 - inf);

          vx += (mwx - pos[ix]) * M_SPRING * inf;
          vy += (mwy - pos[iy]) * M_SPRING * inf;

          prv[ix] = pos[ix] - vx;
          prv[iy] = pos[iy] - vy;
        }
      }

      for (let i = 0; i < NP; i++) {
        if (pin[i]) continue;
        const ix = i * 3, iy = ix + 1, iz = ix + 2;

        const vx = (pos[ix] - prv[ix]) * DAMP;
        const vy = (pos[iy] - prv[iy]) * DAMP;
        const vz = (pos[iz] - prv[iz]) * DAMP;

        prv[ix] = pos[ix]; prv[iy] = pos[iy]; prv[iz] = pos[iz];

        let grav = GRAV;
        if (mouseDown) {
          const dx = pos[ix] - mwx, dy = pos[iy] - mwy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < M_RAD) {
            let inf = 1 - dist / M_RAD; inf *= inf;
            grav *= (1 - inf * 0.9);
          }
        }

        pos[ix] += vx;
        pos[iy] += vy - grav;
        pos[iz] += vz;
      }

      for (let it = 0; it < ITERS; it++) {
        let start: number, end: number, step: number;
        if (it & 1) { start = NC - 1; end = -1; step = -1; }
        else { start = 0; end = NC; step = 1; }

        for (let c = start; c !== end; c += step) {
          const a = cA[c], b = cB[c], rest = cR[c];
          const ax = a * 3, bx = b * 3;
          let dx = pos[bx] - pos[ax], dy = pos[bx + 1] - pos[ax + 1], dz = pos[bx + 2] - pos[ax + 2];
          const dSq = dx * dx + dy * dy + dz * dz;
          if (dSq < 1e-14) continue;
          const d = Math.sqrt(dSq);
          const f = (d - rest) / d * 0.5;
          dx *= f; dy *= f; dz *= f;

          const fa = pin[a], fb = pin[b];
          if (fa && fb) continue;
          if (!fa && !fb) {
            pos[ax] += dx; pos[ax + 1] += dy; pos[ax + 2] += dz;
            pos[bx] -= dx; pos[bx + 1] -= dy; pos[bx + 2] -= dz;
          } else if (fa) {
            pos[bx] -= dx * 2; pos[bx + 1] -= dy * 2; pos[bx + 2] -= dz * 2;
          } else {
            pos[ax] += dx * 2; pos[ax + 1] += dy * 2; pos[ax + 2] += dz * 2;
          }
        }
      }

      pmwx = mwx; pmwy = mwy;
    }

    /* ═══════════════════════════════════════════
       Normals
       ═══════════════════════════════════════════ */

    function calcNormals() {
      nrm.fill(0);
      for (let t = 0; t < NI; t += 3) {
        const i0 = tri[t], i1 = tri[t + 1], i2 = tri[t + 2];
        const e1x = pos[i1 * 3] - pos[i0 * 3], e1y = pos[i1 * 3 + 1] - pos[i0 * 3 + 1], e1z = pos[i1 * 3 + 2] - pos[i0 * 3 + 2];
        const e2x = pos[i2 * 3] - pos[i0 * 3], e2y = pos[i2 * 3 + 1] - pos[i0 * 3 + 1], e2z = pos[i2 * 3 + 2] - pos[i0 * 3 + 2];
        const nx = e1y * e2z - e1z * e2y;
        const ny = e1z * e2x - e1x * e2z;
        const nz = e1x * e2y - e1y * e2x;
        nrm[i0 * 3] += nx; nrm[i0 * 3 + 1] += ny; nrm[i0 * 3 + 2] += nz;
        nrm[i1 * 3] += nx; nrm[i1 * 3 + 1] += ny; nrm[i1 * 3 + 2] += nz;
        nrm[i2 * 3] += nx; nrm[i2 * 3 + 1] += ny; nrm[i2 * 3 + 2] += nz;
      }
      for (let i = 0; i < NP; i++) {
        const x = nrm[i * 3], y = nrm[i * 3 + 1], z = nrm[i * 3 + 2];
        const l = Math.sqrt(x * x + y * y + z * z) || 1;
        nrm[i * 3] /= l; nrm[i * 3 + 1] /= l; nrm[i * 3 + 2] /= l;
      }
    }

    /* ═══════════════════════════════════════════
       Render Loop
       ═══════════════════════════════════════════ */

    let animId: number;

    function frame() {
      simulate();
      calcNormals();

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf);
      gl.bufferData(gl.ARRAY_BUFFER, nrm, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
      gl.vertexAttribPointer(aU, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.drawElements(gl.TRIANGLES, NI, gl.UNSIGNED_SHORT, 0);

      animId = requestAnimationFrame(frame);
    }
    animId = requestAnimationFrame(frame);

    /* ═══════════════════════════════════════════
       Resize
       ═══════════════════════════════════════════ */

    function handleResize() {
      cssW = canvas.clientWidth; cssH = canvas.clientHeight;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      persp(pMat, Math.PI * 0.28, cssW / cssH, 0.1, 100);
      mul(vpMat, pMat, vMat);
      inv(ivp, vpMat);
      gl.uniformMatrix4fv(uVP, false, vpMat);
      baseProj = projPt(0, -3, 0);
      dragZ = baseProj[2];
    }
    window.addEventListener("resize", handleResize);

    /* ═══════════════════════════════════════════
       Cleanup
       ═══════════════════════════════════════════ */

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointercancel", release);
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#e8e4df",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          cursor: "grab",
        }}
      />
      <p
        style={{
          position: "absolute",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          color: "#b0a99f",
          fontSize: 13,
          letterSpacing: "0.06em",
          fontWeight: 300,
          fontFamily: "system-ui, -apple-system, sans-serif",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        Grab and drag the receipt
      </p>
    </div>
  );
}
