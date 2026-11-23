'use strict';
(()=>{
 // The landing owner explicitly selected always-on automatic motion.
 document.documentElement.dataset.motion='full';
 window.siteMotion={get matches(){return false},subscribe(){return ()=>{}}};
})();
