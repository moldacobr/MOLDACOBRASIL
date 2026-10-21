(() => {
  'use strict';
  const canvas = document.getElementById('mold3d-canvas');
  const stage = document.getElementById('scene3d');
  if (!canvas || !stage) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) { stage.textContent = 'Seu navegador não disponibilizou o renderizador 3D.'; return; }

  const faces = [];
  const addBox = (cx, cy, cz, w, h, d, color, bevel = 0) => {
    const x=w/2,y=h/2,z=d/2;
    const v=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]]
      .map(p=>[p[0]+cx,p[1]+cy,p[2]+cz]);
    const inds=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]];
    inds.forEach((ids,i)=>faces.push({v:ids.map(j=>v[j]),color,kind:'box',order:faces.length}));
    if (bevel) {
      const edge = Math.max(.6,bevel);
      addBox(cx-w/2+edge/2,cy,cz,edge,h,d,color);
      addBox(cx+w/2-edge/2,cy,cz,edge,h,d,color);
    }
  };
  const addCylinder = (x,y,z,r,h,color,segments=18,axis='y') => {
    const top=[],bottom=[];
    for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments;const u=Math.cos(a)*r,v=Math.sin(a)*r;
      if(axis==='y'){bottom.push([x+u,y-h/2,z+v]);top.push([x+u,y+h/2,z+v]);}
      else if(axis==='z'){bottom.push([x+u,y+v,z-h/2]);top.push([x+u,y+v,z+h/2]);}
      else {bottom.push([x-h/2,y+u,z+v]);top.push([x+h/2,y+u,z+v]);}
    }
    for(let i=0;i<segments;i++){let j=(i+1)%segments;faces.push({v:[bottom[i],bottom[j],top[j],top[i]],color,kind:'side',order:faces.length});}
    faces.push({v:bottom.slice().reverse(),color,kind:'cap',order:faces.length},{v:top,color,kind:'cap',order:faces.length});
  };
  // Eixo Y vertical; profundidade Z. Conjunto de placas e componentes separados.
  addBox(0,-1.5,0,7.8,.55,5.2,'#586b7e');
  addBox(0,2.3,-.45,7.0,.65,4.7,'#9eacba');
  addBox(0,1.15,-.2,6.7,1.05,4.45,'#d1dbe4');
  addBox(0,.2,.15,6.35,.28,4.2,'#697b8d');
  addBox(0,-.65,.35,6.05,1.25,3.95,'#b8c5d1');
  addBox(0,-1.45,.2,7.3,.35,4.8,'#8797a7');
  // Cavity insert, raised core and injection runner.
  addBox(0,-.62,2.15,2.5,.62,.22,'#687b8d');
  addCylinder(0,-.22,2.32,.73,.45,'#35485b',32,'y');
  addCylinder(0,-.02,2.32,.42,.42,'#c6d2dc',32,'y');
  addCylinder(0,.45,2.1,.19,1.05,'#e0e7ed',20,'y');
  addCylinder(0,.98,2.1,.34,.2,'#8192a3',24,'y');
  // Four guide columns with hardened bushings.
  [[-2.8,-2.0],[-2.8,2.0],[2.8,-2.0],[2.8,2.0]].forEach(([x,z])=>{
    addCylinder(x,.45,z,.16,3.45,'#dce5ec',20,'y');
    addCylinder(x,1.92,z,.27,.34,'#5a6d80',24,'y');
    addCylinder(x,1.95,z,.17,.37,'#d9e2e9',24,'y');
    addCylinder(x,-1.12,z,.22,.28,'#536779',24,'y');
  });
  // Ejector pins and fasteners visible on the mold face.
  [[-2.25,-.35],[2.25,-.35],[-2.25,-1.0],[2.25,-1.0],[-1.8,.45],[1.8,.45]].forEach(([x,y])=>{
    addCylinder(x,y,2.2,.085,.16,'#394d60',12,'z');
    addCylinder(x,y,2.3,.035,.17,'#edf2f6',10,'z');
  });
  // Tie bars behind the plates and side spacers.
  [[-3.25,-1.1],[3.25,-1.1],[-3.25,1.45],[3.25,1.45]].forEach(([x,z])=>addCylinder(x,.25,z,.105,3.4,'#718396',16,'y'));
  addBox(-2.85,.15,-2.35,.5,2.5,.5,'#536678');
  addBox(2.85,.15,-2.35,.5,2.5,.5,'#536678');

  let yaw=-.62,pitch=-.28,zoom=1,auto=false,drag=null,raf=0,last=0,dpr=1;
  const initial={yaw,pitch,zoom};
  const light=[-.42,.72,.55], norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const resize=()=>{
    const r=stage.getBoundingClientRect(); dpr=Math.min(window.devicePixelRatio||1,2.5);
    canvas.width=Math.max(1,Math.floor(r.width*dpr));canvas.height=Math.max(1,Math.floor(r.height*dpr));
    canvas.style.width='100%';canvas.style.height='100%';draw();
  };
  function draw(){
    if(!ctx)return;
    const W=canvas.width,H=canvas.height;if(!W||!H)return;
    ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#e2e9f0';ctx.fillRect(0,0,W,H);
    const sx=Math.sin(yaw),cx=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
    const focal=Math.min(W,H)*1.15*zoom, camera=13.8;
    const transform=p=>{
      const x=p[0]*cx-p[2]*sx,z=p[0]*sx+p[2]*cx;
      const y=p[1]*cp-z*sp, zz=p[1]*sp+z*cp;
      const depth=camera-zz;
      return {x:W/2+x*focal/depth,y:H/2-y*focal/depth,depth};
    };
    const rendered=[];
    for(const f of faces){
      const vv=f.v.map(transform);if(vv.some(p=>p.depth<1))continue;
      const a=f.v[0],b=f.v[1],c=f.v[2],u=b.map((v,i)=>v-a[i]),v=c.map((q,i)=>q-a[i]);
      const n=norm([u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]);
      const lum=Math.max(.24,Math.min(1.18,.52+Math.max(0,dot(norm(n),norm(light)))*.7));
      const depth=vv.reduce((s,p)=>s+p.depth,0)/vv.length;
      rendered.push({vv,depth,color:f.color,lum});
    }
    rendered.sort((a,b)=>b.depth-a.depth);
    for(const f of rendered){
      const rgb=f.color.match(/[\da-f]{2}/gi).map(v=>parseInt(v,16));
      const shade=rgb.map(v=>Math.min(255,Math.round(v*f.lum)));
      ctx.beginPath();ctx.moveTo(f.vv[0].x,f.vv[0].y);for(let i=1;i<f.vv.length;i++)ctx.lineTo(f.vv[i].x,f.vv[i].y);ctx.closePath();
      ctx.fillStyle='rgb('+shade.join(',')+')';ctx.fill();ctx.strokeStyle='rgba(30,46,62,.55)';ctx.lineWidth=Math.max(1,dpr*.65);ctx.stroke();
    }
  }
  const setAuto=on=>{auto=on;const b=document.getElementById('rotate-auto');b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Parar rotação automática':'Iniciar rotação automática');b.classList.toggle('is-active',on);document.getElementById('viewer-state').textContent=on?'Rotação automática ativa':'Rotação automática pausada';};
  document.getElementById('rotate-left').addEventListener('click',()=>{setAuto(false);yaw-=.32;draw();});
  document.getElementById('rotate-right').addEventListener('click',()=>{setAuto(false);yaw+=.32;draw();});
  document.getElementById('rotate-auto').addEventListener('click',()=>setAuto(!auto));
  document.getElementById('rotate-reset').addEventListener('click',()=>{setAuto(false);yaw=initial.yaw;pitch=initial.pitch;zoom=initial.zoom;draw();document.getElementById('viewer-state').textContent='Posição inicial';});
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;drag={x:e.clientX,y:e.clientY,yaw,pitch};setAuto(false);canvas.setPointerCapture(e.pointerId);document.getElementById('viewer-state').textContent='Arrastando para examinar';});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw=drag.yaw+(e.clientX-drag.x)*.009;pitch=Math.max(-1.15,Math.min(1.15,drag.pitch+(e.clientY-drag.y)*.007));draw();});
  const stop=()=>{drag=null;};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.68,Math.min(1.5,zoom*Math.exp(-e.deltaY*.001)));draw();},{passive:false});
  let pinch=null;
  canvas.addEventListener('touchstart',e=>{if(e.touches.length===2)pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);},{passive:true});
  canvas.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinch){const next=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);zoom=Math.max(.68,Math.min(1.5,zoom*next/pinch));pinch=next;draw();}},{passive:true});
  canvas.addEventListener('touchend',()=>{pinch=null;});
  function animate(t){if(auto){if(last)yaw+=(t-last)*.00045;draw();}last=t;raf=requestAnimationFrame(animate);}
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)raf=requestAnimationFrame(animate);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}else if(!document.hidden&&!raf&&!matchMedia('(prefers-reduced-motion: reduce)').matches)raf=requestAnimationFrame(animate);});
  window.addEventListener('resize',resize);new ResizeObserver(resize).observe(stage);resize();
  window.addEventListener('beforeunload',()=>{if(raf)cancelAnimationFrame(raf);});
})();