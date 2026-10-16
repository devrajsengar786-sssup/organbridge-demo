'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {client}=require('./client');
const {server}=require('../server');
let session;
let base;
async function req(path,method='GET',body){
 const response=await session.call(path.replace('/api',''),method,body);
 return {status:response.status,data:await response.json()};
}
test('API integration: health, match, creation, review, reset',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 base=`http://127.0.0.1:${server.address().port}`;
 session=client(base);await session.login();
 try{
  const health=await req('/api/health');assert.equal(health.status,200);assert.equal(health.data.mode,'SYNTHETIC_ONLY');
  const donors=await req('/api/donors');assert.ok(donors.data.donors.length>=2);
  const first=donors.data.donors[0];
  const matches=await req('/api/matches?donorId='+first.id);
  assert.equal(matches.status,200);assert.equal(matches.data.clinicalDecisionSupported,false);
  assert.ok(matches.data.results.every(x=>x.allocationDecision==='HUMAN_REVIEW_REQUIRED'));
  const failed=await req('/api/donors','POST',{bloodGroup:'invalid',city:'Mars',hospital:'bad',hlaMarkers:[]});
  assert.equal(failed.status,400);
  const created=await req('/api/donors','POST',{bloodGroup:'B+',city:'Bhopal',hospital:'Demo Training Hospital',hlaMarkers:['A*02','B*35']});
  assert.equal(created.status,201);
  const reviewed=await req('/api/reviews','POST',{donorId:first.id,recipientId:matches.data.results[0].recipientId,action:'REQUEST_TESTS'});
  assert.equal(reviewed.status,201);
  const audit=await req('/api/audit');assert.ok(audit.data.audit.some(x=>x.action==='REQUEST_TESTS'));
  await session.login('admin');
  const reset=await req('/api/reset','POST',{});assert.equal(reset.status,200);
 }finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
});
