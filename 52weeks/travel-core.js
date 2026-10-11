'use strict';
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => value === null || value === undefined ? 'Not provided' : new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(value);
  function isoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const d = new Date(value + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === value ? d : null;
  }
  function daysBefore(value, days) {
    const d = isoDate(value); if (!d) return null;
    d.setUTCDate(d.getUTCDate() - days); return d.toISOString().slice(0,10);
  }
  function monthsBefore(value, months) {
    const d = isoDate(value); if (!d) return null;
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - months, 1, 12));
    const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(d.getUTCDate(), last));
    return {date: target.toISOString().slice(0,10), clamped: d.getUTCDate() > last};
  }
  const dateLabel = value => isoDate(value) ? new Intl.DateTimeFormat('en-US', {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'}).format(isoDate(value)) : 'Date not provided';
  const tripKey = t => [t.id,t.year,t.week,t.day].join('|');
  function readTrip(value, rows, calendars) {
    const t = typeof value === 'string' ? (()=>{const [id,y,w,day] = value.split('|');return {id,year:Number(y),week:Number(w),day};})() : value;
    if (!t || !rows.some(r=>r.id===t.id) || !Number.isInteger(t.week) || t.week < 1 || t.week > 52 || !['friday','saturday','sunday'].includes(t.day) || !calendars[t.year]?.[t.week]) return null;
    return {id:t.id,year:t.year,week:t.week,day:t.day};
  }
  function decimal(value, maximum=1000000) {
    if (value === '' || value === null || value === undefined) return null;
    const n=Number(value); return Number.isFinite(n) && n >= 0 && n <= maximum ? n : null;
  }
  function cost(points, rate, fees, cash) {
    const allocation = points === null || rate === null ? null : points / 1000 * rate;
    const total = allocation === null || fees === null ? null : allocation + fees;
    return {allocation,total,difference:total===null||cash===null?null:cash-total};
  }
  function calendarFile(events, title, stamp = new Date()) {
    const escape = v => String(v).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
    const date = v => v.replaceAll('-','');
    const fold = line => {
      const parts=[];let part='',bytes=0;
      for(const char of line){const n=new TextEncoder().encode(char).length;if(bytes+n>73){parts.push(part);part=' ';bytes=1;}part+=char;bytes+=n;}parts.push(part);return parts.join('\r\n');
    };
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Owner Atlas//Planning dates//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:'+escape(title)];
    for(const e of events){if(!isoDate(e.date))continue;const uid=encodeURIComponent(title+'|'+e.id+'|'+e.date)+'@owner-atlas';lines.push('BEGIN:VEVENT','UID:'+uid,'DTSTAMP:'+stamp.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'),'DTSTART;VALUE=DATE:'+date(e.date),'DTEND;VALUE=DATE:'+date(daysBefore(e.date,-1)),'SUMMARY:'+escape(e.label+' — '+title),'DESCRIPTION:'+escape(e.description+(e.estimated?'\nPlanning estimate: confirm the actual booking date in your Wyndham account.':'')+(e.source?'\nSource: '+e.source:'')),'TRANSP:TRANSPARENT','END:VEVENT');}
    lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
  }
  function download(text, filename, type) {
    const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  window.TravelCore={esc,number,isoDate,daysBefore,monthsBefore,dateLabel,tripKey,readTrip,decimal,cost,calendarFile,download};
})();
