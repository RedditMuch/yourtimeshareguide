'use strict';
(()=>{
const D=window.REFERENCE,tiers=D.vip.tiers,$=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>v===null?'Not stated':Math.round(v*100)+'%',yes=v=>v?'Included':'Not included',num=v=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v);
const fields=[
 ['Eligible points each year','points_range_label','Ownership',null,'Eligible ownership determines qualification; resale points do not qualify.'],
 ['Points discount','points_discount_within_2_months','Booking',pct,'For eligible new reservations within 2 months of check-in. This is not a discount on every booking.'],
 ['Complimentary upgrade window','upgrade_window','Booking',null,'Opt in for an upgrade. Subject to eligible inventory and availability.'],
 ['Additional housekeeping credits','additional_housekeeping_credits','Stay',null,'Annual additional credits. Legacy ownership benefits may differ.'],
 ['Guest Confirmations / calendar year','guest_confirmations_per_calendar_year','Stay'],
 ['Unlimited Reservation Transactions','unlimited_reservation_transactions','Booking',yes],
 ['Reciprocal ARP / calendar year','reciprocal_arp_per_calendar_year','Booking',null,'Eligible locations and suite categories apply. See reservation-window rules.'],
 ['Margaritaville access before check-in','margaritaville_access','Booking'],
 ['Points Deposit deadline¹','points_deposit_deadline','Points',null,'Measured from the start of the Use Year, not before your trip.'],
 ['Maintenance Dollars deadline¹','maintenance_conversion_deadline','Points',null,'Measured from the start of the Use Year.'],
 ['2 p.m. early check-in²','early_checkin_2pm','Stay',yes,'Subject to availability and eligible locations.'],
 ['Request a specific suite²','request_specific_suite','Stay',yes,'Request a suite number when reserving. Wyndham-managed locations only; subject to availability.'],
 ['Wyndham Rewards status','wyndham_rewards_status','Points'],
 ['Extra Rewards conversion time','rewards_extra_conversion_time','Points',null,'Additional conversion time, not a base exchange rate.'],
 ['Rewards conversion points cap','rewards_points_cap','Points',pct],
 ['Rewards conversion bonus before Use Year','rewards_conversion_bonus_before_use_year','Points',pct],
 ['Vacation Sidekick renewal','vacation_sidekick_renewal','Ownership',yes],
 ['RCI automatic deposit','rci_auto_deposit','Points',yes]
];
const example=new URLSearchParams(location.search).get('points');if(example&&Number(example)>0&&Number(example)<=10000000)$('examplePoints').value=example;const linkedBenefit=new URLSearchParams(location.search).get('benefit');let mode='tier';const saved=window.OwnerState?.read()||{},remembered=saved.tier;const pins=new Set(Array.isArray(saved.benefitPins)?saved.benefitPins.filter(k=>fields.some(f=>f[1]===k)):[]);
$('vipTier').innerHTML=tiers.map(t=>'<option>'+t.tier+'</option>').join('');$('vipTier').value=tiers.some(t=>t.tier===remembered)?remembered:tiers[0].tier;
$('vipCompare').innerHTML='<option value="">No comparison</option>'+tiers.map(t=>'<option>'+t.tier+'</option>').join('');
$('benefitGroup').innerHTML='<option value="">All benefits</option>'+['Booking','Stay','Points','Ownership'].map(g=>'<option>'+g+'</option>').join('');
const value=(t,f)=>f[3]?f[3](t[f[1]]):t[f[1]],valueState=(t,f)=>t[f[1]]===null?'unstated':t[f[1]]===true?'included':t[f[1]]===false?'excluded':'value',briefConditions={points_range_label:'Resale points do not qualify',points_discount_within_2_months:'Eligible new reservations · within 2 months',upgrade_window:'Opt in · subject to availability',additional_housekeeping_credits:'Annual credits · legacy benefits may differ',reciprocal_arp_per_calendar_year:'Eligible resorts & suite categories',points_deposit_deadline:'From the start of the Use Year',maintenance_conversion_deadline:'From the start of the Use Year',early_checkin_2pm:'Availability & location limits',request_specific_suite:'Managed resorts · subject to availability'},source='<a href="charts/page-272.webp" target="_blank" rel="noopener">Directory p. 272</a> · <a href="charts/page-273.webp" target="_blank" rel="noopener">273</a> · <a href="charts/page-274.webp" target="_blank" rel="noopener">274</a>';
function render(){
 const focus=tiers.find(t=>t.tier===$('vipTier').value)||tiers[0],other=tiers.find(t=>t.tier===$('vipCompare').value&&t!==focus),shown=other?[focus,other]:[focus];
 const opened=new Set([...$('vipCards').querySelectorAll('details[open]'),...$('benefitView').querySelectorAll('details[open]')].map(e=>e.dataset.benefit));
 const changed=other?fields.filter(f=>value(focus,f)!==value(other,f)).length:0;
 if($('vipTierSummary'))$('vipTierSummary').innerHTML='<div><span class="tier-overline">Tier in focus</span><strong>'+esc(focus.tier)+'</strong><span class="tier-qualification">'+esc(focus.points_range_label)+' <small>eligible points / year</small></span></div><p>'+(other?'<strong>'+changed+' of 18 benefits differ</strong><span>'+esc(focus.tier)+' compared with '+esc(other.tier)+'</span>':'<strong>Eligible ownership required</strong><span>Resale points do not qualify. Published conditions apply.</span>')+'</p>';
 $('vipDifferences').disabled=!other||mode!=='tier';$('benefitSearch').disabled=mode==='table';$('benefitGroup').disabled=mode==='table';$('vipPinned').disabled=mode==='table';$('openBenefitFilters').disabled=mode==='table';$('differenceLabel').classList.toggle('disabled',!other);
 const query=$('benefitSearch').value.trim().toLowerCase(),group=$('benefitGroup').value;
 const visible=fields.filter(f=>(!$('vipPinned').checked||pins.has(f[1]))&&(!group||f[2]===group)&&(!query||[f[0],f[4],...tiers.map(t=>value(t,f))].join(' ').toLowerCase().includes(query))&&(!(mode==='tier'&&other&&$('vipDifferences').checked)||value(focus,f)!==value(other,f))).sort((a,b)=>Number(pins.has(b[1]))-Number(pins.has(a[1])));
 $('vipCount').textContent=visible.length+' of 18 benefits'+(other&&mode==='tier'?' · '+focus.tier+' compared with '+other.tier:'')+(mode==='benefit'?' · all five tiers for every benefit':'');
 if(mode==='table')$('vipCount').textContent='Complete chart · all 18 benefits and five tiers';$('vipCards').hidden=mode!=='tier';$('benefitView').hidden=mode!=='benefit';$('vipTable').hidden=mode!=='table';
 for(const m of ['tier','benefit','table'])$('mode'+m).setAttribute('aria-pressed',String(mode===m));
 $('vipColumnHeads').hidden=mode!=='tier';$('vipColumnHeads').style.setProperty('--tier-count',shown.length);$('vipColumnHeads').innerHTML='<span>Benefit · tap for all tiers</span>'+shown.map(t=>'<strong>'+esc(t.tier)+'</strong>').join('');
 const activeFilters=Number(!!query)+Number(!!group)+Number(mode==='tier'&&!!other&&$('vipDifferences').checked)+Number($('vipPinned').checked);$('openBenefitFilters').textContent='Filter'+(activeFilters?' · '+activeFilters:'');
 $('vipCards').innerHTML=visible.map(f=>{const different=other&&value(focus,f)!==value(other,f);return '<article class="benefit-card"'+(different?' data-different="true"':'')+'><details data-benefit="'+f[1]+'"'+(opened.has(f[1])||f[1]===linkedBenefit?' open':'')+'><summary><span class="benefit-matrix" style="--tier-count:'+shown.length+'"><span class="benefit-name"><small class="benefit-category">'+f[2]+(pins.has(f[1])?' · Pinned':'')+'</small>'+f[0]+'</span>'+shown.map(t=>'<strong data-benefit-state="'+valueState(t,f)+'" aria-label="'+esc(t.tier+': '+value(t,f))+'">'+esc(value(t,f))+'</strong>').join('')+'</span><span class="benefit-row-meta">'+(briefConditions[f[1]]?'<span>'+esc(briefConditions[f[1]])+'</span>':'')+(other?'<span class="benefit-difference"'+(different?' data-changed="true"':'')+'>'+(different?'Differs':'Same')+'</span>':'')+'</span></summary><div class="benefit-expanded">'+expanded(f,focus,other,different)+'</div></details></article>';}).join('')||'<div class="empty-panel">No benefits match. Open Filter to reset. To pin a benefit, open its row and choose Pin benefit.</div>';
 $('benefitView').innerHTML=visible.map(f=>'<article class="benefit-overview"><div class="benefit-overview-head"><h2><small>'+f[2]+(pins.has(f[1])?' · Pinned':'')+'</small>'+f[0]+'</h2></div>'+across(f,focus)+'<details data-benefit="'+f[1]+'"'+(opened.has(f[1])||f[1]===linkedBenefit?' open':'')+'><summary>Conditions, source & tools</summary><div class="benefit-expanded">'+expanded(f,focus,null,false,false)+'</div></details></article>').join('')||'<p class="notice">No benefits match your filters.</p>';
 $('vipTable').innerHTML='<table class="reference-table vip"><caption class="sr-only">All 18 benefits across all five tiers</caption><thead><tr><th>Benefit</th>'+tiers.map(t=>'<th>'+t.tier+'</th>').join('')+'</tr></thead><tbody>'+fields.map(f=>'<tr><th scope="row">'+f[0]+'</th>'+tiers.map(t=>'<td>'+esc(value(t,f))+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 renderExample(shown);
}
function expanded(f,focus,other,different,showAcross=true){return '<div class="benefit-expanded-head"><span>'+f[2]+(other?' · '+(different?'Different':'Same')+' across selected tiers':'')+'</span><button class="text-button" data-pin="'+f[1]+'" aria-pressed="'+pins.has(f[1])+'">'+(pins.has(f[1])?'Unpin':'Pin benefit')+'</button></div>'+(f[4]?'<p class="benefit-context">'+esc(f[4])+'</p>':'')+(showAcross?across(f,focus):'')+'<p class="benefit-source">'+source+'</p>'+action(f);}
function action(f){
 const tier=$('vipTier').value,actions={
  request_specific_suite:[['rooms.html','Explore room numbers & views']],
  upgrade_window:[['booking.html?tier='+encodeURIComponent(tier),'Plan upgrade dates for '+tier]],
  additional_housekeeping_credits:[['ledger.html','Review housekeeping credits'],['fees.html?fee=additional-housekeeping-credit','Check the extra-credit charge']],
  unlimited_reservation_transactions:[['fees.html?fee=additional-reservation-transaction-by-phone','Check transaction charges']],
  points_deposit_deadline:[['fees.html?task=points','Check deposit fees & conditions']],
  reciprocal_arp_per_calendar_year:[['windows.html?q=reciprocal','Read reciprocal ARP rules']],
  margaritaville_access:[['windows.html?q=Margaritaville','Read Margaritaville booking rules']],
  points_discount_within_2_months:[['compare.html','Compare exact stay points'],['booking.html?tier='+encodeURIComponent(tier),'Plan discount dates for '+tier]],
  guest_confirmations_per_calendar_year:[['fees.html?task=guests','Check additional guest charges']]
 },links=actions[f[1]];if(!links)return '';
 return '<div class="benefit-next-links">'+links.map(([url,label])=>'<a class="module-link" href="'+esc(window.TripContext.href(url.split('?')[0],Object.fromEntries(new URLSearchParams(url.split('?')[1]||''))))+'">'+esc(label)+'</a>').join('')+'</div>';
}
function across(f,focus){return '<dl class="tier-ladder">'+tiers.map(t=>'<div'+(t===focus?' class="focused-tier"':'')+'><dt>'+t.tier+'</dt><dd data-benefit-state="'+valueState(t,f)+'">'+esc(value(t,f))+'</dd></div>').join('')+'</dl>';}
function renderExample(shown){const base=Number($('examplePoints').value);if(!Number.isFinite(base)||base<1||base>10000000){$('discountExample').innerHTML='<p>Enter a reservation total from 1 to 10,000,000 points.</p>';return;}$('discountExample').innerHTML='<div class="example-base">Full price <strong>'+num(base)+' pts</strong></div>'+shown.map(t=>{const saved=base*t.points_discount_within_2_months;return '<div class="example-tier"><div><strong>'+t.tier+'</strong><span>'+pct(t.points_discount_within_2_months)+' discount</span></div><div><strong>'+num(base-saved)+' pts</strong><span>'+num(saved)+' points saved</span></div></div>';}).join('');}
for(const id of ['vipTier','vipCompare','benefitGroup','vipDifferences','vipPinned'])$(id).addEventListener('change',render);
for(const id of ['benefitSearch','examplePoints'])$(id).addEventListener('input',render);
for(const m of ['tier','benefit','table'])$('mode'+m).addEventListener('click',()=>{mode=m;render();});
$('vipRemember').addEventListener('click',()=>{$('vipRememberStatus').textContent=window.OwnerState?.write({tier:$('vipTier').value})?'Tier remembered in this browser.':'This browser could not save your tier.';});
$('benefitReset').addEventListener('click',()=>{$('benefitSearch').value='';$('benefitGroup').value='';$('vipDifferences').checked=false;$('vipPinned').checked=false;render();});
$('openBenefitFilters').addEventListener('click',()=>$('benefitFilters').showModal());
for(const id of ['closeBenefitFilters','applyBenefitFilters'])$(id).addEventListener('click',()=>$('benefitFilters').close());
for(const container of ['vipCards','benefitView'])$(container).addEventListener('click',e=>{const b=e.target.closest('[data-pin]');if(!b)return;const key=b.dataset.pin;if(!fields.some(f=>f[1]===key))return;pins.has(key)?pins.delete(key):pins.add(key);const ok=window.OwnerState?.write({benefitPins:[...pins]});render();$('vipCount').textContent+=' · '+(ok?'Pins saved in this browser':'Pin updated for this visit');$(container).querySelector('[data-pin="'+key+'"]')?.focus();});
$('notes').innerHTML='<p class="status-line">¹ From the start of the Use Year. ² Subject to availability. '+source+'</p><details class="notes"><summary>Eligibility, limits & source notes</summary>'+D.vip.caveats.map(n=>'<p><strong>'+esc(n.title)+'.</strong> '+esc(n.text)+'</p>').join('')+'<p><a href="https://clubwyndham.wyndhamdestinations.com/us/en/club-benefits/vip-by-wyndham" target="_blank" rel="noopener">Official VIP benefit terms</a> · discount and upgrade windows checked October 6, 2026.</p></details>';
render();
})();
