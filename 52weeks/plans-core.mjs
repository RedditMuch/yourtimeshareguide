export const emptyPlans=()=>({version:1,stays:[]});
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_.-]{1,80}$/.test(v);
const text=(v,n)=>typeof v==='string'&&v.length<=n;
const stamp=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(v)&&Number.isFinite(Date.parse(v));
const amount=(v,n=1000000)=>v===null||typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=n;
export const planChoiceKey=t=>t?[t.id,t.year,t.week,t.day].join('|'):null;
export const latestCheck=s=>(s.checks||[]).filter(c=>c.choiceKey===planChoiceKey(s.choice)).at(-1)||null;
export function evidenceURL(v){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&v.length<=2000;}catch{return false;}}
const day=v=>v===null||typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
function checksValid(a,catalog){if(!Array.isArray(a)||a.length>50)return false;const ids=new Set();return a.every(c=>{if(!c||!id(c.id)||ids.has(c.id)||!stamp(c.recordedAt)||!['available','unavailable','unchecked'].includes(c.availability)||!(c.checkedAt===null||stamp(c.checkedAt))||!text(c.fit,1200)||!amount(c.fees)||!amount(c.cash)||!amount(c.rate,1000)||typeof c.choiceKey!=='string')return false;const [row,y,w,d,...extra]=c.choiceKey.split('|');if(extra.length||!id(row)||![2026,2027,2028].includes(Number(y))||!/^\d+$/.test(w)||Number(w)<1||Number(w)>52||!['friday','saturday','sunday'].includes(d)||catalog&&!catalog.choices[row])return false;ids.add(c.id);return true;});}
function evidenceValid(a,catalog){if(!Array.isArray(a)||a.length>30)return false;const ids=new Set();return a.every(e=>{if(!e||!id(e.id)||ids.has(e.id)||!/^R\d{3}$/.test(e.resortId)||catalog&&!catalog.resorts.includes(e.resortId)||!['property','category','room'].includes(e.scope)||!['unreviewed','owner_reviewed'].includes(e.status)||!stamp(e.recordedAt)||!day(e.observedDate)||!text(e.roomNumber,80)||!text(e.category,180)||!text(e.notes,1800)||!e.notes.trim()||!(e.sourceUrl===''||evidenceURL(e.sourceUrl)))return false;ids.add(e.id);return true;});}
/** @param {any} d @param {{resorts:string[],choices:Record<string,string>,rooms:Record<string,string[]>}|null} [catalog] */
export function validatePlans(d,catalog=null){
 if(!d||d.version!==1||!Array.isArray(d.stays)||d.stays.length>100)return false;
 const ids=new Set(),choices=new Set();
 for(const s of d.stays){
  if(!s||!id(s.id)||ids.has(s.id)||typeof s.name!=='string'||!s.name.trim()||s.name.length>180||!/^R\d{3}$/.test(s.resortId)||!Array.isArray(s.roomIds)||s.roomIds.length>2||new Set(s.roomIds).size!==s.roomIds.length||!s.roomIds.every(id)||typeof s.priorities!=='string'||s.priorities.length>1200||typeof s.updatedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(s.updatedAt)||!Number.isFinite(Date.parse(s.updatedAt)))return false;
  ids.add(s.id);const t=s.choice;
  if(t!==null&&(!t||!id(t.id)||![2026,2027,2028].includes(t.year)||!Number.isInteger(t.week)||t.week<1||t.week>52||!['friday','saturday','sunday'].includes(t.day)))return false;
  if(t){const key=[t.id,t.year,t.week,t.day].join('|');if(choices.has(key))return false;choices.add(key);}
  if(catalog&&(!catalog.resorts.includes(s.resortId)||(t&&catalog.choices[t.id]!==s.resortId)||s.roomIds.some(r=>!catalog.rooms[r]?.includes(s.resortId))))return false;
  if(s.checks!==undefined&&!checksValid(s.checks,catalog)||s.evidence!==undefined&&!evidenceValid(s.evidence,catalog))return false;
 }
 return true;
}
