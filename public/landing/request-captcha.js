'use strict';
(() => {
  const container=document.querySelector('#request-captcha');if(!container)return;
  const status=document.querySelector('#captcha-status'),retry=document.querySelector('#captcha-retry');
  let widget=null,loading=false,token='',receivedAt=0,scriptPromise;
  const tr=(es,en)=>document.documentElement.lang==='en'?en:es;
  const tell=(es,en,error=false)=>{status.textContent=tr(es,en);status.classList.toggle('is-error',error);};
  const clear=()=>{token='';receivedAt=0;};
  const loadScript=()=>scriptPromise||(scriptPromise=new Promise((resolve,reject)=>{
    if(window.turnstile){resolve();return;}
    const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;
    const timeout=setTimeout(()=>reject(new Error('timeout')),15000);
    script.onload=()=>{clearTimeout(timeout);resolve();};script.onerror=()=>{clearTimeout(timeout);script.remove();reject(new Error('script'));};document.head.append(script);
  }).catch(error=>{scriptPromise=null;throw error;}));
  const mount=async()=>{
    if(widget!==null||loading)return;loading=true;retry.hidden=true;
    tell('Cargando verificación antispam…','Loading anti-spam verification…');
    try{
      const response=await fetch('/api/publico/solicitud-datos/captcha-config',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});
      const body=await response.json();if(!response.ok||body.error||!body.data?.siteKey)throw new Error('config');
      await loadScript();
      widget=window.turnstile.render(container,{sitekey:body.data.siteKey,action:'data_request',language:document.documentElement.lang==='en'?'en':'es',theme:'light',size:'flexible','response-field':false,
        callback:value=>{token=value;receivedAt=Date.now();tell(body.data.testMode?'CAPTCHA de prueba completado.':'Verificación antispam completada.',body.data.testMode?'Test CAPTCHA completed.':'Anti-spam verification completed.');},
        'expired-callback':()=>{clear();tell('La verificación venció. Complétala de nuevo.','Verification expired. Complete it again.',true);},
        'error-callback':code=>{clear();retry.hidden=false;const detail=/^\d{6}$/.test(String(code))?' ('+code+')':'';tell('El CAPTCHA no pudo completarse'+detail+'. Pulsa Reintentar verificación.','CAPTCHA could not complete'+detail+'. Select Retry verification.',true);},
        'timeout-callback':()=>{clear();retry.hidden=false;tell('El CAPTCHA agotó su tiempo. Pulsa Reintentar verificación.','CAPTCHA timed out. Select Retry verification.',true);}
      });
      tell(body.data.testMode?'CAPTCHA en modo de pruebas local.':'Completa la verificación para enviar.',body.data.testMode?'CAPTCHA in local testing mode.':'Complete verification to submit.');
    }catch{
      clear();retry.hidden=false;tell('No se pudo cargar la verificación antispam. Comprueba tu conexión y reintenta.','Anti-spam verification could not load. Check your connection and retry.',true);
    }finally{loading=false;}
  };
  const reset=()=>{clear();if(widget!==null&&window.turnstile)window.turnstile.reset(widget);};
  retry.addEventListener('click',()=>{if(widget!==null){window.turnstile.remove(widget);widget=null;}mount();});
  window.requestCaptcha={mount,reset,getToken:()=>Date.now()-receivedAt<285000?token:'',require:()=>{tell('Completa la verificación antispam antes de enviar.','Complete anti-spam verification before submitting.',true);container.scrollIntoView({behavior:'smooth',block:'center'});mount();}};
})();
