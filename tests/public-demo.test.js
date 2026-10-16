 'use strict';
process.env.PUBLIC_DEMO='1';
const test=require('node:test'),assert=require('node:assert/strict');
const {client}=require('./client');const {server}=require('../server');
test('authenticated synthetic demo isolates browser datasets',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`,a=client(base),b=client(base);
 try{await a.login();await b.login();assert.equal((await(await a.call('/donors')).json()).donors.length,2);assert.equal((await a.call('/donors','POST',{bloodGroup:'B+',city:'Bhopal',hospital:'Demo Test Hospital',hlaMarkers:[]})).status,201);assert.equal((await(await b.call('/donors')).json()).donors.length,2);assert.equal((await a.call('/reset','POST',{})).status,403);await a.login('admin');await a.call('/reset','POST',{});assert.equal((await(await a.call('/donors')).json()).donors.length,2);}finally{await new Promise(resolve=>server.close(resolve));}
});
