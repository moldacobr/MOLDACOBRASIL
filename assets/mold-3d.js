(() => {
  'use strict';
  const stage = document.getElementById('scene3d');
  if (!stage) return;

  const old = stage.querySelector('.model3d');
  if (old) old.remove();
  const canvas = document.createElement('canvas');
  canvas.id = 'mold3d-canvas';
  canvas.setAttribute('aria-label', 'Modelo 3D interativo de molde de injeção');
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  stage.appendChild(canvas);

  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, depth: true, powerPreference: 'high-performance' });
  if (!gl) {
    const fallback = document.createElement('div');
    fallback.textContent = 'O visualizador 3D não está disponível neste navegador.';
    fallback.style.cssText = 'display:grid;place-items:center;height:100%;padding:24px;text-align:center;color:#263548;background:#e2e9f0';
    canvas.replaceWith(fallback);
    return;
  }

  const vs = 'attribute vec3 p; attribute vec3 n; uniform mat4 mvp; varying vec3 vn; void main(){gl_Position=mvp*vec4(p,1.0);vn=n;}';
  const fs = 'precision mediump float; uniform vec3 color; varying vec3 vn; void main(){vec3 N=normalize(vn),L=normalize(vec3(-.45,.8,.6));float d=max(dot(N,L),0.0);float r=pow(1.0-max(dot(N,vec3(0,0,1)),0.0),2.0)*.12;gl_FragColor=vec4(min(color*(.3+d*.72+r),vec3(1.0)),1.0);}';
  const shader = (type, src) => { const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)||'shader'); return s; };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER,vs));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER,fs));
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program)||'program');
  gl.useProgram(program);
  const P=gl.getAttribLocation(program,'p'), N=gl.getAttribLocation(program,'n'), MVP=gl.getUniformLocation(program,'mvp'), COLOR=gl.getUniformLocation(program,'color');

  const meshes=[];
  const box=(x,y,z,w,h,d,c)=>{const X=w/2,Y=h/2,Z=d/2,pts=[[-X,-Y,-Z],[X,-Y,-Z],[X,Y,-Z],[-X,Y,-Z],[-X,-Y,Z],[X,-Y,Z],[X,Y,Z],[-X,Y,Z]],faces=[[[0,1,2,3],[0,0,-1]],[[4,7,6,5],[0,0,1]],[[0,4,5,1],[0,-1,0]],[[3,2,6,7],[0,1,0]],[[0,3,7,4],[-1,0,0]],[[1,5,6,2],[1,0,0]]],a=[];faces.forEach(f=>[f[0][0],f[0][1],f[0][2],f[0][0],f[0][2],f[0][3]].forEach(i=>{const p=pts[i],n=f[1];a.push(p[0]+x,p[1]+y,p[2]+z,n[0],n[1],n[2]);}));meshes.push({a:new Float32Array(a),c});};
  const cyl=(x,y,z,r,h,c,axis='y',seg=20)=>{const a=[];for(let i=0;i<seg;i++){const q=i*Math.PI*2/seg,q2=(i+1)*Math.PI*2/seg,pts=axis==='y'?[[Math.cos(q)*r,-h/2,Math.sin(q)*r],[Math.cos(q2)*r,-h/2,Math.sin(q2)*r],[Math.cos(q2)*r,h/2,Math.sin(q2)*r],[Math.cos(q)*r,h/2,Math.sin(q)*r]]:[[Math.cos(q)*r,Math.sin(q)*r,-h/2],[Math.cos(q2)*r,Math.sin(q2)*r,-h/2],[Math.cos(q2)*r,Math.sin(q2)*r,h/2],[Math.cos(q)*r,Math.sin(q)*r,h/2]],ns=axis==='y'?[[Math.cos(q),0,Math.sin(q)],[Math.cos(q2),0,Math.sin(q2)],[Math.cos(q2),0,Math.sin(q2)],[Math.cos(q),0,Math.sin(q)]]:[[Math.cos(q),Math.sin(q),0],[Math.cos(q2),Math.sin(q2),0],[Math.cos(q2),Math.sin(q2),0],[Math.cos(q),Math.sin(q),0]];[[0,1,2],[0,2,3]].forEach(t=>t.forEach(i=>{const p=pts[i],n=ns[i];a.push(p[0]+x,p[1]+y,p[2]+z,n[0],n[1],n[2]);}));}meshes.push({a:new Float32Array(a),c});};

  // Molde industrial conceitual: placas, cavidade/macho, bico, colunas, buchas e pinos de extração.
  box(0,-1.7,0,8,.55,5.3,.30); box(0,2.35,-.25,7.3,.62,4.8,.58); box(0,1.25,0,6.8,1.0,4.45,.72); box(0,.28,.1,6.35,.25,4.1,.40); box(0,-.62,.25,6.05,1.15,3.9,.64); box(0,-1.28,.25,7.35,.28,4.85,.48);
  box(0,-.48,2.05,2.6,.55,.30,.38); cyl(0,-.05,2.22,.70,.42,.22); cyl(0,.35,2.22,.40,.38,.76); cyl(0,.76,2.05,.18,.95,.88); cyl(0,1.27,2.05,.30,.18,.45);
  [[-2.8,-2],[2.8,-2],[-2.8,2],[2.8,2]].forEach(v=>{cyl(v[0],.25,v[1],.16,3.5,.86);cyl(v[0],1.95,v[1],.28,.34,.34);cyl(v[0],1.96,v[1],.17,.38,.78);});
  [[-2.25,-.35],[2.25,-.35],[-2.25,-1.0],[2.25,-1.0],[-1.8,.42],[1.8,.42]].forEach(v=>cyl(v[0],v[1],2.22,.085,.20,.20,'z',12));

  const I=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  const mul=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;};
  const tr=(x,y,z)=>{const o=I();o[12]=x;o[13]=y;o[14]=z;return o;};
  const rx=a=>{const o=I(),c=Math.cos(a),s=Math.sin(a);o[5]=c;o[6]=s;o[9]=-s;o[10]=c;return o;};
  const ry=a=>{const o=I(),c=Math.cos(a),s=Math.sin(a);o[0]=c;o[2]=-s;o[8]=s;o[10]=c;return o;};
  const proj=(f,a,n,far)=>{const t=1/Math.tan(f/2),o=new Float32Array(16);o[0]=t/a;o[5]=t;o[10]=(far+n)/(n-far);o[11]=-1;o[14]=2*far*n/(n-far);return o;};
  const buffers=meshes.map(m=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,m.a,gl.STATIC_DRAW);return {b,c:m.c,count:m.a.length/6};});

  let yaw=-.65,pitch=-.30,zoom=1,auto=false,drag=null,pinch=0,last=0;
  const state=document.getElementById('viewer-state');
  const msg=t=>{if(state)state.textContent=t;};
  const setAuto=v=>{auto=v;const b=document.getElementById('rotate-auto');if(b){b.setAttribute('aria-pressed',String(v));b.textContent=v?'⏸ Auto':'⟳ Auto';}msg(v?'Rotação automática ativa':'Rotação automática pausada');};
  const render=()=>{const r=stage.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.floor(r.width*d)),h=Math.max(1,Math.floor(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);gl.enable(gl.DEPTH_TEST);gl.clearColor(.055,.075,.095,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const view=mul(tr(0,0,-13.5/zoom),mul(rx(pitch),ry(yaw))),pr=proj(Math.PI/4,w/h,.1,100);buffers.forEach(m=>{const mvp=mul(pr,mul(view,I()));gl.uniformMatrix4fv(MVP,false,mvp);gl.uniform3fv(COLOR,m.c);gl.bindBuffer(gl.ARRAY_BUFFER,m.b);gl.enableVertexAttribArray(P);gl.vertexAttribPointer(P,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(N);gl.vertexAttribPointer(N,3,gl.FLOAT,false,24,12);gl.drawArrays(gl.TRIANGLES,0,m.count);});};
  const frame=t=>{if(!last)last=t;const dt=Math.min(.05,(t-last)/1000);last=t;if(auto)yaw+=dt*.65;render();requestAnimationFrame(frame);};
  const dist=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,id:e.pointerId};auto=false;msg('Arraste para girar • roda para zoom');});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;yaw+=dx*.012;pitch=Math.max(-1.25,Math.min(1.25,pitch+dy*.008));});
  canvas.addEventListener('pointerup',()=>{drag=null;});canvas.addEventListener('pointercancel',()=>{drag=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.72,Math.min(1.65,zoom*(e.deltaY<0?1.08:.93)));},{passive:false});
  const left=document.getElementById('rotate-left'),right=document.getElementById('rotate-right'),ab=document.getElementById('rotate-auto'),reset=document.getElementById('rotate-reset');
  if(left)left.addEventListener('click',()=>{yaw-=.35;msg('Giro para a esquerda');});
  if(right)right.addEventListener('click',()=>{yaw+=.35;msg('Giro para a direita');});
  if(ab)ab.addEventListener('click',()=>setAuto(!auto));
  if(reset)reset.addEventListener('click',()=>{yaw=-.65;pitch=-.30;zoom=1;setAuto(false);msg('Posição inicial restaurada');});
  const ro=new ResizeObserver(render);ro.observe(stage);
  const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced)setAuto(false);
  setAuto(false);requestAnimationFrame(frame);
})();
