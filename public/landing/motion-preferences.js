'use strict';
(()=>{
 // Motion starts automatically. Only an explicit choice made on this site pauses it.
 // New preference key also clears the unintended system-derived pauses from v1.
 const key='cohorte-motion-v2';let paused=false;
 
 const listeners=new Set();
 const apply=()=>{document.documentElement.dataset.motion=paused?'reduced':'full';document.querySelectorAll('[data-motion-toggle]').forEach(button=>{button.textContent=paused?'Activar animaciones':'Pausar animaciones';button.setAttribute('aria-pressed',String(!paused))});listeners.forEach(fn=>fn())};
 window.siteMotion={get matches(){return paused},subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn)}};
 apply();
 document.addEventListener('DOMContentLoaded',()=>{apply();document.querySelectorAll('[data-motion-toggle]').forEach(button=>button.addEventListener('click',()=>{paused=!paused;try{sessionStorage.setItem(key,paused?'paused':'playing')}catch{}apply()}))});
})();
