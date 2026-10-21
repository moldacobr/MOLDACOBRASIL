(() => {
  'use strict';
  const canvas = document.getElementById('mold3d-canvas');
  const stage = document.getElementById('scene3d');
  if (!canvas || !stage) return;

  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' });
  if (!gl) {
    stage.innerHTML = '<div style="display:grid;place-items:center;height:100%;padding:24px;text-align:center">Seu navegador não disponibilizou WebGL para o visualizador 3D.</div>';
    return;
  }

  const vs = `attribute vec3 aPosition; attribute vec3 aNormal; uniform mat4 uMvp; uniform mat4 uModel; varying vec3 vNormal; void main(){ gl_Position=uMvp*vec4(aPosition,1.0); vNormal=mat3(uModel)*aNormal; }`;
  const fs = `precision mediump float; uniform vec3 uColor; varying vec3 vNormal; void main(){ vec3 n=normalize(vNormal); vec3 l=normalize(vec3(-0.45,0.8,0.6)); float d=max(dot(n,l),0.0); float rim=pow(1.0-max(dot(n,normalize(vec3(0.0,0.0,1.0))),0.0),2.0)*0.12; vec3 c=uColor*(0.30+d*0.72+rim); gl_FragColor=vec4(min(c,vec3(1.0)),1.0); }`;
  const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Falha no shader');return s;};
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Falha no WebGL');gl.useProgram(program);
  const posLoc=gl.getAttribLocation(program,'aPosition'), normalLoc=gl.getAttribLocation(program,'aNormal');
  const mvpLoc=gl.getUniformLocation(program,'uMvp'), modelLoc=gl.getUniformLocation(program,'uModel'), colorLoc=gl.getUniformLocation(program,'uColor');

  const meshes=[];
  const box=(x,y,z,w,h,d,color)=>{
    const X=w/2,Y=h/2,Z=d/2;
    const p=[[-X,-Y,-Z],[X,-Y,-Z],[X,Y,-Z],[-X,Y,-Z],[-X,-Y,Z],[X,-Y,Z],[X,Y,Z],[-X,Y,Z]];
    const f=[[0,1,2,3,0,0,-1],[4,7,6,5,0,0,1],[0,4,5,1,0,-1,0],[3,2,6,7,0,1,0],[0,3,7,4,-1,0,0],[1,5,6,2,1,0,0]];
    const a=[];for(const q of f){const ids=q.slice(0,4),n=q.slice(4);const tri=[ids[0],ids[1],ids[2],ids[0],ids[2],ids[3]];for(const i of tri){a.push(p[i][0]+x,p[i][1]+y,p[i][2]+z,n[0],n[1],n[2]);}}meshes.push({data:new Float32Array(a),color});
  };
  const cyl=(x,y,z,r,h,color,axis='y',seg=24)=>{
    const a=[];for(let i=0;i<seg;i++){const j=(i+1)%seg,A=i*Math.PI*2/seg,B=j*Math.PI*2/seg;let pts;if(axis==='y')pts=[[Math.cos(A)*r,-h/2,Math.sin(A)*r],[Math.cos(B)*r,-h/2,Math.sin(B)*r],[Math.cos(B)*r,h/2,Math.sin(B)*r],[Math.cos(A)*r,h/2,Math.sin(A)*r]];else pts=[[Math.cos(A)*r,Math.sin(A)*r,-h/2],[Math.cos(B)*r,Math.sin(B)*r,-h/2],[Math.cos(B)*r,Math.sin(B)*r,h/2],[Math.cos(A)*r,Math.sin(A)*r,h/2]];const n=axis==='y'?[[Math.cos(A),0,Math.sin(A)],[Math.cos(B),0,Math.sin(B)],[Math.cos(B),0,Math.sin(B)],[Math.cos(A),0,Math.sin(A)]]:[[Math.cos(A),Math.sin(A),0],[Math.cos(B),Math.sin(B),0],[Math.cos(B),Math.sin(B),0],[Math.cos(A),Math.sin(A),0]];for(const ids of [[0,1,2],[0,2,3]])for(const k of ids){const p=pts[k],nn=n[k];a.push(p[0]+x,p[1]+y,p[2]+z,nn[0],nn[1],nn[2]);}}meshes.push({data:new Float32Array(a),color});
  };

  // Molde conceitual: placas, cavidade/macho, colunas-guia, buchas, canais e extração.
  box(0,-1.55,0,7.9,.55,5.25,[0.30,0.38,0.46]);
  box(0,2.35,-.35,7.15,.62,4.75,[0.55,0.62,0.69]);
  box(0,1.25,-.15,6.75,1.05,4.5,[0.72,0.77,0.82]);
  box(0,.20,.10,6.35,.28,4.18,[0.36,0.45,0.53]);
  box(0,-.68,.28,6.05,1.22,3.95,[0.63,0.70,0.76]);
  box(0,-1.32,.30,7.35,.28,4.85,[0.48,0.56,0.64]);
  box(0,-.55,2.15,2.55,.60,.26,[0.35,0.44,0.52]);
  cyl(0,-.15,2.32,.72,.45,[0.20,0.27,0.34]);
  cyl(0,.08,2.32,.42,.42,[0.74,0.80,0.85]);
  cyl(0,.50,2.12,.19,1.00,[0.86,0.90,0.93]);
  cyl(0,1.02,2.12,.33,.20,[0.45,0.53,0.61]);
  [[-2.8,-2.0],[-2.8,2.0],[2.8,-2.0],[2.8,2.0]].forEach(([x,z])=>{cyl(x,.35,z,.16,3.45,[0.84,0.89,0.93]);cyl(x,1.92,z,.28,.36,[0.34,0.43,0.51]);cyl(x,1.95,z,.17,.38,[0.78,0.84,0.89]);});
  [[-2.2,-.35],[2.2,-.35],[-2.2,-1.0],[2.2,-1.0],[-1.8,.42],[1.8,.42]].forEach(([x,y])=>{cyl(x,y,2.28,.09,.18,[0.20,0.28,0.35],'z',12);});
  [[-3.25,-1.05],[3.25,-1.05],[-3.25,1.45],[3.25,1.45]].forEach(([x,z])=>cyl(x,.25,z,.11,3.35,[0.43,0.51,0.59]));

  const mat4=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  const mul=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;};
  const perspective=(fovy,aspect,near,far)=>{const f=1/Math.tan(fovy/2),o=new Float32Array(16);o[0]=f/aspect;o[5]=f;o[10]=(far+near)/(near-far);o[11]=-1;o[14]=(2*far*near)/(near-far);return o;};
  const translate=(x,y,z)=>{const o=mat4();o[12]=x;o[13]=y;o[14]=z;return o;};
  const rotateX=a=>{const o=mat4(),c=Math.cos(a),s=Math.sin(a);o[5]=c;o[6]=s;o[9]=-s;o[10]=c;return o;};
  const rotateY=a=>{const o=mat4(),c=Math.cos(a),s=Math.sin(a);o[0]=c;o[2]=-s;o[8]=s;o[10]=c;return o;};

  let yaw=-.65,pitch=-.30,zoom=1,auto=false,drag=null,raf=0,last=0,dpr=1;
  const initial={yaw,pitch,zoom};
  const setAuto=on=>{auto=on;const b=document.getElementById('rotate-auto');if(b){b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Parar rotação automática':'Iniciar rotação automática');b.classList.toggle('is-active',on);}const st=document.getElementById('viewer-state');if(st)st.textContent=on?'Rotação automática ativa':'Rotação automática pausada';};
  const draw=()=>{
    const r=stage.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);const w=Math.max(1,Math.floor(r.width*dpr)),h=Math.max(1,Math.floor(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    gl.viewport(0,0,w,h);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(.055,.075,.095,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const proj=perspective(Math.PI/4,w/h,.1,100), view=mul(translate(0,0,-13.5/zoom),mul(rotateX(pitch),rotateY(yaw)));
    gl.useProgram(program);
    for(const mesh of meshes){const model=mat4(),mvp=mul(proj,mul(view,model));gl.uniformMatrix4fv(modelLoc,false,model);gl.uniformMatrix4fv(mvpLoc,false,mvp);gl.uniform3fv(colorLoc,mesh.color);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,mesh.data,gl.STATIC_DRAW);gl.enableVertexAttribArray(posLoc);gl.vertexAttribPointer(posLoc,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(normalLoc);gl.vertexAttribPointer(normalLoc,3,gl.FLOAT,false,24,12);gl.drawArrays(gl.TRIANGLES,0,mesh.data.length/6);gl.deleteBuffer(buf);}
  };
  document.getElementById('rotate-left')?.addEventListener('click',()=>{setAuto(false);yaw-=.32;draw();});
  document.getElementById('rotate-right')?.addEventListener('click',()=>{setAuto(false);yaw+=.32;draw();});
  document.getElementById('rotate-auto')?.addEventListener('click',()=>setAuto(!auto));
  document.getElementById('rotate-reset')?.addEventListener('click',()=>{setAuto(false);yaw=initial.yaw;pitch=initial.pitch;zoom=initial.zoom;draw();const st=document.getElementById('viewer-state');if(st)st.textContent='Posição inicial';});
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;drag={x:e.clientX,y:e.clientY,yaw,pitch};setAuto(false);canvas.setPointerCapture?.(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw=drag.yaw+(e.clientX-drag.x)*.008;pitch=Math.max(-1.1,Math.min(1.1,drag.pitch+(e.clientY-drag.y)*.006));draw();});
  const stop=()=>{drag=null;};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.72,Math.min(1.45,zoom*Math.exp(-e.deltaY*.001)));draw();},{passive:false});
  let pinch=0;canvas.addEventListener('touchmove',e=>{if(e.touches.length!==2){return;}e.preventDefault();const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pinch)zoom=Math.max(.72,Math.min(1.45,zoom*d/pinch));pinch=d;draw();},{passive:false});canvas.addEventListener('touchend',()=>{pinch=0;});
  const loop=t=>{if(auto){if(last)yaw+=(t-last)*.00045;draw();}last=t;raf=requestAnimationFrame(loop);};
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)raf=requestAnimationFrame(loop);else draw();
  window.addEventListener('resize',draw,{passive:true});
  window.addEventListener('beforeunload',()=>cancelAnimationFrame(raf));
  draw();
})();