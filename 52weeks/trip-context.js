'use strict';
(()=>{
 const p=new URLSearchParams(location.search),c={};
 const safe=(key,max)=>{const v=p.get(key);if(v&&v.length<=max)c[key]=v;};
 if(/^R\d{3}$/.test(p.get('resort')||''))c.resort=p.get('resort');
 for(const key of ['pick','room','roomLabel','planId','unit'])safe(key,key==='roomLabel'?180:80);
 if([2026,2027,2028].includes(Number(p.get('year'))))c.year=Number(p.get('year'));
 if(Number.isInteger(Number(p.get('week')))&&Number(p.get('week'))>=1&&Number(p.get('week'))<=52)c.week=Number(p.get('week'));
 if(['friday','saturday','sunday'].includes(p.get('day')))c.day=p.get('day');
 function query(extra={}){
  const base={...c};
  if(extra.resort&&extra.resort!==c.resort)for(const key of ['pick','room','roomLabel','planId','unit'])delete base[key];
  return new URLSearchParams(Object.entries({...base,...extra}).filter(([,v])=>v!==undefined&&v!==null&&v!==''));
 }
 function href(page,extra={}){const q=query(extra).toString();return page+(q?'?'+q:'');}
 function resortNavigation(active,resort,extra={}){
  if(!/^R\d{3}$/.test(resort||''))return '';
  const escape=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const sections=[['resorts','Overview'],['rooms','Rooms'],['layouts','Plans & maps'],['seasons','Points']];
  return '<nav class="resort-sections" aria-label="Sections for this resort"><span>At this resort</span><div>'+sections.map(([page,label])=>'<a href="'+escape(href(page+'.html',{resort,...extra}))+'"'+(page===active?' aria-current="page"':'')+'>'+label+'</a>').join('')+'</div></nav>';
 }
 window.TripContext={current:c,query,href,resortNavigation};
})();
