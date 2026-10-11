'use strict';
(()=>{const C=window.TravelCore;
  const sources={booking:'https://clubwyndham.wyndhamdestinations.com/us/en/owner-guide/resources/booking-windows',vip:'https://clubwyndham.wyndhamdestinations.com/us/en/club-benefits/vip-by-wyndham',cancel:'https://clubwyndham.wyndhamdestinations.com/us/en/owner-guide/resources/canceling-reservation',calendar:'https://clubwyndham.wyndhamdestinations.com/us/en/help/glossary'};
window.BookingCore={sources,todayEastern(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));return p.year+'-'+p.month+'-'+p.day;},planningDates(arrival,{tier=null,arp=false,protection=false}={}){if(!C.isoDate(arrival))return [];
    const events=[];
    function addMonth(id,label,months,description,source){const m=C.monthsBefore(arrival,months);events.push({id,label,date:m.date,estimated:true,clamped:m.clamped,rule:months+' months before',description,source});}
    if(arp)addMonth('arp','Check eligible ARP window',13,'For eligible Club Wyndham Select home-resort or Access inventory. Ownership, point source and inventory restrictions apply. Other ownership programs can use different windows.',sources.booking);
    addMonth('standard','Check standard booking window',10,'Ordinary Club Wyndham standard window. Confirm that your points and requested inventory qualify.',sources.booking);
    addMonth('express','Check express booking window',3,'Ordinary Club Wyndham express window. Check the applicable stay and point-use rules.',sources.booking);
    if(tier){
      addMonth('discount','Check '+tier.tier+' points discount',2,Math.round(tier.points_discount_within_2_months*100)+'% for eligible new reservations if inventory is available. An existing reservation is not automatically repriced.',sources.vip);
      const description='Opt in for an eligible upgrade at the same Club Wyndham resort; availability is required. This is not a promised upgrade.';
      const upgrade={Bronze:{days:15},Silver:{months:1},Gold:{days:45},Platinum:{months:2},Founders:{months:2}}[tier.tier];
      if(upgrade.months)addMonth('upgrade','Check '+tier.tier+' upgrade window',upgrade.months,description,sources.vip);
      else events.push({id:'upgrade',label:'Check '+tier.tier+' upgrade window',date:C.daysBefore(arrival,upgrade.days),rule:upgrade.days+' days before',description,source:sources.vip});
    }
    const protectedTrip=protection;
    events.push({id:'cancellation',label:protectedTrip?'Points Protection cancellation date':'Standard cancellation deadline',date:protectedTrip?arrival:C.daysBefore(arrival,15),rule:protectedTrip?'Check-in day · 11:59 p.m. ET':'15 days before · 11:59 p.m. ET',description:protectedTrip?'Only if Points Protection was purchased for this reservation. Cancel by 11:59 p.m. Eastern Time on check-in day.':'Standard rule: cancel by 11:59 p.m. Eastern Time on the 15th day before check-in. Last-minute bookings have grace-period exceptions. Check your actual reservation and any modifications.',source:sources.cancel});
    events.push({id:'arrival',label:'Check-in',date:arrival,rule:'Arrival date',description:'Confirm check-in time and room requests with the resort. This planning entry is not a reservation confirmation.'});
    events.sort((a,b)=>a.date.localeCompare(b.date));
return events;}};
})();
