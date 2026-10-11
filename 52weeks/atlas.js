'use strict';
(()=>{
 const icon=(name)=>'<svg class="atlas-icon" aria-hidden="true" focusable="false"><use href="atlas-symbols.svg#'+name+'"></use></svg>';
 const route={briefing:'save',stays:'save',index:'book',seasons:'grid',planner:'pin',compare:'compare',booking:'calendar',ledger:'wallet',vip:'tier',windows:'calendar',rooms:'bed',layouts:'plan',resorts:'phone',fees:'fees'};
 const chapters={index:'01 / Directory',seasons:'02 / The complete year',planner:'03 / Find a stay',compare:'04 / Compare stays',booking:'05 / Booking dates',ledger:'06 / Points ledger',vip:'07 / Owner benefits',windows:'08 / Reservation windows',rooms:'09 / Room evidence',layouts:'10 / Plans & maps',resorts:'11 / Resort profiles',fees:'12 / Fees & charges',stays:'13 / Saved stays',briefing:'14 / Trip briefing'};const h=document.querySelector('main h1');if(h)h.insertAdjacentHTML('beforebegin','<span class="chapter-label">'+chapters[document.body.dataset.page]+'</span>');
 const plan=window.TripContext?.current.planId;if(plan&&/^[A-Za-z0-9_.-]{1,80}$/.test(plan))document.querySelector('main')?.insertAdjacentHTML('afterbegin','<div class="linked-stay-return"><a href="briefing.html?stay='+encodeURIComponent(plan)+'">Back to trip briefing</a></div>');
 document.addEventListener('click',async e=>{const b=e.target.closest('[data-copy-resort-questions]');if(!b)return;const text=window.ResortDetails?.questions(b.dataset.copyResortQuestions);if(!text)return;const status=b.parentElement.querySelector('.copy-status');try{await navigator.clipboard.writeText(text);status.textContent='Confirmation checklist copied.';}catch{status.textContent='Select and copy the questions above; clipboard access is unavailable.';}});
 document.addEventListener('error',e=>{const img=e.target;if(img.tagName!=='IMG')return;const p=img.closest('.candidate-photo,.property-thumbnail,.comparison-photo');if(!p)return;img.hidden=true;p.classList.add('photo-gap','photo-gap-inline');const caption=p.querySelector('span');if(caption)caption.textContent='Photo unavailable · open resort profile';},true);
 // A module can expose a named subview without rebuilding its global menu.
 const categories={plan:'Plan a stay',resort:'Know your resort',reference:'Owner reference',records:'Your records'};
 function currentSection(){
  const {navRoute,navTitle,navCategory}=document.body.dataset;
  if(!navRoute)return;
  for(const link of document.querySelectorAll('#directoryMenu nav a')){
   if(link.getAttribute('href')===navRoute)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  }
  const title=document.getElementById('breadcrumbPage'),category=document.getElementById('breadcrumbCategory');
  if(title&&navTitle)title.textContent=navTitle;
  if(category&&categories[navCategory]){category.textContent=categories[navCategory];category.href='index.html#directory-'+navCategory;}
 }
 currentSection();
 new MutationObserver(currentSection).observe(document.body,{attributes:true,attributeFilter:['data-nav-route','data-nav-title','data-nav-category']});
 const menu=document.getElementById('directoryMenu');menu?.addEventListener('click',e=>{if(e.target===menu){const r=menu.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)menu.close();}});
 const menuSearch=document.getElementById('menuSearch'),menuCount=document.getElementById('menuMatchCount'),openMenu=document.getElementById('openMenu');
 if(menu&&menuSearch){
  const links=[...menu.querySelectorAll('nav a')],groups=[...menu.querySelectorAll('.menu-group')];let returnFocus=null;
  const normalize=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const visibleLinks=()=>links.filter(a=>!a.hidden);
  function filterTools(){const words=normalize(menuSearch.value.trim()).split(/\s+/).filter(Boolean);let count=0;links.forEach(a=>{const text=normalize(a.textContent);a.hidden=words.some(word=>!text.includes(word));if(!a.hidden)count++;});groups.forEach(g=>g.hidden=![...g.querySelectorAll('a')].some(a=>!a.hidden));menuCount.textContent=words.length?(count?count+' matching '+(count===1?'tool':'tools'):'No matching tools. Try another word.'):'Planning, resorts, owner reference and your records';}
  menuSearch.addEventListener('input',filterTools);
  openMenu?.setAttribute('aria-expanded','false');
  // Capture the invoking control before mobile.js opens the native dialog.
  openMenu?.addEventListener('click',()=>{returnFocus=document.activeElement;},true);
  openMenu?.addEventListener('click',e=>{openMenu.setAttribute('aria-expanded','true');menuSearch.value='';filterTools();queueMicrotask(()=>{if(e.detail>0)menu.querySelector('h2')?.focus();else menuSearch.focus();});});
  menu.addEventListener('close',()=>{openMenu?.setAttribute('aria-expanded','false');const target=returnFocus?.isConnected?returnFocus:openMenu;target?.focus();returnFocus=null;});
  menu.addEventListener('keydown',e=>{
   if(e.isComposing||e.metaKey||e.ctrlKey||e.altKey)return;
   const visible=visibleLinks(),index=visible.indexOf(document.activeElement),fromSearch=e.target===menuSearch;
   if(fromSearch&&e.key==='Enter'&&visible.length===1){e.preventDefault();visible[0].click();return;}
   if(!visible.length||(!fromSearch&&index<0))return;
   let target=null;
   if(e.key==='ArrowDown')target=visible[Math.min(index+1,visible.length-1)];
   else if(e.key==='ArrowUp')target=fromSearch?visible[visible.length-1]:index===0?menuSearch:visible[index-1];
   else if(!fromSearch&&e.key==='Home')target=visible[0];
   else if(!fromSearch&&e.key==='End')target=visible[visible.length-1];
   if(target){e.preventDefault();target.focus();}
  });
  document.addEventListener('keydown',e=>{if(e.isComposing||!(e.metaKey||e.ctrlKey)||e.key.toLowerCase()!=='k')return;const otherDialog=document.querySelector('dialog[open]');if(otherDialog&&otherDialog!==menu)return;e.preventDefault();if(!menu.open)openMenu?.click();else menuSearch.focus();});
  filterTools();
 }
})();
