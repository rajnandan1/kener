import{s as B,A as O,B as R,g as b,l as g,c as q,h as E,i as $,m as w,d as A,k as S,C as k}from"../chunks/scheduler.b29f3093.js";import{S as D,i as H,d as y,v as N,e as d,a as m,o as C,s as j}from"../chunks/index.7aebdd36.js";import{d as P}from"../chunks/singletons.165d7dc8.js";const z=()=>{const t=P;return{page:{subscribe:t.page.subscribe},navigating:{subscribe:t.navigating.subscribe},updated:t.updated}},_={subscribe(t){return z().page.subscribe(t)}},x="node_modules/@sveltejs/kit/src/runtime/components/error.svelte";function f(t){var h;let e,i=t[0].status+"",r,l,n,c=((h=t[0].error)==null?void 0:h.message)+"",a;const v={c:function(){e=b("h1"),r=g(i),l=q(),n=b("p"),a=g(c),this.h()},l:function(s){e=E(s,"H1",{});var o=$(e);r=w(o,i),o.forEach(d),l=A(s),n=E(s,"P",{});var p=$(n);a=w(p,c),p.forEach(d),this.h()},h:function(){S(e,x,4,0,57),S(n,x,5,0,81)},m:function(s,o){m(s,e,o),C(e,r),m(s,l,o),m(s,n,o),C(n,a)},p:function(s,[o]){var p;o&1&&i!==(i=s[0].status+"")&&j(r,i),o&1&&c!==(c=((p=s[0].error)==null?void 0:p.message)+"")&&j(a,c)},i:k,o:k,d:function(s){s&&(d(e),d(l),d(n))}};return y("SvelteRegisterBlock",{block:v,id:f.name,type:"component",source:"",ctx:t}),v}function F(t,e,i){let r;O(_,"page"),R(t,_,a=>i(0,r=a));let{$$slots:l={},$$scope:n}=e;N("Error",l,[]);const c=[];return Object.keys(e).forEach(a=>{!~c.indexOf(a)&&a.slice(0,2)!=="$$"&&a!=="slot"&&console.warn(`<Error> was created with unknown prop '${a}'`)}),t.$capture_state=()=>({page:_,$page:r}),[r]}let K=class extends D{constructor(e){super(e),H(this,e,F,f,B,{}),y("SvelteRegisterComponent",{component:this,tagName:"Error",options:e,id:f.name})}};export{K as component};