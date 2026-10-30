'use strict';
(()=>{const G=window.GEOGRAPHY||{resorts:[],cities:[]};const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();const byId=new Map(G.resorts.map(r=>[r.resort_id,r]));const cities=G.cities||[];
const exactIndex=new Map(), nameIndex=new Map();
for(const c of cities){exactIndex.set(norm(c.label),c);for(const key of new Set([c.name,...(c.aliases||[])].map(norm).filter(Boolean))){if(!nameIndex.has(key))nameIndex.set(key,[]);nameIndex.get(key).push(c);}}
let lastQuery=null,lastCenter=null;
function resolve(q){const n=norm(q);if(n===lastQuery)return lastCenter;lastQuery=n;const exact=exactIndex.get(n);const named=nameIndex.get(n)||[];lastCenter=exact||(named.length===1?named[0]:clearlyBiggest(named));return lastCenter;}
/* A name shared by several places (owner, 2026-10-29: more towns were added, marked x, so "Boston" now has small namesakes):
   a name that meant one place before still does; otherwise use the biggest when it is at least 3 times the next, else none. */
function clearlyBiggest(list){if(list.length<2)return null;const before=list.filter(c=>!c.x);if(before.length===1)return before[0];const s=list.slice().sort((a,b)=>(b.population||0)-(a.population||0));return (s[0].population||0)>=3*(s[1].population||0)&&(s[0].population||0)>0?s[0]:null;}
function miles(a,b){const rad=Math.PI/180;const x=(b.lat-a.lat)*rad,y=(b.lng-a.lng)*rad;const h=Math.sin(x/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(y/2)**2;return 3958.7613*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
function point(r){return byId.get(r.resort_id)||null;}
function distance(r,c){const p=point(r);return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)?miles(c,p):null;}
function match(r,q,radius){const center=resolve(q);if(center){const d=distance(r,center);return d!==null&&d<=radius;}return norm(q).split(' ').filter(Boolean).every(w=>norm([r.name,r.city,r.state_province||r.state,r.country,r.schedule].join(' ')).includes(w));}
function options(){return cities.map(c=>'<option value="'+String(c.label).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"></option>').join('');}
window.ResortGeo={resolve,miles,point,distance,match,options,norm,cities,coverage:G.coverage,sources:G.sources};})();
