'use strict';
(()=>{
 const menu=document.getElementById('directoryMenu');
 document.getElementById('openMenu')?.addEventListener('click',()=>menu.showModal());
 document.getElementById('closeMenu')?.addEventListener('click',()=>menu.close());
})();
