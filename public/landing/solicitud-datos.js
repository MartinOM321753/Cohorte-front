'use strict';
(()=>{
 const form=document.querySelector('#data-request-form');if(!form)return;
 const purpose=document.querySelector('#request-purpose'),purposeWrap=document.querySelector('#purpose-other-wrap'),purposeOther=document.querySelector('#purpose-other');
 const otherProduct=document.querySelector('#product-other-check'),otherProductWrap=document.querySelector('#product-other-wrap'),otherProductText=document.querySelector('#product-other'),undefinedProduct=document.querySelector('#product-undefined');
 const productError=document.querySelector('#product-error'),status=document.querySelector('#data-submit-status');
 const sections=[...form.querySelectorAll('.data-form-section')],steps=[...form.querySelectorAll('[data-step-item]')];
 const currentLabel=document.querySelector('#data-progress-current'),back=form.querySelector('.data-step-back'),next=form.querySelector('.data-step-next'),submit=form.querySelector('.data-submit');
 const footerNotes=[...form.querySelectorAll('.data-step-footer-note')];
 let activeStep=0;
 const syncPurpose=()=>{const show=purpose.value==='other';purposeWrap.hidden=!show;purposeOther.required=show;if(!show)purposeOther.value=''};
 const syncOtherProduct=()=>{const show=otherProduct.checked;otherProductWrap.hidden=!show;otherProductText.required=show;if(!show)otherProductText.value=''};
 const updateProgress=()=>{
   const english=document.documentElement.lang==='en';
   sections.forEach((section,index)=>{section.hidden=index!==activeStep});
   steps.forEach((step,index)=>{if(index===activeStep)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');step.classList.toggle('is-complete',index<activeStep)});
   currentLabel.textContent=english?`Step ${activeStep+1} of 3 · ${['Applicant details','Project','Academic product'][activeStep]}`:`Paso ${activeStep+1} de 3 · ${['Datos personales','Proyecto','Producto académico'][activeStep]}`;
   back.hidden=activeStep===0;next.hidden=activeStep===sections.length-1;submit.hidden=activeStep!==sections.length-1;
   footerNotes.forEach(note=>note.hidden=activeStep!==sections.length-1);
 };
 const goToStep=(index,focus=true)=>{
   activeStep=Math.max(0,Math.min(sections.length-1,index));updateProgress();
   if(focus){const heading=sections[activeStep].querySelector('.data-form-heading h2');heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});sections[activeStep].scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'})}
 };
 const validateSection=index=>{
   const invalid=[...sections[index].querySelectorAll('input,select,textarea')].find(control=>!control.checkValidity());
   if(!invalid)return true;
   invalid.reportValidity();return false;
 };
 purpose.addEventListener('change',syncPurpose);otherProduct.addEventListener('change',syncOtherProduct);
 back.addEventListener('click',()=>goToStep(activeStep-1));
 next.addEventListener('click',()=>{if(validateSection(activeStep))goToStep(activeStep+1)});
 form.querySelectorAll('input[name="products"]').forEach(input=>input.addEventListener('change',()=>{
   if(input===undefinedProduct&&input.checked)form.querySelectorAll('input[name="products"]').forEach(other=>{if(other!==undefinedProduct)other.checked=false});
   else if(input.checked&&undefinedProduct.checked)undefinedProduct.checked=false;
   productError.hidden=form.querySelectorAll('input[name="products"]:checked').length>0;syncOtherProduct();
 }));
 form.addEventListener('submit',async event=>{
   event.preventDefault();
   const products=[...form.querySelectorAll('input[name="products"]:checked')];
   if(!products.length){productError.hidden=false;form.querySelector('input[name="products"]')?.focus();return}
   productError.hidden=true;
   const invalidIndex=sections.findIndex((_,index)=>[...sections[index].querySelectorAll('input,select,textarea')].some(control=>!control.checkValidity()));
   if(invalidIndex!==-1){goToStep(invalidIndex);validateSection(invalidIndex);return}

   const english=document.documentElement.lang==='en';
   const values=new FormData(form);

   const body={
     fullName:values.get('fullName'),
     organization:values.get('organization'),
     email:values.get('email'),
     purpose:purpose.value==='other'?'other':purpose.selectedOptions[0]?.textContent.trim()||'',
     purposeOther:values.get('purposeOther')||null,
     project:values.get('project'),
     requestedInformation:values.get('requestedInformation'),
     products:products.map(input=>input.value),
     productOther:values.get('productOther')||null,
     website:values.get('website')||''
   };

   submit.disabled=true;
   status.textContent=english?'Sending request…':'Enviando solicitud…';
   status.className='data-submit-status';

   try{
     const res=await fetch('/api/publico/solicitud-datos',{
       method:'POST',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify(body)
     });
     const data=await res.json().catch(()=>null);

     if(res.status===429){
       status.textContent=english
         ?'You have sent too many requests. Please try again later.'
         :'Has enviado demasiadas solicitudes. Intenta de nuevo más tarde.';
       status.className='data-submit-status data-submit-error';
       submit.disabled=false;
       return;
     }
     if(!res.ok){
       throw new Error(data?.message||'Error del servidor');
     }

     status.textContent=english
       ?'Your request has been submitted successfully. You will receive a response by email.'
       :'Tu solicitud ha sido enviada. Recibirás una respuesta por correo electrónico.';
     status.className='data-submit-status data-submit-success';

     form.querySelectorAll('input:not([type="checkbox"]),select,textarea').forEach(el=>{
       if(el.name!=='website'){el.value='';el.dispatchEvent(new Event('change'))}
     });
     form.querySelectorAll('input[type="checkbox"]').forEach(el=>{el.checked=false});
     syncPurpose();syncOtherProduct();
     goToStep(0,false);
   }catch(err){
     status.textContent=english
       ?'There was an error sending your request. Please try again.'
       :'Hubo un error al enviar la solicitud. Inténtalo de nuevo.';
     status.className='data-submit-status data-submit-error';
     submit.disabled=false;
   }
 });
 new MutationObserver(records=>{if(records.some(record=>record.attributeName==='lang'))updateProgress()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 syncPurpose();syncOtherProduct();updateProgress();
})();
