'use strict';
(()=>{
 const key='wyndham.owner.v1';
 function read(){try{const v=JSON.parse(localStorage.getItem(key)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}}
 function write(patch){const v={...read(),...patch};try{localStorage.setItem(key,JSON.stringify(v));return true;}catch{return false;}}
 window.OwnerState={read,write};
})();
