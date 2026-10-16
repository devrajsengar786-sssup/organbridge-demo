'use strict';
// Local-first hackathon simulator. NEVER store real patient data in this application.
const http=require('node:http');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const path=require('node:path');
const {URL}=require('node:url');
const {randomUUID}=require('node:crypto');
const {AsyncLocalStorage}=require('node:async_hooks');
const {createSeed,cityCoordinates}=require('./data/seed');
const {assessAll}=require('./lib/matching');
const auth=require('./lib/auth');

const PUBLIC_DEMO=process.env.PUBLIC_DEMO==='1'||Boolean(process.env.RAILWAY_ENVIRONMENT);
const PORT=Number(process.env.PORT||3000);
const HOST=process.env.HOST||(PUBLIC_DEMO?'0.0.0.0':'127.0.0.1');
const requests=new AsyncLocalStorage();
const demoSessions=new Map();
const DEMO_SESSION_TTL=60*60*1000;
const MAX_DEMO_SESSIONS=250;
const DATA_FILE=path.join(__dirname,'data','demo-db.json');
const PUBLIC=path.join(__dirname,'public');
const allowedBlood=['O+','O-','A+','A-','B+','B-','AB+','AB-'];
const validReviewActions=['REQUEST_TESTS','FLAG_FOR_COORDINATOR','MARK_REVIEWED'];
const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json'};
let db;
if(PUBLIC_DEMO){db=createSeed();}
else{try{db=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));}catch{db=createSeed();saveSync();}}
function activeDb(){return PUBLIC_DEMO?(requests.getStore()?.db||db):db;}
function resetDb(){if(PUBLIC_DEMO){const state=requests.getStore();if(state)state.db=createSeed();}else{db=createSeed();saveSync();}}
function saveSync(){
  if(PUBLIC_DEMO)return; // Hosted visitors' fictional records are never written to disk.
  const temp=DATA_FILE+'.tmp';
  fs.writeFileSync(temp,JSON.stringify(db,null,2));
  fs.renameSync(temp,DATA_FILE);
}
function response(res,status,data){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(data));
}
async function bodyJson(req){
  let bytes=0,parts=[];
  for await(const chunk of req){
    bytes+=chunk.length;
    if(bytes>12_000){const err=new Error('Maximum JSON body size exceeded');err.status=413;throw err;}
    parts.push(chunk);
  }
  try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{const e=new Error('Invalid JSON body');e.status=400;throw e;}
}
function appendAudit(action,target,description){
  activeDb().audit.unshift({id:'AUD-'+String(activeDb().audit.length+1).padStart(4,'0'),time:new Date().toISOString(),actor:'Demo Coordinator',action,target,description});
}
function summary(){
  return {demo:true,donorCount:activeDb().donors.length,recipientCount:activeDb().recipients.length,openCases:activeDb().donors.filter(x=>x.status==='OPEN').length,pendingReviews:activeDb().reviews.filter(x=>x.action==='REQUEST_TESTS').length,recentAudit:activeDb().audit.slice(0,4)};
}
async function handleApi(req,res,pathname,searchParams){
 if(pathname==='/api/auth/session'&&req.method==='GET')return response(res,200,{user:auth.current(req)});
 if(!['GET','HEAD'].includes(req.method)){
  if(req.headers['x-organbridge-request']!=='1')return response(res,403,{error:'Use the OrganBridge application to send this request.'});
  if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return response(res,403,{error:'Cross-site requests are not allowed.'});}catch{return response(res,403,{error:'Invalid request origin.'});}}
 }
 if(pathname==='/api/auth/login'&&req.method==='POST'){const result=auth.login(req,res,await bodyJson(req));return response(res,result.status||200,result);}
 if(pathname==='/api/auth/logout'&&req.method==='POST'){auth.logout(req,res);return response(res,200,{ok:true});}
 const user=auth.current(req);
 if(pathname!=='/api/health'){
  if(!user)return response(res,401,{error:'Please log in to continue.'});
  const visitorAllowed=['/api/requests','/api/appointments'].includes(pathname)&&req.method==='GET'||pathname==='/api/requests'&&req.method==='POST';
  if(user.role==='visitor'&&!visitorAllowed)return response(res,403,{error:'This action requires hospital staff access.'});
  if(user.role==='admin'&&req.method!=='GET'&&pathname!=='/api/reset')return response(res,403,{error:'Administrator supervision is read-only.'});
  if(user.role==='staff'&&pathname==='/api/reset')return response(res,403,{error:'Only an administrator can reset the demo.'});
 }
 const canRequest=r=>user?.role==='admin'||user?.role==='staff'&&r.city===user.city||user?.role==='visitor'&&r.ownerId===user.ownerId;
 const canAppointment=a=>user?.role==='admin'&&a.audience==='STAFF_ONLY'||user?.role==='staff'&&a.audience==='STAFF_ONLY'&&(a.city===user.city||a.toCity===user.city)||user?.role==='visitor'&&a.audience!=='STAFF_ONLY'&&(activeDb().requests||[]).some(r=>r.id===a.requestId&&r.ownerId===user.ownerId);
 const requestStatuses={SUBMITTED:'Demo request submitted',IN_REVIEW:'Coordinator review in progress',INFORMATION_REQUESTED:'Sample documents requested',FOLLOW_UP:'Demo follow-up scheduled',CLOSED:'Demo request closed',CANCELLED:'Demo request cancelled by staff'};
 if(pathname==='/api/requests'&&req.method==='GET')return response(res,200,{requests:(activeDb().requests||[]).filter(canRequest),syntheticOnly:true});
 if(pathname==='/api/requests'&&req.method==='POST'){
  const input=await bodyJson(req);
  if(!input||input.syntheticOnly!==true||!['Kidney','Heart','Liver','Lung','Pancreas','Intestine'].includes(input.organ)||!allowedBlood.includes(input.bloodGroup)||!Object.hasOwn(cityCoordinates,input.city)||Object.keys(input).some(k=>!['organ','bloodGroup','city','syntheticOnly'].includes(k)))return response(res,400,{error:'Select a sample organ, blood group and demo city. No personal details are accepted.'});
  const entries=activeDb().requests||=([]);
  if(entries.length>=20)return response(res,429,{error:'Demo request limit reached. Reset the demonstration to continue.'});
  if(user.role!=='visitor')return response(res,403,{error:'Only visitors submit demo requests.'});
  const time=new Date().toISOString(),entry={ownerId:user.ownerId,id:'REQ-'+randomUUID().slice(0,8).toUpperCase(),organ:input.organ,bloodGroup:input.bloodGroup,city:input.city,status:'SUBMITTED',syntheticOnly:true,createdAt:time,updatedAt:time,history:[{status:'SUBMITTED',time,message:requestStatuses.SUBMITTED}]};
  entries.unshift(entry);appendAudit('DEMO_REQUEST_SUBMITTED',entry.id,'Fictional organ coordination request submitted; no real waiting-list registration.');saveSync();return response(res,201,{request:entry});
 }
 if(pathname.startsWith('/api/requests/')&&req.method==='PATCH'){
  const entry=(activeDb().requests||[]).find(r=>r.id===pathname.split('/').pop());if(!entry||!canRequest(entry))return response(res,404,{error:'Demo request not found in this browser session.'});
  const input=await bodyJson(req);
  if(!input||!Object.hasOwn(requestStatuses,input.status)||input.status==='SUBMITTED'||Object.keys(input).some(k=>k!=='status'))return response(res,400,{error:'Select a supported administrative demo status.'});
  if(['CLOSED','CANCELLED'].includes(entry.status))return response(res,409,{error:'Closed or cancelled demo requests cannot be updated.'});
  if(entry.status===input.status)return response(res,200,{request:entry});
  if(entry.history.length>=30)return response(res,429,{error:'Demo update limit reached.'});
  if(input.status==='CANCELLED')for(const appointment of activeDb().appointments||[]){if(appointment.requestId===entry.id&&appointment.status==='SCHEDULED'){appointment.status='CANCELLED';appointment.updatedAt=new Date().toISOString();}}
  entry.status=input.status;entry.updatedAt=new Date().toISOString();entry.history.push({status:entry.status,time:entry.updatedAt,message:requestStatuses[entry.status]});appendAudit('DEMO_REQUEST_UPDATED',entry.id,requestStatuses[entry.status]+'; simulation only.');saveSync();return response(res,200,{request:entry});
 }
 if(pathname==='/api/availability'&&req.method==='GET')return response(res,200,{availability:activeDb().availability||['Kidney','Heart','Liver','Lung','Pancreas','Intestine'].map(organ=>({organ,count:0,updatedAt:null})),syntheticOnly:true});
 if(pathname==='/api/availability'&&req.method==='PATCH'){
  const input=await bodyJson(req),organs=['Kidney','Heart','Liver','Lung','Pancreas','Intestine'];
  if(!input||!organs.includes(input.organ)||!Number.isInteger(input.count)||input.count<0||input.count>20||Object.keys(input).some(k=>!['organ','count'].includes(k)))return response(res,400,{error:'Choose an organ and a whole simulation count from 0 to 20.'});
  const rows=activeDb().availability||=(organs.map(organ=>({organ,count:0,updatedAt:null})));const record=rows.find(r=>r.organ===input.organ);record.count=input.count;record.updatedAt=new Date().toISOString();appendAudit('SIMULATED_AVAILABILITY_UPDATED',input.organ,'Fictional scenario count set to '+input.count+'. No real organs available or reserved.');saveSync();return response(res,200,{availability:rows});
 }
 if(pathname==='/api/appointments'&&req.method==='GET')return response(res,200,{appointments:(activeDb().appointments||[]).filter(canAppointment),syntheticOnly:true});
 if(pathname==='/api/appointments'&&req.method==='POST'){
  const input=await bodyJson(req),entry=(activeDb().requests||[]).find(r=>r.id===input?.requestId),date=new Date(input?.time);
  if(!entry||!canRequest(entry)||['CLOSED','CANCELLED'].includes(entry.status)||typeof input.time!=='string'||!Number.isFinite(date.getTime())||date.getTime()<=Date.now()||date.getTime()>Date.now()+366*86400000||Object.keys(input).some(k=>!['requestId','time','staffTo','toCity'].includes(k)))return response(res,400,{error:'Select an active demo request and a future date within one year.'});
  if(!['lab','coordinator','operations'].includes(input.staffTo))return response(res,400,{error:'Select a fictional receiving staff member.'});
  if(input.toCity!==undefined&&(!Object.hasOwn(cityCoordinates,input.toCity)||input.toCity===entry.city))return response(res,400,{error:'Choose a different fictional receiving hospital city.'});
  const rows=activeDb().appointments||=[];if(rows.length>=40)return response(res,429,{error:'Demo appointment limit reached.'});
  if(rows.some(a=>a.requestId===entry.id&&a.audience==='STAFF_ONLY'&&a.status==='SCHEDULED'))return response(res,409,{error:'This request already has a scheduled demo appointment.'});
  const appointment={id:'APT-'+randomUUID().slice(0,8).toUpperCase(),requestId:entry.id,staffFrom:'Demo Hospital Staff',staffTo:input.staffTo,audience:'STAFF_ONLY',fromHospital:'Demo '+entry.city+' Coordination Hospital',toCity:input.toCity||null,toHospital:input.toCity?'Demo '+input.toCity+' Coordination Hospital':null,organ:entry.organ,city:entry.city,time:date.toISOString(),status:'SCHEDULED',updatedAt:new Date().toISOString(),syntheticOnly:true};rows.unshift(appointment);appendAudit('DEMO_APPOINTMENT_SCHEDULED',appointment.id,'Internal fictional staff meeting created; no visitor appointment or real invitation.');saveSync();return response(res,201,{appointment});
 }
 if(pathname.startsWith('/api/appointments/')&&req.method==='PATCH'){
  const input=await bodyJson(req),appointment=(activeDb().appointments||[]).find(a=>a.id===pathname.split('/').pop());
  if(!appointment||!canAppointment(appointment))return response(res,404,{error:'Demo appointment not found.'});
  if(!input||!['COMPLETED','CANCELLED'].includes(input.status)||Object.keys(input).some(k=>k!=='status'))return response(res,400,{error:'Choose completed or cancelled.'});
  if(appointment.status!=='SCHEDULED')return response(res,409,{error:'This demo appointment is already finished or cancelled.'});
  appointment.status=input.status;appointment.updatedAt=new Date().toISOString();appendAudit('DEMO_APPOINTMENT_UPDATED',appointment.id,'Demo appointment '+input.status.toLowerCase()+'.');saveSync();return response(res,200,{appointment});
 }
 if(req.method==='GET'&&pathname==='/api/health')return response(res,200,{ok:true,mode:'SYNTHETIC_ONLY',version:'0.1.0'});
 if(req.method==='GET'&&pathname==='/api/overview')return response(res,200,summary());
 if(req.method==='GET'&&pathname==='/api/donors')return response(res,200,{donors:activeDb().donors});
 if(req.method==='GET'&&pathname==='/api/recipients')return response(res,200,{recipients:activeDb().recipients});
 if(req.method==='GET'&&pathname==='/api/audit')return response(res,200,{audit:activeDb().audit,reviews:activeDb().reviews});
 if(req.method==='GET'&&pathname==='/api/matches'){
   const donor=activeDb().donors.find(d=>d.id===searchParams.get('donorId'));
   if(!donor)return response(res,404,{error:'Select an existing donor record.'});
   return response(res,200,{
     donor,results:assessAll(donor,activeDb().recipients.filter(r=>r.status==='ACTIVE')),
     info:'Simulation only: preliminary ABO screen, sample HLA labels and approximate air distance. Not a clinical crossmatch, transplant eligibility or organ allocation recommendation.',
     clinicalDecisionSupported:false
   });
 }
 if(req.method==='POST'&&pathname==='/api/donors'){
   const input=await bodyJson(req);
   if(!input||typeof input!=='object'||!allowedBlood.includes(input.bloodGroup)||
     !Object.prototype.hasOwnProperty.call(cityCoordinates,input.city)||
     typeof input.hospital!=='string'||input.hospital.trim().length<3||input.hospital.length>65||
     !Array.isArray(input.hlaMarkers)||input.hlaMarkers.length>8||
     input.hlaMarkers.some(m=>typeof m!=='string'||!/^[A-Za-z0-9*:\-]{2,18}$/.test(m))){
       return response(res,400,{error:'Use a supported blood group, demo city, organization label and up to 8 example HLA markers.'});
   }
   if(PUBLIC_DEMO && activeDb().donors.length>=12)return response(res,429,{error:'Demo session limit reached. Reset your fictional records to continue.'});
   const id='DNR-'+String(Math.max(2049,...activeDb().donors.map(d=>Number(d.id.split('-')[1])||0))+1);
   const donor={id,organ:'Kidney',bloodGroup:input.bloodGroup,city:input.city,hospital:input.hospital.trim(),location:cityCoordinates[input.city],hlaMarkers:input.hlaMarkers,createdAt:new Date().toISOString(),status:'OPEN'};
   activeDb().donors.unshift(donor);
   appendAudit('DEMO_DONOR_CREATED',id,'New synthetic kidney donor record added for training.');
   saveSync();return response(res,201,{donor});
 }
 if(req.method==='POST'&&pathname==='/api/reviews'){
   const input=await bodyJson(req);
   const donor=activeDb().donors.find(d=>d.id===input?.donorId);
   const candidate=activeDb().recipients.find(r=>r.id===input?.recipientId);
   if(!donor||!candidate||!validReviewActions.includes(input?.action))return response(res,400,{error:'Invalid donor, recipient or review action.'});
   if(PUBLIC_DEMO && activeDb().reviews.length>=60)return response(res,429,{error:'Demo session review limit reached. Reset to continue.'});
   const review={id:'REV-'+String(activeDb().reviews.length+1).padStart(4,'0'),time:new Date().toISOString(),donorId:donor.id,recipientId:candidate.id,action:input.action,actor:'Demo Coordinator'};
   activeDb().reviews.unshift(review);
   appendAudit(input.action,`${donor.id} → ${candidate.id}`,'Simulation-only administrative review recorded; no organ allocation decision was made.');
   saveSync();return response(res,201,{review});
 }
 if(req.method==='POST'&&pathname==='/api/reset'){
   resetDb();return response(res,200,{ok:true,message:'Synthetic demonstration data reset.'});
 }
 response(res,404,{error:'API route not found'});
}
function withDemoSession(req,res,handler){
  if(!PUBLIC_DEMO)return handler();
  const now=Date.now();
  for(const [id,state] of demoSessions){if(now-state.lastSeen>DEMO_SESSION_TTL)demoSessions.delete(id);}
  const idMatch=/(?:^|;\s*)OB_DEMO_ID=([a-f0-9-]{36})(?:;|$)/i.exec(req.headers.cookie||'');
  let id=idMatch?.[1];
  let state=id&&demoSessions.get(id);
  if(!state){
    if(demoSessions.size>=MAX_DEMO_SESSIONS)demoSessions.delete(demoSessions.keys().next().value);
    id=randomUUID();
    state={db:createSeed(),lastSeen:now};demoSessions.set(id,state);
    const secure=String(req.headers['x-forwarded-proto']||'').includes('https')?'; Secure':'';
    res.setHeader('Set-Cookie',`OB_DEMO_ID=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600${secure}`);
  }
  state.lastSeen=now;
  return requests.run(state,handler);
}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; object-src 'none'");
  return withDemoSession(req,res,async()=>{try{
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    const pathname=decodeURIComponent(url.pathname);
    if(pathname.startsWith('/api/'))return await handleApi(req,res,pathname,url.searchParams);
    if(req.method!=='GET')return response(res,405,{error:'Method not allowed'});
    const requested=pathname==='/'?'/index.html':pathname;
    const file=path.resolve(PUBLIC,'.'+requested);
    if(!file.startsWith(PUBLIC+path.sep))return response(res,403,{error:'Forbidden'});
    try{
      const stat=await fsp.stat(file);
      if(!stat.isFile())return response(res,404,{error:'Not found'});
      res.writeHead(200,{'Content-Type':contentTypes[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
      fs.createReadStream(file).pipe(res);
    }catch{return response(res,404,{error:'Page not found'});}
  }catch(e){response(res,e.status||500,{error:e.status?e.message:'An internal server error occurred.'});}
  });
});
if(require.main===module){
 server.listen(PORT,HOST,()=>console.log(`OrganBridge ${PUBLIC_DEMO?'public synthetic':'local'} demo listening on http://${HOST}:${PORT}`));
}
module.exports={server};
