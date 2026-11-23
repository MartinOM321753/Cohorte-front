// Ejecutar con playwright-cli run-code --filename tests/browser/solicitud-datos.playwright.js.
// Todos los endpoints del formulario están simulados: no se envía correo ni se guarda una solicitud.
async page => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const submissions = [], calls = [];
  let networkBlocked = false;
  let captchaPassed=false;
  const token = 'a'.repeat(43);
  await page.addInitScript(()=>localStorage.setItem('cohorte-language','es'));
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*',route=>route.fulfill({contentType:'text/javascript',body:`window.turnstile={render:(container,options)=>{window.captchaTestOptions=options;container.innerHTML='<button type="button" id="captcha-test-pass">Completar CAPTCHA de prueba</button>';container.querySelector('button').onclick=()=>options.callback('mock-captcha-token');return 'test-widget';},reset:()=>{},remove:()=>{}};`}));
  await page.route('**/api/publico/solicitud-datos**', async route => {
    const path = new URL(route.request().url()).pathname;
    if(path.endsWith('/captcha-config')){await route.fulfill({contentType:'application/json',body:JSON.stringify({error:false,data:{siteKey:'1x00000000000000000000AA',testMode:true}})});return;}
    const body = route.request().postDataJSON(); calls.push({path, body});
    let status = 200, data, error = false;
    if (path.endsWith('/confirmar')) {
      if (body.code !== '123456') { status = 400; error = true; data = {code:'EMAIL_VERIFICATION_INVALID'}; }
      else data = {verificationToken:token, expiresAt:new Date(Date.now()+1800000).toISOString()};
    } else if (path.endsWith('/verificacion-correo')) {
      if (networkBlocked) {status=403;error=true;data={code:'ANONYMOUS_NETWORK'};}
      else data = {challengeId:token, expiresInSeconds:600};
    } else { submissions.push(body); status=201; data=101; }
    await route.fulfill({status, contentType:'application/json', body:JSON.stringify({data,error})});
  });
  const url='http://localhost:5173/landing/solicitud-datos.html?v=security-test';
  await page.setViewportSize({width:1440,height:1100});
  await page.context().grantPermissions(['geolocation'],{origin:'http://localhost:5173'});
  await page.context().setGeolocation({latitude:19.4326,longitude:-99.1332,accuracy:25});
  await page.goto(url);
  assert(await page.locator('#email-code-row').isVisible(),'Email code input is hidden');
  assert(await page.locator('#email-code').isDisabled(),'Email code should await requested challenge');
  await page.locator('[name=fullName]').fill('Ana\u200BPérez');
  await page.locator('[name=organization]').fill('UNAM Facultad de Medicina');
  await page.locator('[name=phone]').fill('551234567');
  await page.locator('[name=email]').fill('ana@example.org');
  await page.locator('.data-step-next').click();
  assert(!((await page.locator('[name=fullName]').inputValue()).includes('\u200B')),'Invisible characters accepted');
  await page.locator('[name=fullName]').fill('Ana123 Pérez');
  assert(!/[0-9]/.test(await page.locator('[name=fullName]').inputValue()),'Name accepts numbers');
  await page.locator('[name=fullName]').fill('María-José O’Neill');
  await page.locator('.data-step-next').click();
  assert(await page.locator('[name=phone]').evaluate(el=>!el.validity.valid),'Nine-digit phone accepted');
  await page.locator('[name=phone]').fill('5512345678');
  await page.locator('[name=phone]').press('End');await page.locator('[name=phone]').pressSequentially('ab+');
  assert(await page.locator('[name=phone]').inputValue()==='5512345678','Phone accepts letters or symbols');
  await page.locator('.data-step-next').click();
  assert(await page.locator('#email-verification-status').getAttribute('data-message')==='needEmail','Unverified email advanced');
  await page.locator('#email-code-send').click();
  await page.locator('#email-code-row').waitFor({state:'visible'});
  await page.locator('#email-code').fill('000000');await page.locator('#email-code-confirm').click();
  await page.waitForFunction(()=>document.querySelector('#email-verification-status').dataset.message==='invalidCode');
  await page.locator('#email-code').fill('123456');await page.locator('#email-code-confirm').click();
  await page.waitForFunction(()=>document.querySelector('#email-verification-status').dataset.message==='verified');
  assert(!await page.locator('.data-request-intro .eyebrow').count(),'Removed eyebrow still present');
  assert((await page.locator('h1').innerText()).replace(/\s+/g,' ').includes('Solicitud de acceso a la base de datos de la Cohorte'),'Title spacing broken');
  await page.locator('.data-step-next').click();
  await page.locator('#request-purpose').selectOption('academic');
  await page.locator('[name=project]').fill('Estudiaremos hábitos y cambios de salud mediante un análisis longitudinal.');
  await page.locator('[name=requestedInformation]').fill('Variables clínicas y mediciones disponibles en distintas fases.');
  await page.locator('.data-step-next').click();
  await page.locator('[name=products][value=article]').check();
  await page.locator('.data-submit').click();
  assert(submissions.length===0,'Submitted without location consent');
  await page.locator('#location-consent').check();
  await page.locator('.data-submit').click();
  assert(submissions.length===0,'Submitted without CAPTCHA');
  await page.locator('#captcha-test-pass').click();captchaPassed=true;
  await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(_,failure)=>failure({code:1})}}));
  await page.locator('.data-submit').click();
  await page.waitForFunction(()=>document.querySelector('#data-submit-status').dataset.message==='denied');
  assert(submissions.length===0,'Submitted with denied geolocation');
  await page.evaluate(()=>delete navigator.geolocation);
  await page.locator('#location-share').click();
  await page.waitForFunction(()=>document.querySelector('#location-status').dataset.message==='locationReady');
  for(const width of [1440,768,390]) {
    await page.setViewportSize({width,height:1000});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow at '+width);
  }
  await page.locator('.data-submit').click();
  await page.waitForFunction(()=>document.querySelector('#data-submit-status').dataset.message==='success');
  assert(submissions.length===1,'Duplicate/missing submission');
  const sent=submissions[0];
  assert(sent.phone==='5512345678'&&sent.purpose==='academic'&&sent.emailVerificationToken===token,'Missing normalized/security fields');
  assert(sent.locationConsent===true&&sent.latitude===19.4326&&sent.longitude===-99.1332&&sent.locationAccuracy===25,'Missing location proof');
  assert(captchaPassed&&sent.captchaToken==='mock-captcha-token','Missing CAPTCHA proof');
  assert(!await page.locator('.data-submit').isDisabled(),'Submit stayed disabled after reset');
  await page.goto(url);
  await page.setViewportSize({width:1440,height:1100});
  await page.locator('[name=email]').fill('changed@example.org');
  networkBlocked=true;await page.locator('#email-code-send').click();
  await page.waitForFunction(()=>document.querySelector('#email-verification-status').dataset.message==='blockedNetwork');
  assert(await page.locator('#email-code').isDisabled(),'Blocked network obtained challenge');
  await page.locator('.language-toggle').click();
  await page.locator('[data-language=en]').click();
  await page.waitForFunction(()=>document.documentElement.lang==='en');
  assert(await page.locator('#email-verification-heading').innerText()==='Verify your email','Verification UI translation missing');
  assert((await page.locator('h1').innerText()).includes('Access request'),'Title translation missing');
  console.log(JSON.stringify({result:'passed',mockRequests:calls.length,submissions:submissions.length,widths:[390,768,1440],checks:['Unicode','phone','email OTP','incorrect OTP','unverified blocking','location consent','permission denied','successful submission','reset','VPN block','translation','title','no horizontal overflow']}));
}
