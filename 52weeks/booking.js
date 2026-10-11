'use strict';
(() => {
  const C=window.TravelCore,$=id=>document.getElementById(id),params=new URLSearchParams(location.search),prefs=window.OwnerState.read();
  const sources={booking:'https://clubwyndham.wyndhamdestinations.com/us/en/owner-guide/resources/booking-windows',vip:'https://clubwyndham.wyndhamdestinations.com/us/en/club-benefits/vip-by-wyndham',cancel:'https://clubwyndham.wyndhamdestinations.com/us/en/owner-guide/resources/canceling-reservation',calendar:'https://clubwyndham.wyndhamdestinations.com/us/en/help/glossary'};
  const tiers=window.REFERENCE.vip.tiers;
  const daysBetween=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);
  $('bookingTier').innerHTML='<option value="">No VIP benefit selected</option>'+tiers.map(t=>'<option>'+t.tier+'</option>').join('');
  const linkedTier=params.has('tier')?params.get('tier'):prefs.tier;
  $('bookingTier').value=tiers.some(t=>t.tier===linkedTier)?linkedTier:'';
  $('bookingARP').checked=params.get('arp')==='1';$('bookingProtection').checked=params.get('protection')==='1';$('bookingUpcoming').checked=params.get('upcoming')==='1';
  $('arrivalDate').value=C.isoDate(params.get('date'))?params.get('date'):'';
  $('bookingName').value=(params.get('name')||'My Wyndham trip').slice(0,120);
  let events=[];
  function build() {
    const arrival=$('arrivalDate').value,tier=tiers.find(t=>t.tier===$('bookingTier').value);
    if(!C.isoDate(arrival)||arrival<'2026-01-01'||arrival>'2030-12-31'){events=[];$('nextPlanningDate').hidden=true;$('bookingProgress').hidden=true;$('bookingTimeline').innerHTML='<div class="tool-empty"><h2>Start with your check-in date</h2><p>Your planning dates will appear here. You can also open this tool from a trip comparison.</p></div>';$('exportCalendar').disabled=true;$('copyDates').disabled=true;$('copyPlanningLink').disabled=true;$('bookingSummary').textContent='';return;}
    events=window.BookingCore.planningDates(arrival,{tier,arp:$('bookingARP').checked,protection:$('bookingProtection').checked});
    const today=window.BookingCore.todayEastern();
    $('bookingSummary').textContent=C.dateLabel(arrival)+' · '+(tier?tier.tier:'No VIP selected')+' · '+events.length+' planning dates';
    const upcoming=events.filter(e=>e.date>=today),next=upcoming[0],elapsed=events.length-upcoming.length;
    $('nextPlanningDate').hidden=false;
    $('nextPlanningDate').innerHTML=next?'<div class="next-date-header"><span>Next on your calendar</span><span class="next-countdown">'+(next.date===today?'Today':daysBetween(today,next.date)+' days away')+'</span></div><strong>'+C.dateLabel(next.date)+'</strong><p>'+upcoming.filter(e=>e.date===next.date).map(e=>C.esc(e.label)).join(' · ')+'</p><span class="next-date-basis">'+(next.estimated?'Calendar-month estimate · confirm opening':'Planning milestone · check reservation conditions')+'</span>':'<span>All listed dates have passed</span><p>Choose a future check-in date to plan another stay.</p>';
    $('bookingProgress').hidden=false;
    $('bookingProgress').innerHTML='<div><strong>'+elapsed+' / '+events.length+'</strong><span>milestone dates before today</span></div><div class="calendar-progress-track" aria-hidden="true">'+events.map(e=>'<i class="'+(e.date<today?'elapsed':e.date===today?'today':'future')+'"></i>').join('')+'</div><span>Calendar timing only; no booking or task completion is recorded.</span>';
    const shown=$('bookingUpcoming').checked?upcoming:events;
    $('bookingTimeline').innerHTML=shown.map(e=>'<article class="timeline-event '+(e.date<today?'past':e.date===today?'today':'future')+(next&&e.date===next.date?' is-next':'')+'"><div class="timeline-date"><span class="timeline-index" aria-hidden="true">'+String(events.indexOf(e)+1).padStart(2,'0')+'</span><strong>'+C.dateLabel(e.date)+'</strong><span>'+C.esc(e.date<today?'Date has passed':e.date===today?'Today':'In '+daysBetween(today,e.date)+' days')+'</span></div><div class="timeline-copy"><h2>'+C.esc(e.label)+'</h2><p class="rule-label">'+C.esc(e.rule)+(e.estimated?' <span class="rule-estimate">calendar-month estimate</span>':'')+'</p>'+(e.clamped?'<p class="inline-caution">Month-end date: the equivalent day does not exist. This is a reminder date; confirm the actual opening date.</p>':'')+'<details><summary>Conditions'+(e.source?' & source':'')+'</summary><p>'+C.esc(e.description)+'</p>'+(e.source?'<a href="'+e.source+'" target="_blank" rel="noopener">Official rule</a>':'')+'</details></div></article>').join('')||(next?'':'<p class="timeline-empty">No upcoming milestones for this check-in date. Turn off Upcoming dates only to review the full timeline.</p>');
    $('exportCalendar').disabled=false;$('copyDates').disabled=false;$('copyPlanningLink').disabled=false;
  }
  for(const id of ['arrivalDate','bookingTier','bookingARP','bookingProtection','bookingUpcoming'])$(id).addEventListener('change',build);
  $('exportCalendar').addEventListener('click',()=>{if(!events.length)return;C.download(C.calendarFile(events,$('bookingName').value||'My Wyndham trip'),'wyndham-planning-dates.ics','text/calendar;charset=utf-8');$('calendarStatus').textContent='Calendar file created. Import it into your calendar app; changes here do not update an imported calendar.';});
  $('copyDates').addEventListener('click',async()=>{const text=($('bookingName').value||'My Wyndham trip')+'\n'+events.map(e=>C.dateLabel(e.date)+': '+e.label+' ('+e.rule+(e.estimated?'; estimate':'')+')').join('\n')+'\nMonth-based dates are planning estimates. Verify eligibility and dates in your owner account.';try{await navigator.clipboard.writeText(text);$('calendarStatus').textContent='Planning dates copied.';}catch{$('calendarStatus').innerHTML='<label>Copy planning dates<textarea readonly>'+C.esc(text)+'</textarea></label>';}});
  $('copyPlanningLink').addEventListener('click',async()=>{if(!events.length)return;const url=new URL('booking.html',location.href);url.searchParams.set('date',$('arrivalDate').value);url.searchParams.set('tier',$('bookingTier').value);for(const [key,id] of [['arp','bookingARP'],['protection','bookingProtection'],['upcoming','bookingUpcoming']])if($(id).checked)url.searchParams.set(key,'1');try{await navigator.clipboard.writeText(url.href);$('calendarStatus').textContent='Setup link copied. It includes the date and selected eligibility options; it does not include your trip name. The recipient must confirm their own eligibility.';}catch{$('calendarStatus').innerHTML='<label>Copy this setup link<textarea readonly>'+C.esc(url.href)+'</textarea></label>';}});
  build();
})();
