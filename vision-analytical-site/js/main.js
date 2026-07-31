/* ── CONTACT FORM → WHATSAPP ── */
function sendEnquiry(){
  const g=id=>(document.getElementById(id).value||'').trim();
  const name=g('f-name'),company=g('f-company'),phone=g('f-phone'),
        instrument=g('f-instrument'),message=g('f-message');
  if(!name||!phone){
    alert('Please enter at least your Name and Phone number.');
    return;
  }
  const lines=[
    '*New Enquiry — Vision Analytical*',
    'Name: '+name,
    company?'Company: '+company:'',
    'Phone: '+phone,
    instrument?'Instrument: '+instrument:'',
    message?'Requirement: '+message:''
  ].filter(Boolean);
  const url='https://wa.me/919136216080?text='+encodeURIComponent(lines.join('\n'));
  const btn=document.getElementById('f-submit');
  btn.textContent='✓ Opening WhatsApp...';
  btn.style.background='linear-gradient(135deg,#22c55e,#16a34a)';
  window.open(url,'_blank');
  setTimeout(()=>{btn.textContent='Submit Enquiry →';btn.style.background='';},2500);
}

/* ── CURSOR ── */
const cd=document.getElementById('cd'),cr=document.getElementById('cr');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cd.style.left=mx+'px';cd.style.top=my+'px'});
(function ar(){rx+=(mx-rx)*.11;ry+=(my-ry)*.11;cr.style.left=rx+'px';cr.style.top=ry+'px';requestAnimationFrame(ar)})();
document.querySelectorAll('a,button,.svc-card,.ins-card,.amc-card,.why-pt,.cc,.proc-step,.gal-item').forEach(el=>{
  el.addEventListener('mouseenter',()=>document.body.classList.add('hov'));
  el.addEventListener('mouseleave',()=>document.body.classList.remove('hov'));
});

/* ── SCROLL ── */
const sp=document.getElementById('sp'),nav=document.getElementById('nav'),btt=document.getElementById('btt');
window.addEventListener('scroll',()=>{
  const p=window.scrollY/(document.body.scrollHeight-window.innerHeight)*100;
  sp.style.width=p+'%';
  nav.classList.toggle('sc',window.scrollY>60);
  btt.classList.toggle('show',window.scrollY>400);
});

/* ── REVEAL ── */
const rvObs=new IntersectionObserver(entries=>{
  entries.forEach((e,i)=>{if(e.isIntersecting){setTimeout(()=>e.target.classList.add('on'),i*60);rvObs.unobserve(e.target)}});
},{threshold:.1});
document.querySelectorAll('.rv').forEach(el=>rvObs.observe(el));

/* ── COUNTER ── */
function runCtr(el){
  const t=parseInt(el.dataset.t),dur=1800,s=performance.now();
  (function u(now){const p=Math.min((now-s)/dur,1),ease=1-Math.pow(1-p,4);
    el.textContent=Math.floor(ease*t);if(p<1)requestAnimationFrame(u);else el.textContent=t;
  })(s);
}
const cObs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.querySelectorAll('.ctr,.hctr').forEach(runCtr);cObs.unobserve(e.target)}});
},{threshold:.3});
document.querySelectorAll('.stats-grid,#hero').forEach(el=>cObs.observe(el));

/* ── BACKGROUND CANVAS ── */
const bc=document.getElementById('bgc'),bx=bc.getContext('2d');
let bw,bh;
function rbc(){bw=bc.width=window.innerWidth;bh=bc.height=window.innerHeight}
rbc();window.addEventListener('resize',rbc);
const pts=Array.from({length:55},()=>({x:Math.random()*window.innerWidth,y:Math.random()*window.innerHeight,vx:(Math.random()-.5)*.28,vy:(Math.random()-.5)*.28,r:Math.random()*1.4+.3,a:Math.random()*.35+.08}));
function drawBg(){
  bw=bc.width=window.innerWidth;bh=bc.height=window.innerHeight;
  bx.clearRect(0,0,bw,bh);
  // grid
  bx.strokeStyle='rgba(0,229,255,0.028)';bx.lineWidth=1;
  for(let x=0;x<bw;x+=80){bx.beginPath();bx.moveTo(x,0);bx.lineTo(x,bh);bx.stroke()}
  for(let y=0;y<bh;y+=80){bx.beginPath();bx.moveTo(0,y);bx.lineTo(bw,y);bx.stroke()}
  // orbs
  const g1=bx.createRadialGradient(bw*.2,bh*.35,0,bw*.2,bh*.35,380);
  g1.addColorStop(0,'rgba(37,99,235,0.07)');g1.addColorStop(1,'transparent');
  bx.fillStyle=g1;bx.fillRect(0,0,bw,bh);
  const g2=bx.createRadialGradient(bw*.82,bh*.65,0,bw*.82,bh*.65,260);
  g2.addColorStop(0,'rgba(0,229,255,0.055)');g2.addColorStop(1,'transparent');
  bx.fillStyle=g2;bx.fillRect(0,0,bw,bh);
  // particles + connections
  pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=bw;if(p.x>bw)p.x=0;if(p.y<0)p.y=bh;if(p.y>bh)p.y=0;
    bx.beginPath();bx.arc(p.x,p.y,p.r,0,Math.PI*2);bx.fillStyle=`rgba(0,229,255,${p.a})`;bx.fill()});
  bx.strokeStyle='rgba(0,229,255,0.04)';bx.lineWidth=.5;
  for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
    const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);
    if(d<130){bx.beginPath();bx.moveTo(pts[i].x,pts[i].y);bx.lineTo(pts[j].x,pts[j].y);bx.stroke()}}
  requestAnimationFrame(drawBg);
}
drawBg();

