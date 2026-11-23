async page=>{
 await page.goto('http://localhost:5173/landing/solicitud-datos.html?v=geo8');
 await page.evaluate(()=>{
   document.querySelectorAll('.data-form-section').forEach((s,i)=>s.hidden=i!==2);
   document.querySelector('#location-consent').checked=true;
   window.geoCalls=[];
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(ok,fail,options)=>{window.geoCalls.push(options);if(window.geoCalls.length===1)fail({code:2});else ok({coords:{latitude:19,longitude:-99,accuracy:100},timestamp:Date.now()});}}});
 });
 await page.locator('#location-share').click();
 await page.waitForFunction(()=>document.querySelector('#location-status').dataset.message==='locationReady');
 const calls=await page.evaluate(()=>window.geoCalls);
 if(calls.length!==2||!calls[0].enableHighAccuracy||calls[0].timeout!==8000||calls[1].enableHighAccuracy||calls[1].timeout!==4000)throw new Error('Login strategy mismatch');
 await page.reload();
 await page.evaluate(()=>{
   document.querySelectorAll('.data-form-section').forEach((s,i)=>s.hidden=i!==2);document.querySelector('#location-consent').checked=true;window.geoCalls=[];
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(ok,fail,options)=>{window.geoCalls.push(options);fail({code:1});}}});
 });
 await page.locator('#location-share').click();
 await page.waitForFunction(()=>document.querySelector('#location-status').dataset.message==='denied');
 if(await page.evaluate(()=>window.geoCalls.length)!==1)throw new Error('Denied permission was retried');
 await page.reload();
}
