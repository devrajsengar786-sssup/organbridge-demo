'use strict';
(() => {
 const nativeFetch=window.fetch.bind(window),pending=new Map();
 let queue=[],sending=false;
 const post=(type,values={})=>window.parent.postMessage({isStreamlitMessage:true,type,...values},'*');
 const send=()=>{if(sending||!queue.length)return;sending=true;const batch=queue;queue=[];post('streamlit:setComponentValue',{value:batch,dataType:'json'});};
 window.fetch=(input,options={})=>{
  if(typeof input==='string'&&input.startsWith('/api/'))return new Promise((resolve,reject)=>{
   const id=crypto.randomUUID();pending.set(id,{resolve,reject});queue.push({id,path:input,options:{method:options.method||'GET',body:options.body}});queueMicrotask(send);
  });
  return nativeFetch(typeof input==='string'&&input.startsWith('/')?'.'+input:input,options);
 };
 window.addEventListener('message',event=>{
  if(event.source!==window.parent||event.data?.type!=='streamlit:render')return;
  let received=false;
  for(const response of event.data.args?.responses||[]){const item=pending.get(response.id);if(!item)continue;pending.delete(response.id);received=true;item.resolve(new Response(response.text,{status:response.status,headers:{'Content-Type':'application/json'}}));}
  if(received){sending=false;queueMicrotask(send);}
 });
 document.addEventListener('click',async event=>{
  const link=event.target.closest('a[href="/hospitals.json"]');if(!link)return;
  event.preventDefault();const response=await nativeFetch('hospitals.json');const url=URL.createObjectURL(await response.blob());const download=document.createElement('a');download.href=url;download.download='madhya-pradesh-hospitals.json';download.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 post('streamlit:componentReady',{apiVersion:1});
 post('streamlit:setFrameHeight',{height:900});
})();
