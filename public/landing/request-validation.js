'use strict';
(() => {
  const fail=(es,en)=>{throw new Error(document.documentElement.lang==='en'?en:es);};
  const text=(raw,min,max,multiline=false)=>{
    const value=String(raw??'').normalize('NFC').trim();
    if(value.length<min||value.length>max)fail(`Escribe entre ${min} y ${max} caracteres.`,`Enter between ${min} and ${max} characters.`);
    if(/[\p{Cf}\p{Co}\p{Cs}\p{Cn}]/u.test(value)||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(value)||(!multiline&&/[\n\r\t]/u.test(value)))fail('El texto contiene caracteres de control o invisibles.','The text contains control or invisible characters.');
    if(/<\s*\/?\s*[A-Za-z!][^>]*>/u.test(value))fail('Utiliza texto sin etiquetas HTML.','Use plain text without HTML tags.');
    return value;
  };
  const email=raw=>{
    const value=text(raw,5,180),parts=value.split('@');
    if(parts.length!==2||!parts[0]||!parts[1]||/[\s/@:#?\\]/u.test(parts[1]))fail('Escribe un correo electrónico válido.','Enter a valid email address.');
    const local=parts[0];let domain;
    try{domain=new URL('https://'+parts[1]).hostname.toLowerCase();}catch{fail('Escribe un correo electrónico válido.','Enter a valid email address.');}
    if(local.length>64||!/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.\-]+$/.test(local)||local.startsWith('.')||local.endsWith('.')||local.includes('..')||!domain.includes('.')||domain.split('.').some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))||/^\d+$/.test(domain.split('.').at(-1))||(local+'@'+domain).length>180)fail('Escribe un correo electrónico válido.','Enter a valid email address.');
    return local+'@'+domain;
  };
  const field=control=>{
    if(control.name==='fullName'){
      const value=text(control.value,2,140);
      if(!/^[\p{L}\p{M}][\p{L}\p{M} .'’\-]*$/u.test(value)||(value.match(/\p{L}/gu)||[]).length<2)fail('Usa letras, espacios, acentos, puntos, guiones o apóstrofos.','Use letters, spaces, accents, periods, hyphens or apostrophes.');return value;
    }
    if(control.name==='organization'){
      const value=text(control.value,3,180);if(!/^[\p{L}\p{M}\p{N} .,'’&()/+:#ºª%\-]+$/u.test(value))fail('La institución contiene caracteres no permitidos.','The institution contains unsupported characters.');return value;
    }
    if(control.name==='email')return email(control.value);
    if(control.name==='phone'){
      if(!/^[0-9]{10}$/.test(control.value)||/^([0-9])\1{9}$/.test(control.value))fail('Escribe un teléfono válido de 10 dígitos.','Enter a valid 10-digit phone number.');return control.value;
    }
    const rules={purposeOther:[5,180,false],project:[30,2400,true],requestedInformation:[20,1800,true],productOther:[3,180,false]};
    if(rules[control.name]){if(!control.required&&!control.value)return '';return text(control.value,...rules[control.name]);}
    return control.value;
  };
  window.requestValidation={text,email,field};
})();
