import{S as I,B as X,C as k,D as y,E as ee,F as w,U as _,G as m,g as b,x as q,H as re,I as ne,J as te,h as F,a as ie,K as se,L as ae,M as fe,N as ue,A as le,O as K,P as M,Q as Y,R as U,z as ce,V as oe,W as de,d as T,X as _e,Y as ve,Z as he,_ as V,$ as be,a0 as pe,a1 as Pe,a2 as j,a3 as ye,a4 as J,a5 as we,a6 as ge,a7 as Q,i as G,a8 as Re,a9 as Ee,aa as H,ab as A,ac as Ie,c as D,ad as W,b as me}from"./runtime.CmAXLf4J.js";import{c as xe}from"./store.DtJVh70z.js";function E(e,r=null,f){if(typeof e!="object"||e===null||I in e)return e;const s=ne(e);if(s!==X&&s!==k)return e;var t=new Map,l=te(e),v=y(0);l&&t.set("length",y(e.length));var p;return new Proxy(e,{defineProperty(c,n,i){(!("value"in i)||i.configurable===!1||i.enumerable===!1||i.writable===!1)&&ee();var u=t.get(n);return u===void 0?(u=y(i.value),t.set(n,u)):w(u,E(i.value,p)),!0},deleteProperty(c,n){var i=t.get(n);if(i===void 0)n in c&&t.set(n,y(_));else{if(l&&typeof n=="string"){var u=t.get("length"),a=Number(n);Number.isInteger(a)&&a<u.v&&w(u,a)}w(i,_),Z(v)}return!0},get(c,n,i){if(n===I)return e;var u=t.get(n),a=n in c;if(u===void 0&&(!a||m(c,n)?.writable)&&(u=y(E(a?c[n]:_,p)),t.set(n,u)),u!==void 0){var o=b(u);return o===_?void 0:o}return Reflect.get(c,n,i)},getOwnPropertyDescriptor(c,n){var i=Reflect.getOwnPropertyDescriptor(c,n);if(i&&"value"in i){var u=t.get(n);u&&(i.value=b(u))}else if(i===void 0){var a=t.get(n),o=a?.v;if(a!==void 0&&o!==_)return{enumerable:!0,configurable:!0,value:o,writable:!0}}return i},has(c,n){if(n===I)return!0;var i=t.get(n),u=i!==void 0&&i.v!==_||Reflect.has(c,n);if(i!==void 0||q!==null&&(!u||m(c,n)?.writable)){i===void 0&&(i=y(u?E(c[n],p):_),t.set(n,i));var a=b(i);if(a===_)return!1}return u},set(c,n,i,u){var a=t.get(n),o=n in c;if(l&&n==="length")for(var h=i;h<a.v;h+=1){var g=t.get(h+"");g!==void 0?w(g,_):h in c&&(g=y(_),t.set(h+"",g))}a===void 0?(!o||m(c,n)?.writable)&&(a=y(void 0),w(a,E(i,p)),t.set(n,a)):(o=a.v!==_,w(a,E(i,p)));var P=Reflect.getOwnPropertyDescriptor(c,n);if(P?.set&&P.set.call(u,i),!o){if(l&&typeof n=="string"){var x=t.get("length"),O=Number(n);Number.isInteger(O)&&O>=x.v&&w(x,O+1)}Z(v)}return!0},ownKeys(c){b(v);var n=Reflect.ownKeys(c).filter(a=>{var o=t.get(a);return o===void 0||o.v!==_});for(var[i,u]of t)u.v!==_&&!(i in c)&&n.push(i);return n},setPrototypeOf(){re()}})}function Z(e,r=1){w(e,e.v+r)}function Ce(e,r,f=!1){F&&ie();var s=e,t=null,l=null,v=null,p=f?ae:0,c=!1;const n=(u,a=!0)=>{c=!0,i(a,u)},i=(u,a)=>{if(v===(v=u))return;let o=!1;if(F){const h=s.data===fe;v===h&&(s=ue(),le(s),K(!1),o=!0)}v?(t?M(t):a&&(t=Y(()=>a(s))),l&&U(l,()=>{l=null})):(l?M(l):a&&(l=Y(()=>a(s))),t&&U(t,()=>{t=null})),o&&K(!0)};se(()=>{c=!1,r(n),c||i(null,null)},p),F&&(s=ce)}function $(e,r){return e===r||e?.[I]===r}function Fe(e={},r,f,s){return oe(()=>{var t,l;return de(()=>{t=l,l=[],T(()=>{e!==f(...l)&&(r(e,...l),t&&$(f(...t),e)&&r(null,...t))})}),()=>{_e(()=>{l&&$(f(...l),e)&&r(null,...l)})}}),e}const Oe={get(e,r){if(!e.exclude.includes(r))return b(e.version),r in e.special?e.special[r]():e.props[r]},set(e,r,f){return r in e.special||(e.special[r]=Ae({get[r](){return e.props[r]}},r,V)),e.special[r](f),H(e.version),!0},getOwnPropertyDescriptor(e,r){if(!e.exclude.includes(r)&&r in e.props)return{enumerable:!0,configurable:!0,value:e.props[r]}},deleteProperty(e,r){return e.exclude.includes(r)||(e.exclude.push(r),H(e.version)),!0},has(e,r){return e.exclude.includes(r)?!1:r in e.props},ownKeys(e){return Reflect.ownKeys(e.props).filter(r=>!e.exclude.includes(r))}};function qe(e,r){return new Proxy({props:e,exclude:r,special:{},version:y(0)},Oe)}const Se={get(e,r){let f=e.props.length;for(;f--;){let s=e.props[f];if(A(s)&&(s=s()),typeof s=="object"&&s!==null&&r in s)return s[r]}},set(e,r,f){let s=e.props.length;for(;s--;){let t=e.props[s];A(t)&&(t=t());const l=m(t,r);if(l&&l.set)return l.set(f),!0}return!1},getOwnPropertyDescriptor(e,r){let f=e.props.length;for(;f--;){let s=e.props[f];if(A(s)&&(s=s()),typeof s=="object"&&s!==null&&r in s){const t=m(s,r);return t&&!t.configurable&&(t.configurable=!0),t}}},has(e,r){if(r===I||r===Q)return!1;for(let f of e.props)if(A(f)&&(f=f()),f!=null&&r in f)return!0;return!1},ownKeys(e){const r=[];for(let f of e.props){A(f)&&(f=f());for(const s in f)r.includes(s)||r.push(s)}return r}};function Be(...e){return new Proxy({props:e},Se)}function z(e){for(var r=q,f=q;r!==null&&!(r.f&(pe|Pe));)r=r.parent;try{return j(r),e()}finally{j(f)}}function Ae(e,r,f,s){var t=(f&ye)!==0,l=!J||(f&we)!==0,v=(f&ge)!==0,p=(f&Ie)!==0,c=!1,n;v?[n,c]=xe(()=>e[r]):n=e[r];var i=I in e||Q in e,u=m(e,r)?.set??(i&&v&&r in e?d=>e[r]=d:void 0),a=s,o=!0,h=!1,g=()=>(h=!0,o&&(o=!1,p?a=T(s):a=s),a);n===void 0&&s!==void 0&&(u&&l&&ve(),n=g(),u&&u(n));var P;if(l)P=()=>{var d=e[r];return d===void 0?g():(o=!0,h=!1,d)};else{var x=z(()=>(t?G:Re)(()=>e[r]));x.f|=he,P=()=>{var d=b(x);return d!==void 0&&(a=void 0),d===void 0?a:d}}if(!(f&V))return P;if(u){var O=e.$$legacy;return function(d,R){return arguments.length>0?((!l||!R||O||c)&&u(R?P():d),d):P()}}var N=!1,B=!1,L=Ee(n),S=z(()=>G(()=>{var d=P(),R=b(L);return N?(N=!1,B=!0,R):(B=!1,L.v=d)}));return t||(S.equals=be),function(d,R){if(arguments.length>0){const C=R?b(S):l&&v?E(d):d;return S.equals(C)||(N=!0,w(L,C),h&&a!==void 0&&(a=C),T(()=>b(S))),d}return b(S)}}function Te(e){D===null&&W(),J&&D.l!==null?De(D).m.push(e):me(()=>{const r=T(e);if(typeof r=="function")return r})}function Ke(e){D===null&&W(),Te(()=>()=>T(e))}function De(e){var r=e.l;return r.u??={a:[],b:[],m:[]}}export{E as a,Fe as b,Ke as c,Ce as i,qe as l,Te as o,Ae as p,Be as s};