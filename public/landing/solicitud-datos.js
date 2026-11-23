'use strict';
(() => {
 const form=document.querySelector('#data-request-form');if(!form)return;
 const validation=window.requestValidation;
 const tr=(es,en)=>document.documentElement.lang==='en'?en:es;
 const purpose=form.querySelector('#request-purpose'),purposeWrap=form.querySelector('#purpose-other-wrap'),purposeOther=form.querySelector('#purpose-other');
 const otherProduct=form.querySelector('#product-other-check'),otherProductWrap=form.querySelector('#product-other-wrap'),otherProductText=form.querySelector('#product-other'),undefinedProduct=form.querySelector('#product-undefined');
 const productError=form.querySelector('#product-error'),status=form.querySelector('#data-submit-status');
 const sections=[...form.querySelectorAll('.data-form-section')],steps=[...form.querySelectorAll('[data-step-item]')];
 const currentLabel=form.querySelector('#data-progress-current'),back=form.querySelector('.data-step-back'),next=form.querySelector('.data-step-next'),submit=form.querySelector('.data-submit');
 const email=form.elements.email,sendCode=form.querySelector('#email-code-send'),confirmCode=form.querySelector('#email-code-confirm'),codeInput=form.querySelector('#email-code'),codeRow=form.querySelector('#email-code-row'),emailStatus=form.querySelector('#email-verification-status');
 const consent=form.querySelector('#location-consent'),shareLocation=form.querySelector('#location-share'),locationStatus=form.querySelector('#location-status');
 let activeStep=0,challengeId='',verificationToken='',verifiedEmail='',verificationExpires=0,cooldownUntil=0,emailBusy=false,submitting=false,location=null,locationBusy=false;
 let locationPermission=null;
 const messages={
   captcha:['Completa de nuevo la verificación antispam antes de enviar.','Complete anti-spam verification again before submitting.'],
   sent:['Código enviado. Revisa tu correo; vence en 10 minutos.','Code sent. Check your email; it expires in 10 minutes.'],
   verified:['Correo verificado.','Email verified.'],
   needEmail:['Verifica tu correo para continuar.','Verify your email to continue.'],
   invalidCode:['El código no es válido o venció. Solicita uno nuevo si es necesario.','The code is invalid or expired. Request a new one if necessary.'],
   changedEmail:['El correo cambió. Solicita un código para la nueva dirección.','The email changed. Request a code for the new address.'],
   emailUnavailable:['La verificación de correo no está disponible. Intenta más tarde.','Email verification is unavailable. Try again later.'],
   blockedNetwork:['La conexión se identifica como VPN, proxy o alojamiento. Utiliza una conexión directa.','The connection is identified as a VPN, proxy or hosting network. Use a direct connection.'],
   networkUnavailable:['No se pudo verificar la conexión. Intenta más tarde.','The connection could not be checked. Try again later.'],
   rateLimited:['Has realizado demasiados intentos. Espera antes de volver a intentarlo.','Too many attempts. Wait before trying again.'],
   invalidEmail:['Comprueba el correo. Utiliza una dirección válida y permanente.','Check your email. Use a valid permanent address.'],
   invalidFields:['Revisa los datos de la solicitud.','Review the request details.'],
   sending:['Enviando código…','Sending code…'],
   confirming:['Verificando código…','Checking code…'],
   consent:['Autoriza el uso de tu ubicación antes de compartirla.','Authorize the use of your location before sharing it.'],
   locating:['Obteniendo ubicación…','Getting location…'],
   locationReady:['Ubicación obtenida. Se usará al enviar mientras siga vigente.','Location obtained. It will be used while still current.'],
   denied:['No se pudo acceder a tu ubicación. Activa el permiso del navegador para enviar.','Location access failed. Enable browser permission to submit.'],
   locationUnavailable:['No se pudo obtener una ubicación válida. Comprueba tu ubicación e intenta de nuevo.','A valid location could not be obtained. Check your location and try again.'],
   unsupported:['Este navegador no permite obtener la ubicación. Abre el sitio con HTTPS en un navegador compatible.','This browser cannot get your location. Open the HTTPS site in a supported browser.'],
   checking:['Comprobando ubicación y enviando solicitud…','Checking location and submitting request…'],
   success:['Tu solicitud ha sido enviada. Recibirás una respuesta por correo electrónico.','Your request has been submitted. You will receive a response by email.'],
   failure:['No se pudo enviar la solicitud. Intenta de nuevo más tarde.','The request could not be submitted. Try again later.'],
   expired:['Tu verificación venció. Verifica el correo de nuevo.','Your verification expired. Verify your email again.']
 };
 const message=(element,key,error=false)=>{element.dataset.message=key;element.textContent=tr(...messages[key]);element.classList.toggle('is-error',error);};
 const refreshMessage=element=>{if(element.dataset.message)element.textContent=tr(...messages[element.dataset.message]);};
 const canonicalEmail=()=>{try{return validation.email(email.value);}catch{return '';}};
 const invalidateEmail=()=>{challengeId='';verificationToken='';verifiedEmail='';verificationExpires=0;codeInput.value='';codeInput.readOnly=false;codeInput.disabled=true;};
 const verified=()=>verificationToken&&canonicalEmail()===verifiedEmail&&Date.now()<verificationExpires;
 const refreshButtons=()=>{
   const seconds=Math.max(0,Math.ceil((cooldownUntil-Date.now())/1000));
   sendCode.disabled=emailBusy||!!verified()||seconds>0;
   const label=verified()?tr('Correo verificado','Email verified'):seconds?tr('Reenviar en '+seconds+' s','Resend in '+seconds+' s'):tr('Enviar código','Send code');
   if(sendCode.textContent!==label)sendCode.textContent=label;
   confirmCode.disabled=emailBusy||!challengeId||!!verified();const confirmLabel=tr('Verificar código','Verify code');if(confirmCode.textContent!==confirmLabel)confirmCode.textContent=confirmLabel;
   shareLocation.disabled=locationBusy||submitting;
   const locationLabel=location?tr('Actualizar ubicación','Refresh location'):tr('Compartir ubicación','Share location');if(shareLocation.textContent!==locationLabel)shareLocation.textContent=locationLabel;
 };
 const errorKey=(code,http)=>http===429?'rateLimited':code?.startsWith('CAPTCHA_')?'captcha':code==='ANONYMOUS_NETWORK'?'blockedNetwork':code==='NETWORK_CHECK_UNAVAILABLE'?'networkUnavailable':code==='EMAIL_VERIFICATION_INVALID'?'invalidCode':code?.startsWith('EMAIL_')?'emailUnavailable':http===400?'invalidFields':'failure';
 const request=async(path,body)=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
   try{
     const response=await fetch('/api/publico/solicitud-datos'+path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
     const data=await response.json().catch(()=>null);
     if(!response.ok||!data||data.error===true){const error=new Error('Request failed');error.code=data?.data?.code;error.key=errorKey(error.code,response.status);throw error;}
     return data.data;
   }finally{clearTimeout(timer);}
 };
 const syncPurpose=()=>{const show=purpose.value==='other';purposeWrap.hidden=!show;purposeOther.required=show;if(!show){purposeOther.value='';purposeOther.setCustomValidity('');}};
 const syncOtherProduct=()=>{const show=otherProduct.checked;otherProductWrap.hidden=!show;otherProductText.required=show;if(!show){otherProductText.value='';otherProductText.setCustomValidity('');}};
 const validateControl=(control,normalize=false)=>{
   control.setCustomValidity('');
   if(control.name==='verificationCode'||!['fullName','organization','email','phone','purposeOther','project','requestedInformation','productOther'].includes(control.name))return control.checkValidity();
   try{const value=validation.field(control);if(normalize)control.value=value;}catch(error){control.setCustomValidity(error.message);}
   return control.checkValidity();
 };
 const updateProgress=()=>{
   sections.forEach((section,index)=>section.hidden=index!==activeStep);
   steps.forEach((step,index)=>{if(index===activeStep)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');step.classList.toggle('is-complete',index<activeStep);});
   currentLabel.textContent=tr('Paso '+(activeStep+1)+' de 3 · '+['Datos personales','Proyecto','Producto académico'][activeStep],'Step '+(activeStep+1)+' of 3 · '+['Applicant details','Project','Academic product'][activeStep]);
   back.hidden=activeStep===0;next.hidden=activeStep===2;submit.hidden=activeStep!==2;
   form.querySelectorAll('.data-step-footer-note').forEach(note=>note.hidden=activeStep!==2);
 };
 const goToStep=index=>{
   activeStep=Math.max(0,Math.min(2,index));updateProgress();
   const heading=sections[activeStep].querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});
   sections[activeStep].scrollIntoView({behavior:'smooth',block:'center'});
   if(activeStep===2)window.requestCaptcha?.mount();
 };
 const validateSection=index=>{
   const invalid=[...sections[index].querySelectorAll('input,select,textarea')].find(control=>!validateControl(control,true));
   if(invalid){if(index!==activeStep)goToStep(index);invalid.reportValidity();return false;}
   if(index===0&&!verified()){message(emailStatus,verificationToken?'expired':'needEmail',true);refreshButtons();return false;}
   return true;
 };
 form.querySelectorAll('input,textarea').forEach(control=>{
   control.addEventListener('input',()=>{if(control.setCustomValidity)control.setCustomValidity('');});
   control.addEventListener('blur',()=>validateControl(control,true));
 });
 const inputRules=[{control:form.elements.fullName,allowed:/^[\p{L}\p{M} .'’\-]*$/u,strip:/[^\p{L}\p{M} .'’\-]/gu},{control:form.elements.phone,allowed:/^[0-9]*$/,strip:/[^0-9]/g},{control:codeInput,allowed:/^[0-9]*$/,strip:/[^0-9]/g}];
 inputRules.forEach(({control,allowed,strip})=>{
   control.addEventListener('beforeinput',event=>{if(event.isComposing||!event.data||event.inputType?.startsWith('delete'))return;if(!allowed.test(event.data)){event.preventDefault();control.setCustomValidity(control===form.elements.fullName?tr('El nombre no admite números ni símbolos ajenos al nombre.','Names cannot contain numbers or unrelated symbols.'):tr('Este campo solo admite dígitos del 0 al 9.','This field accepts digits from 0 to 9 only.'));control.reportValidity();}});
   control.addEventListener('input',event=>{if(!event.isComposing)control.value=control.value.replace(strip,'');});
 });
 email.addEventListener('input',()=>{if((verificationToken&&canonicalEmail()!==verifiedEmail)||challengeId){invalidateEmail();message(emailStatus,'changedEmail',true);refreshButtons();}});
 sendCode.addEventListener('click',async()=>{
   if(emailBusy)return;
   if(!validateControl(email,true)){email.reportValidity();return;}
   const requestedEmail=canonicalEmail();invalidateEmail();emailBusy=true;refreshButtons();message(emailStatus,'sending');
   try{
     const data=await request('/verificacion-correo',{email:requestedEmail,website:form.elements.website.value});
     if(canonicalEmail()!==requestedEmail){message(emailStatus,'changedEmail',true);return;}
     if(!/^[A-Za-z0-9_-]{43}$/.test(data?.challengeId))throw new Error('Invalid verification response');
     challengeId=data.challengeId;cooldownUntil=Date.now()+60000;codeInput.disabled=false;message(emailStatus,'sent');codeInput.focus();
   }catch(error){message(emailStatus,error.key==='invalidFields'?'invalidEmail':error.key||'emailUnavailable',true);}
   finally{emailBusy=false;refreshButtons();}
 });
 confirmCode.addEventListener('click',async()=>{
   if(emailBusy||!challengeId)return;
   if(!/^[0-9]{6}$/.test(codeInput.value)){message(emailStatus,'invalidCode',true);codeInput.focus();return;}
   const requestedEmail=canonicalEmail();emailBusy=true;refreshButtons();message(emailStatus,'confirming');
   try{
     const data=await request('/verificacion-correo/confirmar',{challengeId,code:codeInput.value,email:requestedEmail});
     if(canonicalEmail()!==requestedEmail){invalidateEmail();message(emailStatus,'changedEmail',true);return;}
     const expiry=Date.parse(data?.expiresAt);
     if(!/^[A-Za-z0-9_-]{43}$/.test(data?.verificationToken)||!Number.isFinite(expiry)||expiry<=Date.now())throw new Error('Invalid verification response');
     verificationToken=data.verificationToken;verifiedEmail=requestedEmail;verificationExpires=expiry;codeInput.readOnly=true;message(emailStatus,'verified');
   }catch(error){message(emailStatus,error.key||'invalidCode',true);}
   finally{emailBusy=false;refreshButtons();}
 });
  let locationPending = null;
  let locationGeneration = 0;
  const acquireLocation = () => {
    if (locationPending) return locationPending;
    locationPending = obtainLocation().finally(() => { locationPending = null; shareLocation.disabled = false; });
    return locationPending;
  };
  const obtainLocation = async () => {
    if (!consent.checked) { message(locationStatus, 'consent', true); throw new Error('consent'); }
    let permission;
    try { permission = await navigator.permissions?.query({ name: 'geolocation' }); } catch {}
    locationPermission = permission || null;
    if (permission?.state === 'denied') { location = null; message(locationStatus, 'denied', true); throw new Error('location'); }
    if (location && permission?.state === 'granted' && Date.now() - location.locationCapturedAt >= 0 && Date.now() - location.locationCapturedAt < 240000) return location;
    shareLocation.disabled = true;
    const generation = locationGeneration;
    return new Promise((resolve, reject) => {
    if (!consent.checked) { message(locationStatus, 'consent', true); reject(new Error('consent')); return; }
    if (!window.isSecureContext || !navigator.geolocation) { message(locationStatus, 'locationUnavailable', true); reject(new Error('unsupported')); return; }
    message(locationStatus, 'locating');
    const attempt = retry => navigator.geolocation.getCurrentPosition(
      pos => {
        if (!consent.checked || generation !== locationGeneration) { reject(new Error('consent')); return; }
        const { latitude, longitude, accuracy } = pos.coords;
        if (![latitude, longitude, accuracy, pos.timestamp].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy <= 0 || accuracy > 100000 || Date.now() - pos.timestamp > 240000 || Date.now() - pos.timestamp < -60000) { message(locationStatus, 'locationUnavailable', true); reject(new Error('invalid')); return; }
        location = { latitude, longitude, locationAccuracy: accuracy, locationCapturedAt: pos.timestamp };
        message(locationStatus, 'locationReady');
        resolve(location);
      },
      error => {
        if (error.code !== 1 && !retry && consent.checked && generation === locationGeneration) {
          locationStatus.textContent = tr('La ubicación está tardando. Reintentando automáticamente…', 'Location is taking longer. Retrying automatically…');
          attempt(true); return;
        }
        location = null;
        locationStatus.textContent = error.code === 1 ? tr('Permite la ubicación en el navegador y en tu dispositivo.', 'Allow location in your browser and device.') : error.code === 3 ? tr('La ubicación tardó demasiado. Comprueba tu conexión y que la ubicación esté activada.', 'Location timed out. Check your connection and location settings.') : tr('El dispositivo no pudo determinar tu ubicación. Comprueba tu conexión y el servicio de ubicación.', 'Your device could not determine its location. Check your connection and location service.');
        locationStatus.dataset.message = error.code === 1 ? 'denied' : 'locationUnavailable';
        locationStatus.classList.add('is-error'); reject(new Error('location'));
      },
      { enableHighAccuracy: retry, maximumAge: 60000, timeout: retry ? 20000 : 10000 }
    );
    attempt(false);
    });
  };

  shareLocation.addEventListener('click', () => acquireLocation().catch(() => {}));
  consent.addEventListener('change', () => {
    if (!consent.checked) { locationGeneration++; location = null; locationStatus.textContent = ''; }
  });

 purpose.addEventListener('change',syncPurpose);otherProduct.addEventListener('change',syncOtherProduct);
 back.addEventListener('click',()=>goToStep(activeStep-1));
 next.addEventListener('click',()=>{if(validateSection(activeStep))goToStep(activeStep+1);});
 form.querySelectorAll('input[name="products"]').forEach(input=>input.addEventListener('change',()=>{
   if(input===undefinedProduct&&input.checked)form.querySelectorAll('input[name="products"]').forEach(other=>{if(other!==undefinedProduct)other.checked=false;});
   else if(input.checked)undefinedProduct.checked=false;
   productError.hidden=form.querySelectorAll('input[name="products"]:checked').length>0;syncOtherProduct();
 }));
 form.addEventListener('submit',async event=>{
   event.preventDefault();if(submitting)return;
   const products=[...form.querySelectorAll('input[name="products"]:checked')];
   if(!products.length){productError.hidden=false;form.querySelector('input[name="products"]').focus();return;}productError.hidden=true;
   for(let index=0;index<sections.length;index++)if(!validateSection(index))return;
   const captchaToken=window.requestCaptcha?.getToken();if(!captchaToken){window.requestCaptcha?.require();return;}
   let posted=false;
   submitting=true;submit.disabled=true;refreshButtons();status.className='data-submit-status';message(status,'checking');
   try{
     const currentLocation=await acquireLocation();
     if(!consent.checked||locationPermission?.state==='denied'){message(locationStatus,'consent',true);throw new Error('location');}
     if(!verified()){goToStep(0);message(emailStatus,'expired',true);throw new Error('verification');}
     const values=new FormData(form);
     if(!window.requestCaptcha?.getToken()){window.requestCaptcha?.require();throw Object.assign(new Error('captcha'),{key:'captcha'});}
     posted=true;
     await request('',{fullName:values.get('fullName'),organization:values.get('organization'),email:canonicalEmail(),phone:values.get('phone'),purpose:purpose.value,purposeOther:purpose.value==='other'?values.get('purposeOther'):null,project:values.get('project'),requestedInformation:values.get('requestedInformation'),products:products.map(input=>input.value),productOther:otherProduct.checked?values.get('productOther'):null,website:values.get('website')||'',emailVerificationToken:verificationToken,captchaToken,locationConsent:true,...currentLocation});
     form.reset();invalidateEmail();location=null;locationStatus.textContent='';delete locationStatus.dataset.message;emailStatus.textContent='';delete emailStatus.dataset.message;syncPurpose();syncOtherProduct();activeStep=0;updateProgress();status.className='data-submit-status data-submit-success';message(status,'success');
   }catch(error){
     status.className='data-submit-status data-submit-error';
     if(['location','consent','unsupported','invalid'].includes(error.message)){
       status.dataset.message=locationStatus.dataset.message||'locationUnavailable';status.textContent=locationStatus.textContent;status.classList.add('is-error');
     }else message(status,error.key||'failure',true);
     if(error.code==='EMAIL_VERIFICATION_INVALID'){invalidateEmail();goToStep(0);message(emailStatus,'expired',true);}
   }finally{if(posted)window.requestCaptcha?.reset();submitting=false;submit.disabled=false;refreshButtons();}
 });
 new MutationObserver(()=>{updateProgress();refreshButtons();[emailStatus,locationStatus,status].forEach(refreshMessage);}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 const cooldownTimer=setInterval(refreshButtons,1000);
 window.addEventListener('pagehide',()=>clearInterval(cooldownTimer),{once:true});
 syncPurpose();syncOtherProduct();updateProgress();refreshButtons();
})();
