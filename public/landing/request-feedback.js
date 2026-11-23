'use strict';
(() => {
 const tr=(es,en)=>document.documentElement.lang==='en'?en:es;
 const dialog=document.createElement('dialog');dialog.className='request-result-dialog';
 dialog.setAttribute('aria-labelledby','request-result-title');dialog.setAttribute('aria-describedby','request-result-message');
 dialog.innerHTML='<button type="button" class="request-result-close" aria-label="Cerrar / Close">×</button><div class="request-result-icon" aria-hidden="true"></div><h2 id="request-result-title"></h2><p id="request-result-message"></p><p class="request-result-hint"></p>';
 document.body.append(dialog);
 const close=()=>dialog.close();dialog.querySelector('button').addEventListener('click',close);
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
 window.requestFeedback={show:(success,text)=>{
   dialog.dataset.result=success?'success':'error';
   dialog.querySelector('.request-result-icon').textContent=success?'✓':'!';
   dialog.querySelector('h2').textContent=success?tr('Solicitud enviada','Request submitted'):tr('No se pudo enviar','Unable to submit');
   dialog.querySelector('#request-result-message').textContent=text;
   dialog.querySelector('.request-result-hint').textContent=success?tr('El equipo revisará tu solicitud. Puedes cerrar este mensaje cuando quieras.','The team will review your request. Close this message whenever you are ready.'):tr('Tus datos siguen en el formulario. Cierra esta alerta, revisa la indicación y vuelve a intentarlo.','Your details remain in the form. Close this alert, follow the instructions and try again.');
   if(!dialog.open)dialog.showModal();dialog.querySelector('button').focus();
 }};
 const states={sending:'loading',confirming:'loading',locating:'loading',checking:'loading',sent:'info',verified:'success',locationReady:'success',success:'success'};
 const watch=(id,buttonId)=>{
   const el=document.getElementById(id);if(!el)return;
   const update=()=>{
     let state=el.classList.contains('is-error')||el.classList.contains('data-submit-error')?'error':states[el.dataset.message]||'info';
     if(id==='captcha-status'&&!el.classList.contains('is-error'))state=/Cargando|Loading/.test(el.textContent)?'loading':/completad|completed/.test(el.textContent)?'success':'info';
     if(!el.textContent.trim())state='empty';
     if(el.dataset.state!==state)el.dataset.state=state;
     const busy=state==='loading';if(el.getAttribute('aria-busy')!==String(busy))el.setAttribute('aria-busy',String(busy));
     const button=document.getElementById(buttonId);if(button){button.classList.toggle('is-loading',busy);button.setAttribute('aria-busy',String(busy));}
   };
   new MutationObserver(update).observe(el,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class','data-message']});update();
 };
 watch('location-status','location-share');watch('email-verification-status','email-code-send');watch('captcha-status');watch('data-submit-status');
})();
