(() => {
  'use strict';

  const canvas = document.getElementById('mold3d-canvas');
  const stage = document.getElementById('scene3d');
  if (!canvas || !stage) return;

  // O texto de fallback dentro do <canvas> não deve ser usado para diagnosticar WebGL.
  // Limpa-o assim que o script encontra o canvas; falhas reais são tratadas abaixo.
  canvas.textContent = '';

  const showFallback = (message, error) => {
    if (error) console.error('[mold-3d] falha na inicialização:', error);
    canvas.style.display = 'none';
    let fallback = stage.querySelector('.viewer-3d-fallback');
    if (!fallback) {
      fallback = document.createElement('div');
      fallback.className = 'viewer-3d-fallback';
      fallback.style.cssText = 'display:grid;place-items:center;height:100%;padding:24px;text-align:center;color:#263548;background:#e2e9f0';
      stage.appendChild(fallback);
    }
    fallback.textContent = message;
  };

  if (typeof canvas.getContext !== 'function') {
    showFallback('Este navegador não disponibiliza a API Canvas necessária para o visualizador 3D.');
    return;
  }

  let gl;
  try {
    gl = canvas.getContext('webgl', {
      antialias: true,
      alpha: false,
      depth: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });
  } catch (error) {
    showFallback('Não foi possível inicializar o WebGL neste ambiente.', error);
    return;
  }

  if (!gl) {
    showFallback('O navegador disponibiliza Canvas, mas o WebGL está indisponível ou bloqueado neste ambiente.');
    return;
  }

  try {
    const vertexSource = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      uniform mat4 uMvp;
      uniform mat4 uModel;
      varying vec3 vNormal;
      void main() {
        gl_Position = uMvp * vec4(aPosition, 1.0);
        vNormal = mat3(uModel) * aNormal;
      }
    `;

    const fragmentSource = `
      precision mediump float;
      uniform vec3 uColor;
      varying vec3 vNormal;
      void main() {
        vec3 n = normalize(vNormal);
        vec3 light = normalize(vec3(-0.45, 0.80, 0.60));
        float diffuse = max(dot(n, light), 0.0);
        float rim = pow(1.0 - max(dot(n, vec3(0.0, 0.0, 1.0)), 0.0), 2.0) * 0.12;
        vec3 color = uColor * (0.30 + diffuse * 0.72 + rim);
        gl_FragColor = vec4(min(color, vec3(1.0)), 1.0);
      }
    `;

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Não foi possível criar shader WebGL.');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader) || 'erro de compilação sem detalhes';
        gl.deleteShader(shader);
        throw new Error(`Shader WebGL inválido: ${log}`);
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error('Não foi possível criar o programa WebGL.');
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Programa WebGL inválido: ${gl.getProgramInfoLog(program) || 'erro de link'}`);
    }
    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, 'aPosition');
    const normalLocation = gl.getAttribLocation(program, 'aNormal');
    const mvpLocation = gl.getUniformLocation(program, 'uMvp');
    const modelLocation = gl.getUniformLocation(program, 'uModel');
    const colorLocation = gl.getUniformLocation(program, 'uColor');
    if (positionLocation < 0 || normalLocation < 0 || !mvpLocation || !modelLocation || !colorLocation) {
      throw new Error('Os atributos/uniformes do programa WebGL não foram encontrados.');
    }

    const meshes = [];
    const addBox = (x, y, z, width, height, depth, color) => {
      const X = width / 2, Y = height / 2, Z = depth / 2;
      const points = [
        [-X,-Y,-Z],[X,-Y,-Z],[X,Y,-Z],[-X,Y,-Z],
        [-X,-Y,Z],[X,-Y,Z],[X,Y,Z],[-X,Y,Z]
      ];
      const faces = [
        [[0,1,2,3],[0,0,-1]], [[4,7,6,5],[0,0,1]],
        [[0,4,5,1],[0,-1,0]], [[3,2,6,7],[0,1,0]],
        [[0,3,7,4],[-1,0,0]], [[1,5,6,2],[1,0,0]]
      ];
      const data = [];
      for (const [ids, normal] of faces) {
        const triangles = [ids[0], ids[1], ids[2], ids[0], ids[2], ids[3]];
        for (const index of triangles) {
          const p = points[index];
          data.push(p[0] + x, p[1] + y, p[2] + z, normal[0], normal[1], normal[2]);
        }
      }
      meshes.push({ data: new Float32Array(data), color });
    };

    const addCylinder = (x, y, z, radius, height, color, axis = 'y', segments = 24) => {
      const data = [];
      for (let i = 0; i < segments; i += 1) {
        const j = (i + 1) % segments;
        const a = i * Math.PI * 2 / segments;
        const b = j * Math.PI * 2 / segments;
        let points;
        let normals;
        if (axis === 'y') {
          points = [
            [Math.cos(a)*radius,-height/2,Math.sin(a)*radius],
            [Math.cos(b)*radius,-height/2,Math.sin(b)*radius],
            [Math.cos(b)*radius,height/2,Math.sin(b)*radius],
            [Math.cos(a)*radius,height/2,Math.sin(a)*radius]
          ];
          normals = [
            [Math.cos(a),0,Math.sin(a)], [Math.cos(b),0,Math.sin(b)],
            [Math.cos(b),0,Math.sin(b)], [Math.cos(a),0,Math.sin(a)]
          ];
        } else {
          points = [
            [Math.cos(a)*radius,Math.sin(a)*radius,-height/2],
            [Math.cos(b)*radius,Math.sin(b)*radius,-height/2],
            [Math.cos(b)*radius,Math.sin(b)*radius,height/2],
            [Math.cos(a)*radius,Math.sin(a)*radius,height/2]
          ];
          normals = [
            [Math.cos(a),Math.sin(a),0], [Math.cos(b),Math.sin(b),0],
            [Math.cos(b),Math.sin(b),0], [Math.cos(a),Math.sin(a),0]
          ];
        }
        for (const triangle of [[0,1,2],[0,2,3]]) {
          for (const index of triangle) {
            const p = points[index], n = normals[index];
            data.push(p[0] + x, p[1] + y, p[2] + z, n[0], n[1], n[2]);
          }
        }
      }
      meshes.push({ data: new Float32Array(data), color });
    };

    // Molde conceitual: placas, cavidade/macho, colunas, buchas, canais e extração.
    addBox(0,-1.55,0,7.9,.55,5.25,[0.30,0.38,0.46]);
    addBox(0,2.35,-.35,7.15,.62,4.75,[0.55,0.62,0.69]);
    addBox(0,1.25,-.15,6.75,1.05,4.5,[0.72,0.77,0.82]);
    addBox(0,.20,.10,6.35,.28,4.18,[0.36,0.45,0.53]);
    addBox(0,-.68,.28,6.05,1.22,3.95,[0.63,0.70,0.76]);
    addBox(0,-1.32,.30,7.35,.28,4.85,[0.48,0.56,0.64]);
    addBox(0,-.55,2.15,2.55,.60,.26,[0.35,0.44,0.52]);
    addCylinder(0,-.15,2.32,.72,.45,[0.20,0.27,0.34]);
    addCylinder(0,.08,2.32,.42,.42,[0.74,0.80,0.85]);
    addCylinder(0,.50,2.12,.19,1.00,[0.86,0.90,0.93]);
    addCylinder(0,1.02,2.12,.33,.20,[0.45,0.53,0.61]);
    [[-2.8,-2.0],[-2.8,2.0],[2.8,-2.0],[2.8,2.0]].forEach(([x,z]) => {
      addCylinder(x,.35,z,.16,3.45,[0.84,0.89,0.93]);
      addCylinder(x,1.92,z,.28,.36,[0.34,0.43,0.51]);
      addCylinder(x,1.95,z,.17,.38,[0.78,0.84,0.89]);
    });
    [[-2.2,-.35],[2.2,-.35],[-2.2,-1.0],[2.2,-1.0],[-1.8,.42],[1.8,.42]].forEach(([x,y]) => addCylinder(x,y,2.28,.09,.18,[0.20,0.28,0.35],'z',12));
    [[-3.25,-1.05],[3.25,-1.05],[-3.25,1.45],[3.25,1.45]].forEach(([x,z]) => addCylinder(x,.25,z,.11,3.35,[0.43,0.51,0.59]));

    // Matrizes column-major compatíveis com WebGL.
    const identity = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    const multiply = (a,b) => {
      const out = new Float32Array(16);
      for (let column = 0; column < 4; column += 1) {
        for (let row = 0; row < 4; row += 1) {
          out[column*4+row] =
            a[row] * b[column*4] +
            a[4+row] * b[column*4+1] +
            a[8+row] * b[column*4+2] +
            a[12+row] * b[column*4+3];
        }
      }
      return out;
    };
    const perspective = (fovy, aspect, near, far) => {
      const f = 1 / Math.tan(fovy / 2);
      const out = new Float32Array(16);
      out[0] = f / aspect;
      out[5] = f;
      out[10] = (far + near) / (near - far);
      out[11] = -1;
      out[14] = (2 * far * near) / (near - far);
      return out;
    };
    const translate = (x,y,z) => { const out=identity(); out[12]=x; out[13]=y; out[14]=z; return out; };
    const rotateX = angle => { const out=identity(), c=Math.cos(angle), s=Math.sin(angle); out[5]=c; out[6]=s; out[9]=-s; out[10]=c; return out; };
    const rotateY = angle => { const out=identity(), c=Math.cos(angle), s=Math.sin(angle); out[0]=c; out[2]=-s; out[8]=s; out[10]=c; return out; };

    const buffers = meshes.map(mesh => {
      const buffer = gl.createBuffer();
      if (!buffer) throw new Error('Não foi possível criar buffer WebGL.');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
      return { buffer, color: mesh.color, count: mesh.data.length / 6 };
    });

    let yaw = -0.65;
    let pitch = -0.30;
    let zoom = 1;
    let auto = false;
    let drag = null;
    let pinchDistance = 0;
    let animationFrame = 0;
    let lastTime = 0;
    const initial = { yaw, pitch, zoom };

    const state = document.getElementById('viewer-state');
    const setState = text => { if (state) state.textContent = text; };
    const setAuto = enabled => {
      auto = enabled;
      const button = document.getElementById('rotate-auto');
      if (button) {
        button.setAttribute('aria-pressed', String(enabled));
        button.setAttribute('aria-label', enabled ? 'Parar rotação automática' : 'Iniciar rotação automática');
        button.classList.toggle('is-active', enabled);
      }
      setState(enabled ? 'Rotação automática ativa' : 'Rotação automática pausada');
    };

    const draw = () => {
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.clearColor(0.055, 0.075, 0.095, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const projection = perspective(Math.PI / 4, width / height, 0.1, 100);
      const view = multiply(translate(0, 0, -13.5 / zoom), multiply(rotateX(pitch), rotateY(yaw)));
      gl.useProgram(program);

      for (const mesh of buffers) {
        const model = identity();
        const mvp = multiply(projection, multiply(view, model));
        gl.uniformMatrix4fv(modelLocation, false, model);
        gl.uniformMatrix4fv(mvpLocation, false, mvp);
        gl.uniform3fv(colorLocation, mesh.color);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(normalLocation);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 24, 12);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
      }
    };

    const rotateLeft = document.getElementById('rotate-left');
    const rotateRight = document.getElementById('rotate-right');
    const rotateAuto = document.getElementById('rotate-auto');
    const rotateReset = document.getElementById('rotate-reset');
    rotateLeft?.addEventListener('click', () => { setAuto(false); yaw -= 0.32; draw(); });
    rotateRight?.addEventListener('click', () => { setAuto(false); yaw += 0.32; draw(); });
    rotateAuto?.addEventListener('click', () => setAuto(!auto));
    rotateReset?.addEventListener('click', () => { setAuto(false); yaw=initial.yaw; pitch=initial.pitch; zoom=initial.zoom; draw(); setState('Posição inicial'); });

    canvas.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      drag = { x:event.clientX, y:event.clientY, yaw, pitch };
      setAuto(false);
      canvas.setPointerCapture?.(event.pointerId);
      setState('Arrastando para examinar');
    });
    canvas.addEventListener('pointermove', event => {
      if (!drag) return;
      yaw = drag.yaw + (event.clientX - drag.x) * 0.008;
      pitch = Math.max(-1.1, Math.min(1.1, drag.pitch + (event.clientY - drag.y) * 0.006));
      draw();
    });
    const stopDrag = () => { drag = null; };
    canvas.addEventListener('pointerup', stopDrag);
    canvas.addEventListener('pointercancel', stopDrag);
    canvas.addEventListener('lostpointercapture', stopDrag);

    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      zoom = Math.max(0.72, Math.min(1.45, zoom * Math.exp(-event.deltaY * 0.001)));
      draw();
    }, { passive:false });

    canvas.addEventListener('touchmove', event => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      const distance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      if (pinchDistance) zoom = Math.max(0.72, Math.min(1.45, zoom * distance / pinchDistance));
      pinchDistance = distance;
      draw();
    }, { passive:false });
    canvas.addEventListener('touchend', () => { pinchDistance = 0; });

    const resize = () => draw();
    window.addEventListener('resize', resize, { passive:true });

    const animate = timestamp => {
      if (auto) {
        if (lastTime) yaw += (timestamp - lastTime) * 0.00045;
        draw();
      }
      lastTime = timestamp;
      animationFrame = window.requestAnimationFrame(animate);
    };

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) animationFrame = window.requestAnimationFrame(animate);
    else draw();

    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      showFallback('A sessão WebGL foi interrompida. Recarregue a página para reconstruir o visualizador.');
    });

    window.addEventListener('beforeunload', () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      buffers.forEach(mesh => gl.deleteBuffer(mesh.buffer));
      gl.deleteProgram(program);
    });

    draw();
  } catch (error) {
    showFallback('O visualizador 3D não conseguiu concluir a inicialização do WebGL. Veja o console para o erro técnico.', error);
  }
})();