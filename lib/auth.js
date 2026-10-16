'use strict';
const fs=require('node:fs'),path=require('node:path');
const {randomBytes,scryptSync,timingSafeEqual,createHash}=require('node:crypto');
const file=path.join(__dirname,'../data/auth-accounts.json');
const credentialFile=path.join(__dirname,'../LOGIN-CREDENTIALS.txt');
const cities=['Bhopal','Indore','Gwalior','Jabalpur','Ujjain','Sagar'];
function passwordHash(password,salt){return scryptSync(password,salt,64);}
let accounts;
if(process.env.ORGANBRIDGE_TEST_PASSWORD){
 accounts=['admin',...cities].map(name=>{const salt=randomBytes(16).toString('hex');return {email:name==='admin'?'admin@organbridge.example':name.toLowerCase()+'.staff@organbridge.example',role:name==='admin'?'admin':'staff',city:name==='admin'?null:name,salt,hash:passwordHash(process.env.ORGANBRIDGE_TEST_PASSWORD,salt).toString('hex')};});
}else if(process.env.ORGANBRIDGE_ACCOUNTS_JSON){
 accounts=JSON.parse(process.env.ORGANBRIDGE_ACCOUNTS_JSON);
 if(!Array.isArray(accounts)||!accounts.length||accounts.some(a=>!a||typeof a.email!=='string'||!['admin','staff'].includes(a.role)||a.role==='staff'&&!cities.includes(a.city)||!/^([a-f0-9]{2}){16}$/.test(a.salt)||!/^([a-f0-9]{2}){64}$/.test(a.hash)))throw Error('Invalid ORGANBRIDGE_ACCOUNTS_JSON configuration.');
}else if(fs.existsSync(file)){accounts=JSON.parse(fs.readFileSync(file,'utf8'));}
else{
 const lines=['OrganBridge prototype credentials','Synthetic data only. Keep this file private.','Visitor: enter an email in the Visitor login. Email ownership is not verified.',''];
 accounts=['admin',...cities].map(name=>{const password=randomBytes(15).toString('base64url'),salt=randomBytes(16).toString('hex');const account={email:name==='admin'?'admin@organbridge.example':name.toLowerCase()+'.staff@organbridge.example',role:name==='admin'?'admin':'staff',city:name==='admin'?null:name,salt,hash:passwordHash(password,salt).toString('hex')};lines.push(`${account.role}${account.city?' / '+account.city:''}\nEmail: ${account.email}\nPassword: ${password}\n`);return account;});
 fs.writeFileSync(file,JSON.stringify(accounts,null,2),{mode:0o600});fs.writeFileSync(credentialFile,lines.join('\n'),{mode:0o600});
}
const sessions=new Map(),attempts=new Map();
function current(req){const token=/(?:^|;\s*)OB_AUTH=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];const session=sessions.get(token);if(!session||session.expires<Date.now()){if(token)sessions.delete(token);return null;}return session.user;}
function cookie(req,res,value,maxAge){const secure=req.socket.encrypted||String(req.headers['x-forwarded-proto']||'')==='https';const old=res.getHeader('Set-Cookie')||[];res.setHeader('Set-Cookie',[...(Array.isArray(old)?old:[old]),`OB_AUTH=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure?'; Secure':''}`]);}
function logout(req,res){const token=/(?:^|;\s*)OB_AUTH=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];if(token)sessions.delete(token);cookie(req,res,'',0);}
function login(req,res,input){
 const now=Date.now();for(const [key,value]of attempts)if(value.until<now)attempts.delete(key);for(const [key,value]of sessions)if(value.expires<now)sessions.delete(key);
 const ip=req.socket.remoteAddress||'local',limit=attempts.get(ip)||{count:0,until:now+60000};if(limit.count>=12)return {status:429,error:'Too many login attempts. Try again in a minute.'};limit.count++;attempts.set(ip,limit);
 const email=typeof input?.email==='string'?input.email.trim().toLowerCase():'';
 if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||!['visitor','staff','admin'].includes(input?.role))return {status:400,error:'Choose a role and enter a valid email.'};
 let user;
 if(input.role==='visitor'){user={role:'visitor',email,ownerId:createHash('sha256').update(email).digest('hex'),emailVerified:false};}
 else{
  const account=accounts.find(a=>a.email===email&&a.role===input.role);
  const salt=account?.salt||'invalid-account-salt',password=typeof input.password==='string'?input.password:'';
  if(password.length>256)return {status:401,error:'Email or password is incorrect.'};
  const candidate=passwordHash(password,salt),expected=account?Buffer.from(account.hash,'hex'):Buffer.alloc(64);
  if(!account||!timingSafeEqual(candidate,expected))return {status:401,error:'Email or password is incorrect.'};
  user={role:account.role,email:account.email,city:account.city};
 }
 logout(req,res);if(sessions.size>=500)return {status:503,error:'Session capacity reached. Try again shortly.'};
 const token=randomBytes(32).toString('hex');sessions.set(token,{user,expires:now+3600000});cookie(req,res,token,3600);return {user};
}
module.exports={current,login,logout};
