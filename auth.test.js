'use strict';
process.env.PUBLIC_DEMO='1';
const test=require('node:test'),assert=require('node:assert/strict');
const {client}=require('./client');const {server}=require('../server');
test('credentials, visitor ownership, city scoping and admin read-only access are enforced',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`,c=client(base);
 try{
  assert.equal((await c.call('/requests')).status,401);
  assert.equal((await c.call('/auth/login','POST',{role:'admin',email:'admin@organbridge.example',password:'wrong'})).status,401);
  await c.login('visitor','Bhopal','one@example.test');const created=await c.call('/requests','POST',{organ:'Kidney',bloodGroup:'O+',city:'Bhopal',syntheticOnly:true});assert.equal(created.status,201);const id=(await created.json()).request.id;
  assert.equal((await c.call('/availability','PATCH',{organ:'Kidney',count:1})).status,403);
  await c.login('visitor','Bhopal','two@example.test');assert.equal((await(await c.call('/requests')).json()).requests.length,0);
  await c.login('staff','Indore');assert.equal((await(await c.call('/requests')).json()).requests.length,0);assert.equal((await c.call('/requests/'+id,'PATCH',{status:'IN_REVIEW'})).status,404);
  const login=await c.login('staff','Bhopal');assert.equal((await login.json()).user.city,'Bhopal');assert.equal((await(await c.call('/requests')).json()).requests.length,1);
  assert.equal((await c.call('/requests/'+id,'PATCH',{status:'IN_REVIEW'})).status,200);
  await c.login('admin');assert.equal((await(await c.call('/requests')).json()).requests.length,1);assert.equal((await c.call('/requests/'+id,'PATCH',{status:'CANCELLED'})).status,403);
  await c.call('/auth/logout','POST',{});assert.equal((await c.call('/audit')).status,401);
  assert.equal((await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'visitor',email:'one@example.test'})})).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
