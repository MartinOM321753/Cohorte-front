'use strict';
(() => {
  const translations = {
    'Hombres':'Men','Mujeres':'Women','Participantes':'Participants','Fase':'Phase',
    'Sobrepeso':'Overweight','Obesidad':'Obesity','Obesidad central':'Central obesity','Prehipertensión':'Prehypertension','HTA':'Hypertension','Prediabetes':'Prediabetes','Diabetes':'Diabetes','Dislipidemia':'Dyslipidemia','Fumador activo':'Current smoking','Sintomatología depresiva':'Depressive symptoms','ALT':'ALT','AST':'AST','ICO':'ICO',
    'Osteopenia · columna':'Osteopenia · spine','Osteoporosis · columna':'Osteoporosis · spine','Osteopenia · fémur':'Osteopenia · femur','Osteoporosis · fémur':'Osteoporosis · femur','Osteopenia · cadera':'Osteopenia · hip','Osteoporosis · cadera':'Osteoporosis · hip',
    'Inactividad física':'Physical inactivity','25-OH-D':'25-OH-D','Sin datos disponibles':'No data available'
  };
  const t=value=>document.documentElement.lang==='en'?(translations[value]||value):value;
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=value=>new Intl.NumberFormat(document.documentElement.lang==='en'?'en-US':'es-MX',{maximumFractionDigits:1}).format(value);
  const colors={men:'#527e68',women:'#c49a52'};
  const $=selector=>document.querySelector(selector);
  const smooth=points=>{
    if(!points.length)return '';
    return points.map(([x,y],i)=>`${i?'L':'M'}${x},${y}`).join(' ');
  };
  const lineSegments=(points,sex)=>points.slice(1).map(([x2,y2],i)=>{
    const [x1,y1]=points[i];
    const duration=2150/Math.max(1,points.length-1),delay=i*duration;
    return `<path class="chart-line" pathLength="1" data-transition-key="${sex}-segment-${i}" style="--segment-duration:${duration}ms;--segment-delay:${delay}ms" d="M${x1},${y1} L${x2},${y2}"/>`;
  }).join('');
  const axisScale=value=>{
    const target=Math.max(0,Number(value)||0)*1.08;
    const steps=[5,10,20,40,60,80,100,120,150,180,200,250,300,400,500,600,800,1000,1500,2000];
    const max=steps.find(step=>step>=target)||Math.ceil(target/100)*100||5;
    const ticks=max<=10?5:max===20?4:max<=80?4:max===100?5:4;
    return {max,ticks};
  };
  const animateChartUpdate=(previous,next)=>{
    if(!previous||!next)return;
    const oldNodes=new Map([...previous.querySelectorAll('[data-transition-key]')].map(node=>[node.dataset.transitionKey,node]));
    const transitions=[];
    const attrs=['d','cx','cy','x','y','x1','y1','x2','y2'];
    const numbers=value=>(String(value).match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)||[]).map(Number);
    [...next.querySelectorAll('[data-transition-key]')].forEach(node=>{
      const old=oldNodes.get(node.dataset.transitionKey);if(!old)return;
      attrs.forEach(attr=>{
        const from=old.getAttribute(attr),to=node.getAttribute(attr);if(from==null||to==null)return;
        const a=numbers(from),b=numbers(to);if(!a.length||a.length!==b.length)return;
        transitions.push({node,attr,from:a,to:b,template:to});
        node.setAttribute(attr,from);
      });
    });
    if(!transitions.length)return;
    const duration=780,start=performance.now(),ease=p=>1-Math.pow(1-p,3);
    const frame=now=>{
      const raw=Math.min(1,(now-start)/duration),progress=ease(raw);
      transitions.forEach(({node,attr,from,to,template})=>{
        let index=0;
        const replacement=template.replace(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi,()=>{const i=index++;return String(from[i]+(to[i]-from[i])*progress);});
        node.setAttribute(attr,replacement);
      });
      if(raw<1)requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  const polar=(angle,r=62,cx=90,cy=90)=>{const rad=angle*Math.PI/180;return [cx+r*Math.cos(rad),cy+r*Math.sin(rad)];};
  const arc=(start,end)=>{const [x1,y1]=polar(start),[x2,y2]=polar(end),large=end-start>180?1:0;return `M${x1.toFixed(2)} ${y1.toFixed(2)} A62 62 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;};

  async function start(){
    if(!$('#indicator-select')||!$('#indicator-plot')||!$('#sample-plot')||!$('#measure-select')||!$('#measure-plot'))return;
    try{
      const response=await fetch('/landing/results-data.json',{cache:'no-cache'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      const indicatorSelect=$('#indicator-select'),measureSelect=$('#measure-select');
      let activeIndicator=data.indicators.some(item=>item.id==='hypertension')?'hypertension':data.indicators[0]?.id;
      let activeMeasure=data.measures[0]?.id;

      function fillSelect(select,items,activeId){
        select.innerHTML=items.map(item=>`<option value="${esc(item.id)}">${esc(t(item.label))}</option>`).join('');
        select.value=activeId;
      }
      function chartGrid({w,h,left=82,right=30,top=30,bottom=72,max=100,ticks=5,xLabels,yTitle,xTitle}){
        const pw=w-left-right,ph=h-top-bottom,y=value=>top+ph-(value/max)*ph;
        const horizontal=Array.from({length:ticks+1},(_,i)=>{
          const value=max*i/ticks,yy=y(value);
          return `<line class="chart-grid-line" x1="${left}" x2="${w-right}" y1="${yy}" y2="${yy}"/><text x="${left-14}" y="${yy+5}" text-anchor="end">${num(value)}</text>`;
        }).join('');
        const labels=xLabels.map((label,i)=>{
          const x=left+i*pw/(xLabels.length-1);
          return `<line class="chart-guide-line" x1="${x}" x2="${x}" y1="${top}" y2="${h-bottom}"/><text x="${x}" y="${h-bottom+30}" text-anchor="middle">${esc(label)}</text>`;
        }).join('');
        return {y,pw,ph,base:h-bottom,left,right,top,bottom,body:`<g class="science-grid">${horizontal}${labels}<text class="axis-title" x="${left+pw/2}" y="${h-8}" text-anchor="middle">${esc(xTitle)}</text><text class="axis-title" transform="translate(18 ${top+ph/2}) rotate(-90)" text-anchor="middle">${esc(yTitle)}</text></g>`};
      }
      function renderIndicators({transition=false}={}){
        const item=data.indicators.find(entry=>entry.id===activeIndicator)||data.indicators[0];if(!item)return;
        const plot=$('#indicator-plot'),previous=transition?plot.querySelector('svg')?.cloneNode(true):null;
        const observedMax=Math.max(0,...data.waves.flatMap((_,i)=>['men','women'].map(sex=>item.values[i]?.[sex]).filter(value=>value!=null)));
        const scale=axisScale(observedMax),w=1080,h=440,g=chartGrid({w,h,xLabels:data.waves.map(wave=>wave.label),xTitle:t('Fase'),yTitle:'%',max:scale.max,ticks:scale.ticks});
        const xs=data.waves.map((_,i)=>g.left+i*g.pw/(data.waves.length-1));
        const defs=`<defs><linearGradient id="area-men" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${colors.men}" stop-opacity=".22"/><stop offset="1" stop-color="${colors.men}" stop-opacity=".015"/></linearGradient><linearGradient id="area-women" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${colors.women}" stop-opacity=".2"/><stop offset="1" stop-color="${colors.women}" stop-opacity=".015"/></linearGradient><linearGradient id="line-men"><stop stop-color="#91b49d"/><stop offset="1" stop-color="#3d6c53"/></linearGradient><linearGradient id="line-women"><stop stop-color="#e2c987"/><stop offset="1" stop-color="#ad792f"/></linearGradient><filter id="line-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
        const series=['men','women'].map(sex=>{
          const points=data.waves.map((wave,i)=>wave&&item.values[i]?.[sex]!=null?[xs[i],g.y(item.values[i][sex]),item.values[i][sex],wave]:null).filter(Boolean);
          if(!points.length)return '';
          const path=smooth(points.map(([x,y])=>[x,y]));
          const area=`${path} L${points[points.length-1][0]},${g.base} L${points[0][0]},${g.base} Z`;
          const markers=points.map(([x,y,value,wave],i)=>{
            const waveIndex=data.waves.indexOf(wave),labelX=x+(waveIndex===0?38:waveIndex===data.waves.length-1?-38:0);
            const peer=sex==='men'?item.values[waveIndex]?.women:item.values[waveIndex]?.men;
            const peerY=peer==null?null:g.y(peer),close=peerY!=null&&Math.abs(peerY-y)<36;
            let labelY=Math.max(g.top+18,y-20);
            if(close){
              const upper=Math.min(y,peerY),lower=Math.max(y,peerY);
              if(sex==='men')labelY=Math.max(g.top+18,upper-18);
              else labelY=lower+30<=g.base-12?lower+30:Math.max(g.top+38,upper-44);
            }
            const label=`${t(item.label)} · ${wave.label} · ${t(sex==='men'?'Hombres':'Mujeres')}: ${num(value)}%`;
            const sample=`n=${num(wave.participants[sex])}`;
            const leader=close?`<line class="chart-label-leader" data-transition-key="${sex}-leader-${i}" x1="${x}" y1="${y}" x2="${labelX}" y2="${labelY+(labelY<y?8:-13)}"/>`:'';
            const pointDelay=i*(2150/Math.max(1,points.length-1));
            return `<g class="chart-marker chart-marker-${sex}" style="--point-delay:${pointDelay}ms">${leader}<circle class="marker-halo" data-transition-key="${sex}-halo-${i}" cx="${x}" cy="${y}" r="14"/><circle class="marker-core" data-transition-key="${sex}-core-${i}" cx="${x}" cy="${y}" r="6"><title>${esc(label)} · ${sample}</title></circle><text class="chart-point-label" data-transition-key="${sex}-label-${i}" data-main-value="${value}" data-suffix="%" x="${labelX}" y="${labelY}" text-anchor="middle">${num(value)}%</text></g>`;
          }).join('');
          return `<g class="chart-series chart-series-${sex}"><path class="chart-area" data-transition-key="${sex}-area" d="${area}" fill="url(#area-${sex})"/><g stroke="url(#line-${sex})" filter="url(#line-glow)">${lineSegments(points,sex)}</g>${markers}</g>`;
        }).join('');
        const description=document.documentElement.lang==='en'?`${t(item.label)}: men and women, percentage across phases`:`${t(item.label)}: hombres y mujeres, porcentaje por fase`;
        plot.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(description)}">${defs}${g.body}${series}</svg>`;
        animateChartUpdate(previous,plot.querySelector('svg'));
      }
      function renderSamples(){
        const cards=data.waves.map((wave,i)=>{
          const men=wave.cohortSharePct.men,women=wave.cohortSharePct.women;
          const total=wave.participants.men+wave.participants.women,split=-90+men*3.6;
          const menDuration=1700*men/100,womenDuration=1700-menDuration;
          return `<article class="phase-donut-card" style="--phase-index:${i}"><div class="donut-phase">${document.documentElement.lang==='en'?'Phase':'Fase'} ${i+1}</div><div class="donut-year">${esc(wave.label)}</div><svg class="phase-donut" viewBox="0 0 180 180" role="img" aria-label="${esc(wave.label)}: ${t('Hombres')} ${num(men)}%, ${t('Mujeres')} ${num(women)}%"><circle class="donut-track" cx="90" cy="90" r="62"/><path class="donut-segment donut-men" pathLength="1" d="${arc(-90,split)}" style="--donut-delay:0ms;--donut-duration:${menDuration}ms"><title>${t('Hombres')}: n=${num(wave.participants.men)} · ${num(men)}%</title></path><path class="donut-segment donut-women" pathLength="1" d="${arc(split,270)}" style="--donut-delay:${menDuration}ms;--donut-duration:${womenDuration}ms"><title>${t('Mujeres')}: n=${num(wave.participants.women)} · ${num(women)}%</title></path><circle class="donut-inner" cx="90" cy="90" r="48"/><text class="donut-total" x="90" y="88" text-anchor="middle">${num(total)}</text><text class="donut-total-label" x="90" y="108" text-anchor="middle">${t('Participantes')}</text></svg><div class="donut-stats"><div class="donut-stat donut-stat-men" style="--donut-label-delay:${menDuration}ms"><span class="donut-stat-dot" style="--dot-color:${colors.men}"></span><span>${t('Hombres')}</span><strong>${num(wave.participants.men)} <small>· ${num(men)}%</small></strong></div><div class="donut-stat donut-stat-women" style="--donut-label-delay:1700ms"><span class="donut-stat-dot" style="--dot-color:${colors.women}"></span><span>${t('Mujeres')}</span><strong>${num(wave.participants.women)} <small>· ${num(women)}%</small></strong></div></div></article>`;
        }).join('');
        $('#sample-plot').innerHTML=`<div class="phase-donut-grid">${cards}</div>`;
      }
      function renderMeasures({transition=false}={}){
        const item=data.measures.find(entry=>entry.id===activeMeasure)||data.measures[0];if(!item)return;
        const plot=$('#measure-plot'),previous=transition?plot.querySelector('svg')?.cloneNode(true):null;
        const unit=document.documentElement.lang==='en'&&item.unit==='min/día'?'min/day':item.unit;
        const all=item.values.flatMap(phase=>['men','women'].map(sex=>phase?.[sex]?.value).filter(value=>value!=null));
        const scale=axisScale(Math.max(...all)),max=scale.max,w=1080,h=420,g=chartGrid({w,h,max,ticks:scale.ticks,xLabels:data.waves.map(wave=>wave.label),xTitle:t('Fase'),yTitle:unit,bottom:72});
        const xs=data.waves.map((_,i)=>g.left+i*g.pw/(data.waves.length-1));
        const defs=`<defs><linearGradient id="measure-area-men" x1="0" x2="0" y1="0" y2="1"><stop stop-color="${colors.men}" stop-opacity=".2"/><stop offset="1" stop-color="${colors.men}" stop-opacity=".01"/></linearGradient><linearGradient id="measure-area-women" x1="0" x2="0" y1="0" y2="1"><stop stop-color="${colors.women}" stop-opacity=".18"/><stop offset="1" stop-color="${colors.women}" stop-opacity=".01"/></linearGradient></defs>`;
        const series=['men','women'].map(sex=>{
          const points=data.waves.map((wave,i)=>item.values[i]?.[sex]?[xs[i],g.y(item.values[i][sex].value),item.values[i][sex],wave]:null).filter(Boolean);
          if(!points.length)return '';
          const path=smooth(points.map(([x,y])=>[x,y]));
          const area=`${path} L${points[points.length-1][0]},${g.base} L${points[0][0]},${g.base} Z`;
          const markers=points.map(([x,y,raw,wave],i)=>{
            const waveIndex=data.waves.indexOf(wave),labelX=x+(waveIndex===0?42:waveIndex===data.waves.length-1?-42:0);
            const other=sex==='men'?item.values[waveIndex]?.women:item.values[waveIndex]?.men;
            const otherY=other?g.y(other.value):null,close=otherY!=null&&Math.abs(otherY-y)<38;
            let labelY=Math.max(g.top+18,y-20);
            if(close){
              const upper=Math.min(y,otherY),lower=Math.max(y,otherY);
              if(sex==='men')labelY=Math.max(g.top+18,upper-18);
              else labelY=lower+30<=g.base-12?lower+30:Math.max(g.top+38,upper-44);
            }
            const label=`${t(item.label)} · ${wave.label} · ${t(sex==='men'?'Hombres':'Mujeres')}: ${num(raw.value)} (${num(raw.parenthetical)}) ${unit}`;
            const leader=close?`<line class="chart-label-leader" data-transition-key="${sex}-leader-${i}" x1="${x}" y1="${y}" x2="${labelX}" y2="${labelY+(labelY<y?8:-13)}"/>`:'';
            const pointDelay=i*(2150/Math.max(1,points.length-1));
            return `<g class="chart-marker chart-marker-${sex}" style="--point-delay:${pointDelay}ms">${leader}<circle class="marker-halo" data-transition-key="${sex}-halo-${i}" cx="${x}" cy="${y}" r="14"/><circle class="marker-core" data-transition-key="${sex}-core-${i}" cx="${x}" cy="${y}" r="6"><title>${esc(label)}</title></circle><text class="chart-point-label" data-transition-key="${sex}-label-${i}" data-main-value="${raw.value}" data-parenthetical="${raw.parenthetical}" x="${labelX}" y="${labelY}" text-anchor="middle">${num(raw.value)} <tspan class="parenthetical-label">(${num(raw.parenthetical)})</tspan></text></g>`;
          }).join('');
          return `<g class="chart-series chart-series-${sex}"><path class="chart-area" data-transition-key="${sex}-area" d="${area}" fill="url(#measure-area-${sex})"/><g stroke="${colors[sex]}">${lineSegments(points,sex)}</g>${markers}</g>`;
        }).join('');
        const description=document.documentElement.lang==='en'?`${t(item.label)}, ${unit} by sex and phase`:`${t(item.label)}, ${unit} por sexo y fase`;
        plot.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(description)}">${defs}${g.body}${series}</svg>`;
        animateChartUpdate(previous,plot.querySelector('svg'));
        const missing=item.values.some(phase=>!phase?.men||!phase?.women);
        $('#measure-availability').textContent=missing?t('Sin datos disponibles')+': '+data.waves.filter((wave,i)=>!item.values[i]?.men||!item.values[i]?.women).map(wave=>wave.label).join(', '):'';
      }
      function renderAll(){
        fillSelect(indicatorSelect,data.indicators,activeIndicator);fillSelect(measureSelect,data.measures,activeMeasure);
        renderIndicators();renderSamples();renderMeasures();
      }
      indicatorSelect.addEventListener('change',()=>{activeIndicator=indicatorSelect.value;renderIndicators({transition:true})});
      measureSelect.addEventListener('change',()=>{activeMeasure=measureSelect.value;renderMeasures({transition:true})});
      renderAll();
      new MutationObserver(records=>{if(records.some(record=>record.attributeName==='lang'))renderAll()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    }catch(error){
      console.error('No se pudieron cargar los datos de resultados.',error);
      document.querySelectorAll('.science-plot-area').forEach(plot=>plot.textContent=document.documentElement.lang==='en'?'Study data could not be loaded.':'No se pudieron cargar los datos del estudio.');
    }
  }
  start();
})();
