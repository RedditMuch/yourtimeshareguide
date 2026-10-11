const C=window.TravelCore,P=window.WEEKLY_POINTS,D=window.DIRECTORY,R=window.REFERENCE,G=window.ROOM_GUIDE;
export const rowFor=t=>t&&P.rows.find(r=>r.id===t.id);
export const propertyFor=id=>G.properties.find(p=>p.resort_ids.includes(id));
export const roomFor=id=>G.properties.flatMap(p=>p.rooms).find(r=>r.id===id);
export const resortName=id=>R.resorts.find(r=>r.resort_id===id)?.name||id;
export const choiceFor=value=>C.readTrip(value,P.rows,D.calendars);
export function incomingChoice(){const q=new URLSearchParams(location.search);return choiceFor(q.get('choice'))||choiceFor({id:q.get('pick'),year:Number(q.get('year')),week:Number(q.get('week')),day:q.get('day')});}
export const arrival=t=>t?D.calendars[t.year]?.[t.week]?.[t.day+'_check_in']:null;
export const roomLabel=r=>r?(r.number_kind==='suffix'?'Suffix ':r.number_kind==='paired'?'Map label ':'Room ')+r.room_number:'Record unavailable';
export function choiceLabel(t){const r=rowFor(t);return r?r.name.replace(/^Club Wyndham /,'')+' · '+r.roomType+' · W'+t.week+' / '+t.year+' · '+t.day:'Room research · dates not selected';}
export function contextFor(s){const r=rowFor(s.choice);return {resort:s.resortId,...(r?{pick:r.id,room:r.category,roomLabel:r.roomType,year:s.choice.year,week:s.choice.week,day:s.choice.day}:{}),planId:s.id};}
export const toolLink=(page,s,extra={})=>page+'?'+new URLSearchParams({...contextFor(s),...extra});
export function requestText(s){const p=propertyFor(s.resortId);return [s.name,resortName(s.resortId),s.choice?choiceLabel(s.choice):'Dates / booking category not selected',...s.roomIds.map((id,i)=>{const r=roomFor(id);if(!r)return (i?'Alternate: ':'First choice: ')+'Source record unavailable';return (i?'Alternate: ':'First choice: ')+roomLabel(r)+'; building '+(r.building_label||'not established')+'; floor '+(r.floor??'not established')+'; historical room type '+(r.room_type||'not established')+'; view '+(r.view||'not established')+'; compass '+(r.compass_direction||'not established')+'. '+(r.reported_date||'Source undated')+'. '+(r.confidence==='owner_report'?'Historical owner report':'Published source')+'.\n'+(r.source_ids||[]).map(id=>p?.sources.find(x=>x.id===id)?.url).filter(Boolean).join('\n');}),s.priorities?'My priorities: '+s.priorities:'','Please confirm current room configuration, accessibility and compatibility with my reservation. Requests depend on availability.'].filter(Boolean).join('\n\n');}
