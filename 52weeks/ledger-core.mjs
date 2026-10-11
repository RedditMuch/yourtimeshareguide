export const emptyLedger = () => ({pools:[],trips:[]});
export function validDate(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===v;}
export function validateLedger(d){
 const text=(v,n)=>typeof v==='string'&&v.length>0&&v.length<=n;
 const num=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000;
 if(!d||!Array.isArray(d.pools)||!Array.isArray(d.trips)||d.pools.length>50||d.trips.length>500)return false;
 const ids=new Set();
 for(const p of d.pools){if(!p||!text(p.id,80)||ids.has(p.id)||!text(p.name,120)||!validDate(p.start)||!validDate(p.end)||!validDate(p.asOf)||p.start>p.end||!num(p.points)||!(p.hk===null||num(p.hk)))return false;ids.add(p.id);}
 const trips=new Set();
 for(const t of d.trips){if(!t||!text(t.id,80)||trips.has(t.id)||!ids.has(t.poolId)||!text(t.name,180)||!validDate(t.date)||!num(t.points)||!(t.hk===null||num(t.hk))||!['idea','booked','cancelled'].includes(t.status)||typeof t.included!=='boolean'||t.planStayId!==undefined&&t.planStayId!==null&&(typeof t.planStayId!=='string'||! /^[A-Za-z0-9_.-]{1,80}$/.test(t.planStayId)))return false;trips.add(t.id);}
 return true;
}
export function reconcileLedger(data,poolId,update){
 const next=structuredClone(data),pool=next.pools.find(p=>p.id===poolId);
 if(!pool||!Array.isArray(update.includedIds))return null;
 const own=next.trips.filter(t=>t.poolId===poolId&&t.status!=='idea');
 if(update.includedIds.some(id=>!own.some(t=>t.id===id)))return null;
 Object.assign(pool,{points:update.points,hk:update.hk,asOf:update.asOf});
 for(const t of own)t.included=update.includedIds.includes(t.id);
 return validateLedger(next)?next:null;
}
export function balance(pool,trips,scenarioIds=[]){
 const own=trips.filter(t=>t.poolId===pool.id);
 const debits=own.filter(t=>t.status!=='idea'&&!t.included);
 const ideas=own.filter(t=>t.status==='idea'&&scenarioIds.includes(t.id));
 const sum=(rows,key)=>rows.reduce((a,t)=>a+t[key],0);
 const hk=(rows)=>pool.hk===null||rows.some(t=>t.hk===null)?null:pool.hk-sum(rows,'hk');
 return {points:pool.points-sum(debits,'points'),hk:hk(debits),scenarioPoints:pool.points-sum([...debits,...ideas],'points'),scenarioHk:hk([...debits,...ideas]),debited:sum(debits,'points'),ideas:sum(ideas,'points')};
}
