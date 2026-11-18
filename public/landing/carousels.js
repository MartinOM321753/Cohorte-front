'use strict';
// Each carousel measures its complete first set; clones exist only for a seamless loop.
document.querySelectorAll('[data-carousel]').forEach(carousel=>{
 const track=carousel.querySelector('.moving-track'),set=track.querySelector('.moving-set');
 let width=0,offset=0,last=0,dragging=false,pointer=null,startX=0,startY=0,startOffset=0,moved=false,momentum=0,lastMoveX=0,lastMoveTime=0,velocity=0,dragFactor=1,touchDrag=false;
 const speed=Number(carousel.dataset.speed)||28;
 const render=()=>{if(!width)return;offset=((offset%width)+width)%width-width;track.style.transform=`translate3d(${offset}px,0,0)`};
 const measure=()=>{width=set.getBoundingClientRect().width;const required=Math.max(2,Math.ceil(carousel.clientWidth/Math.max(width,1))+1);while(track.children.length<required){const clone=set.cloneNode(true);clone.setAttribute('aria-hidden','true');clone.querySelectorAll('a,button,[tabindex]').forEach(x=>x.tabIndex=-1);track.append(clone)}render()};
 new ResizeObserver(measure).observe(set);measure();
 const tick=now=>{const delta=last?Math.min(now-last,80)/1000:0;last=now;if(!dragging&&!document.hidden&&!(window.siteMotion&&window.siteMotion.matches)){if(Math.abs(momentum)>12){offset+=momentum*delta;momentum*=Math.exp(-3.8*delta)}else momentum=0;offset-=speed*delta;render()}requestAnimationFrame(tick)};requestAnimationFrame(tick);
 carousel.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;dragging=true;pointer=e.pointerId;startX=e.clientX;startY=e.clientY;lastMoveX=e.clientX;lastMoveTime=performance.now();velocity=0;touchDrag=e.pointerType==='touch';dragFactor=touchDrag?2.3:e.pointerType==='pen'?1.15:1;momentum=0;startOffset=offset;moved=false});
 carousel.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==pointer)return;const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.15){moved=true;carousel.setPointerCapture(e.pointerId);carousel.classList.add('dragging');const now=performance.now(),elapsed=Math.max(1,now-lastMoveTime);velocity=((e.clientX-lastMoveX)/elapsed)*1000*dragFactor;lastMoveX=e.clientX;lastMoveTime=now;offset=startOffset+dx*dragFactor;render()}});
 const finish=(e,allowMomentum=true)=>{if(!dragging||e?.pointerId!==pointer)return;if(allowMomentum&&touchDrag&&moved&&!(window.siteMotion&&window.siteMotion.matches)){const idle=Math.max(0,(performance.now()-lastMoveTime)/1000);momentum=Math.max(-3000,Math.min(3000,velocity*Math.exp(-3.8*idle)))}else momentum=0;dragging=false;carousel.classList.remove('dragging')};window.addEventListener('pointerup',e=>finish(e,true));window.addEventListener('pointercancel',e=>finish(e,false));carousel.addEventListener('pointercancel',e=>finish(e,false));carousel.addEventListener('lostpointercapture',e=>finish(e,false));
 carousel.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false}},true);carousel.addEventListener('dragstart',e=>e.preventDefault());
 carousel.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){offset+=e.key==='ArrowRight'?-300:300;render();e.preventDefault()}});
 carousel.addEventListener('wheel',e=>{const delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(!delta)return;offset-=delta;render();e.preventDefault()},{passive:false});
});
// Links open the matching evaluation before the browser scrolls to its anchor.
document.querySelectorAll('a[href^="#evaluacion-"]').forEach(a=>a.addEventListener('click',()=>{const target=document.querySelector(a.getAttribute('href'));if(target)target.open=true}));