/* ── OSCILLOSCOPE ── */
const oc=document.getElementById('osc');
if(oc){
  const ox=oc.getContext('2d');let ot=0;
  function drawOsc(){
    oc.width=oc.offsetWidth||420;oc.height=150;
    ox.clearRect(0,0,oc.width,oc.height);
    // grid
    ox.strokeStyle='rgba(0,229,255,0.06)';ox.lineWidth=1;
    for(let x=0;x<oc.width;x+=42){ox.beginPath();ox.moveTo(x,0);ox.lineTo(x,150);ox.stroke()}
    for(let y=0;y<150;y+=38){ox.beginPath();ox.moveTo(0,y);ox.lineTo(oc.width,y);ox.stroke()}
    // trace
    const tr=ox.createLinearGradient(0,0,oc.width,0);
    tr.addColorStop(0,'rgba(0,229,255,0)');tr.addColorStop(.08,'rgba(0,229,255,.9)');
    tr.addColorStop(.92,'rgba(0,229,255,.9)');tr.addColorStop(1,'rgba(0,229,255,0)');
    ox.strokeStyle=tr;ox.lineWidth=2;ox.beginPath();
    const W=oc.width;
    for(let x=0;x<W;x++){
      const xn=x/W,base=112,n=Math.sin(x*.7+ot)*.9*(150*.025);
      const p1=Math.exp(-Math.pow((xn-.25)*18,2))*82;
      const p2=Math.exp(-Math.pow((xn-.55)*22,2))*52;
      const p3=Math.exp(-Math.pow((xn-.80)*20,2))*40;
      const y=base-p1-p2-p3+n;
      x===0?ox.moveTo(x,y):ox.lineTo(x,y);
    }
    ox.stroke();
    // fill
    ox.beginPath();
    for(let x=0;x<W;x++){
      const xn=x/W,base=112,n=Math.sin(x*.7+ot)*.9*(150*.025);
      const p1=Math.exp(-Math.pow((xn-.25)*18,2))*82;
      const p2=Math.exp(-Math.pow((xn-.55)*22,2))*52;
      const p3=Math.exp(-Math.pow((xn-.80)*20,2))*40;
      const y=base-p1-p2-p3+n;
      x===0?ox.moveTo(x,y):ox.lineTo(x,y);
    }
    ox.lineTo(W,150);ox.lineTo(0,150);ox.closePath();
    const fg=ox.createLinearGradient(0,0,0,150);
    fg.addColorStop(0,'rgba(0,229,255,.18)');fg.addColorStop(1,'rgba(0,229,255,0)');
    ox.fillStyle=fg;ox.fill();
    ot+=.014;requestAnimationFrame(drawOsc);
  }
  drawOsc();
}

/* ── 3D CARD TILT ── */
document.querySelectorAll('.svc-card,.ins-card,.amc-card').forEach(c=>{
  c.addEventListener('mousemove',e=>{
    const r=c.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    c.style.transform=`translateY(-8px) scale(1.02) rotateX(${-y*9}deg) rotateY(${x*9}deg)`;
  });
  c.addEventListener('mouseleave',()=>c.style.transform='');
});

/* ── PARALLAX HUD ── */
document.addEventListener('mousemove',e=>{
  const xf=(e.clientX/window.innerWidth-.5)*10,yf=(e.clientY/window.innerHeight-.5)*7;
  document.querySelectorAll('.hud').forEach((h,i)=>{
    const d=i%2===0?1:-1;h.style.transform+=` translate(${xf*d*.3}px,${yf*d*.3}px)`;
  });
});

/* ── MOBILE MENU TOGGLE ── */
(function(){
  var t=document.getElementById('navToggle'),n=document.getElementById('navLinks');
  if(t&&n){
    t.addEventListener('click',function(){n.classList.toggle('open');});
    n.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){n.classList.remove('open');});});
  }
})();
