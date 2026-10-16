'use strict';
const API='/api';
const state={route:'dashboard',donors:[],recipients:[],audit:[],reviews:[],overview:null,donorId:null,matches:null,selectedRecipientId:null,filter:'',showJson:false};
const $=selector=>document.querySelector(selector);
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cities=['Bhopal','Indore','Gwalior','Jabalpur','Ujjain','Sagar'];
const bloods=['O+','O-','A+','A-','B+','B-','AB+','AB-'];
const titles={availability:'Organ availability',appointments:'Appointments',requests:'Organ requests',directory:'Hospital search',learn:'Learning center',operations:'Operations',access:'Role overview',dashboard:'Overview',matching:'Matching workspace',registry:'Donor registry',waiting:'Waiting list',audit:'Audit trail'};
let toastTimeout;
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),3700);}
async function api(url,options){
 const res=await fetch(API+url,{headers:{'Content-Type':'application/json','X-OrganBridge-Request':'1'},...options});
 let data;try{data=await res.json();}catch{throw new Error('Unexpected server response');}
 if(!res.ok)throw new Error(data.error||'Request failed');
 return data;
}
const asDate=iso=>{try{return new Date(iso).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}catch{return iso;}};
function getDonor(){return state.donors.find(d=>d.id===state.donorId)||state.donors[0];}
function badge(label,type='neutral'){return `<span class="badge badge-${type}">${e(label)}</span>`;}
function initialsFor(city){return city?.slice(0,2).toUpperCase()||'OB';}
function pageHeading(eyebrow,title,subtitle,action='') {return `<div class="page-heading"><div><div class="eyebrow">${e(eyebrow)}</div><h1>${e(title)}</h1><p>${e(subtitle)}</p></div>${action}</div>`;}
function indicator(result){
 if(result.screening==='ABO_PRELIMINARY_PASS')return badge('ABO preliminary pass','green');
 if(result.screening==='ABO_REVIEW')return badge('ABO review','amber');
 return badge('Data review','neutral');
}
function loadRoute(route){
 if(!roleRoutes[currentRole].includes(route))return;
 if(!activeUser&&!['directory','learn'].includes(route)){openLogin('visitor');return;}
 state.route=route;
 $('#crumb').textContent=titles[route];
 document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.route===route));
 $('.sidebar').classList.remove('open');
 render();
}
async function refresh(){
 await loadHospitalDirectory();
 if(!activeUser||activeUser.role==='visitor'){
  state.donors=[];state.recipients=[];state.audit=[];state.reviews=[];state.availability=[];state.overview=null;
  if(activeUser){const [rq,ap]=await Promise.all([api('/requests'),api('/appointments')]);state.requests=rq.requests;state.appointments=ap.appointments;}else{state.requests=[];state.appointments=[];}return;
 }
 const [ov,ds,rs,a,rq,av,ap]=await Promise.all([api('/overview'),api('/donors'),api('/recipients'),api('/audit'),api('/requests'),api('/availability'),api('/appointments')]);
 state.availability=av.availability;state.appointments=ap.appointments;
 state.requests=rq.requests;
 dashboardUpdatedAt=new Date().toISOString();state.overview=ov;state.donors=ds.donors;state.recipients=rs.recipients;state.audit=a.audit;state.reviews=a.reviews;
 if(!state.donors.some(d=>d.id===state.donorId))state.donorId=state.donors[0]?.id||null;
}
function sparkline(bars){return `<div class="kpi-spark">${bars.map(h=>`<i style="height:${h}px"></i>`).join('')}</div>`;}
function network(){return `<svg viewBox="0 0 400 170" role="img" aria-label="Illustrative network between fictional hospital nodes">
<defs><pattern id="grid" width="23" height="23" patternUnits="userSpaceOnUse"><path d="M 23 0 L 0 0 0 23" fill="none" stroke="#b9d8d4" stroke-width=".6" opacity=".55"/></pattern></defs>
<rect x="0" y="0" width="400" height="170" fill="url(#grid)"/>
<g stroke="#8fccc3" stroke-width="2" stroke-dasharray="4,5" fill="none"><path d="M93 102 L182 55 L276 98 L336 45"/><path d="M93 102 L276 98"/><path d="M182 55 L236 143 L336 45"/></g>
<g><circle cx="93" cy="102" r="18" fill="#d1f2e9"/><circle cx="93" cy="102" r="8" fill="#139687" stroke="white" stroke-width="3"/><circle cx="182" cy="55" r="18" fill="#d1f2e9"/><circle cx="182" cy="55" r="8" fill="#139687" stroke="white" stroke-width="3"/><circle cx="276" cy="98" r="18" fill="#d1f2e9"/><circle cx="276" cy="98" r="8" fill="#139687" stroke="white" stroke-width="3"/><circle cx="336" cy="45" r="9" fill="#f2bd75" stroke="white" stroke-width="3"/><circle cx="236" cy="143" r="9" fill="#f2bd75" stroke="white" stroke-width="3"/></g>
<g font-size="10" font-family="sans-serif" fill="#4d7880" font-weight="700"><text x="58" y="131">Bhopal</text><text x="157" y="29">Indore</text><text x="256" y="127">Gwalior</text><text x="302" y="22">Jabalpur</text><text x="246" y="159">Ujjain</text></g></svg>`;}
function matching(){
 const d=getDonor();
 const hasResults=!!state.matches;
 return `${pageHeading('STEP 01 / COORDINATION','Matching workspace','Select a fictional donor record to view a transparent, preliminary kidney screening.',`<button class="btn btn-outline" data-open-create>＋ Create demo donor</button>`)}
 <div class="steps"><div class="step active"><span>1</span> Select donor</div><div class="step-separator"></div><div class="step ${hasResults?'active':''}"><span>2</span> Run screening</div><div class="step-separator"></div><div class="step ${state.selectedRecipientId?'active':''}"><span>3</span> Review findings</div></div>
 <div class="split"><section class="card card-pad"><div class="card-header"><div><h2>Donor scenario</h2><p>Only synthetic information is allowed</p></div>${badge('KIDNEY DEMO','blue')}</div>
 <div class="form-grid"><div class="field form-span"><label for="donor-choice">Select a donor record</label><select id="donor-choice">${state.donors.map(a=>`<option value="${e(a.id)}" ${a.id===state.donorId?'selected':''}>${e(a.id)} — ${e(a.city)} (${e(a.bloodGroup)})</option>`).join('')}</select></div>
 <div class="field"><label>Organ type</label><input value="Kidney (demo only)" readonly></div><div class="field"><label>Donor blood group</label><input value="${e(d.bloodGroup)}" readonly></div><div class="field"><label>Origin city</label><input value="${e(d.city)}" readonly></div><div class="field"><label>Hospital label</label><input value="${e(d.hospital)}" readonly></div><div class="form-span"><div class="alert"><strong>Important:</strong> No compatibility score or final organ allocation is generated. This demo applies a simplified ABO pattern check, not a validated transplant matching model.</div></div><div class="form-span"><button class="btn btn-primary" id="run-screen" style="width:100%">⌘ &nbsp; Run preliminary screening <span class="arrow">→</span></button></div></div></section>
 <section class="card matching-preview"><div class="preview-icon">⌘</div><div class="preview-title">Screening overview</div><p class="preview-copy">OrganBridge organizes preliminary observations so a clinician can see which details are available and which tests remain outstanding.</p><div class="preview-row"><span>Active fictional candidates</span><strong>${state.recipients.length}</strong></div><div class="preview-row"><span>ABO status</span><strong>${hasResults?state.matches.results.filter(r=>r.screening==='ABO_PRELIMINARY_PASS').length+' preliminary passes':'Not yet checked'}</strong></div><div class="preview-row"><span>Laboratory crossmatch</span>${badge('NOT VERIFIED','amber')}</div><div class="preview-row"><span>Allocation authority</span><strong>Clinical team only</strong></div><p class="tiny muted">This is a training simulation. The results must never be used for actual patient care.</p></section></div>
 ${hasResults?resultsSection():`<section class="card empty-state" style="margin-top:21px"><div class="empty-icon">⌘</div><h3>Your screening results will appear here</h3><p>Use the demo button above to generate an auditable preliminary review with clear explanations.</p></section>`}`;
}
function resultsSection(){
 const results=state.matches.results;
 const pass=results.filter(r=>r.screening==='ABO_PRELIMINARY_PASS').length;
 return `<section class="results-head"><div><h2>Preliminary screening results</h2><p>${results.length} synthetic candidates checked · ${pass} standard ABO pattern pass${pass===1?'':'es'} · zero clinical matches confirmed</p></div>${badge('REVIEW REQUIRED','amber')}</section>
 <div class="alert"><strong>Not an allocation ranking.</strong> Candidates are displayed in record ID order. ABO exceptions, HLA compatibility, antibody results, crossmatch, organ viability, clinical urgency and official allocation policy require specialist review.</div>
 <section class="card table-wrap"><table class="data-table"><thead><tr><th>Candidate</th><th>Blood group</th><th>Location</th><th>Coordination tag</th><th>Preliminary finding</th><th>Action</th></tr></thead><tbody>
 ${results.map(r=>`<tr><td><b>${e(r.recipientId)}</b><div class="tiny muted">Kidney · demo</div></td><td><span class="small-blood">${e(r.recipientBloodGroup)}</span></td><td>${e(r.recipientCity)}<div class="tiny muted">${r.distanceKm===null?'Distance unavailable':r.distanceKm+' km air distance'}</div></td><td>${badge(r.urgencyTag,r.urgencyTag==='Coordinator attention'?'amber':'neutral')}</td><td>${indicator(r)}</td><td><button class="btn btn-outline btn-sm" data-review="${e(r.recipientId)}">View checks →</button></td></tr>`).join('')}</tbody></table></section>`;
}
function registry(){
 return `${pageHeading('DATA MANAGEMENT','Donor registry','Fictional records for testing the workflow. No live medical registry connection.',`<button class="btn btn-primary" data-open-create>＋ Add demo donor</button>`)}<section class="card card-pad"><div class="card-header"><div><h2>Current donor scenarios</h2><p>Created exclusively for simulation</p></div>${badge(`${state.donors.length} records`,'green')}</div><div class="table-wrap"><table class="data-table"><thead><tr><th>Donor ID</th><th>Organ</th><th>Blood group</th><th>Hospital</th><th>Location</th><th>Status</th><th></th></tr></thead><tbody>${state.donors.map(d=>`<tr><td><b>${e(d.id)}</b></td><td>${e(d.organ)}</td><td><span class="small-blood">${e(d.bloodGroup)}</span></td><td>${e(d.hospital)}</td><td>${e(d.city)}</td><td>${badge('Demo open','green')}</td><td><button class="btn btn-outline btn-sm" data-open-donor="${e(d.id)}">Screen →</button></td></tr>`).join('')}</tbody></table></div></section><div class="info-banner" style="margin-top:18px"><span>ⓘ</span><div><b>Privacy note</b><br>This starter app contains no patient names, phone numbers, hospital login credentials, or real donor information. Do not upload or enter protected health data.</div></div>`;
}
function waiting(){
 const keyword=state.filter.toLowerCase();
 const rows=state.recipients.filter(r=>(r.id+' '+r.city+' '+r.hospital+' '+r.bloodGroup).toLowerCase().includes(keyword));
 return `${pageHeading('DATA MANAGEMENT','Waiting list','A fictional sample roster for testing preliminary coordination checks.')}
 <section class="card card-pad"><div class="card-header"><div><h2>Recipient demonstration records</h2><p>Urgency tags are simulated and provided as labels, not calculated by AI</p></div>${badge(`${state.recipients.length} fictional records`,'green')}</div><div class="field" style="margin-bottom:17px;max-width:380px"><label for="wait-search">Find a fictional record</label><input id="wait-search" placeholder="Search ID, blood group, or city…" value="${e(state.filter)}"></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Candidate</th><th>Organ</th><th>Blood group</th><th>City / demo center</th><th>Days waiting</th><th>Coordination tag</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${e(r.id)}</b></td><td>${e(r.organ)}</td><td><span class="small-blood">${e(r.bloodGroup)}</span></td><td>${e(r.city)}<div class="tiny muted">${e(r.hospital)}</div></td><td>${e(r.daysWaiting)}</td><td>${badge(r.urgencyTag,r.urgencyTag==='Coordinator attention'?'amber':'neutral')}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">No records found.</td></tr>'}</tbody></table></div></section>`;
}
function audit(){
 return `${pageHeading('ACCOUNTABILITY','Audit trail','A chronological log of demo activities and administrative review actions.',currentRole==='admin'?`<button class="btn btn-outline" data-reset>↺ Reset demonstration</button>`:'')}
 <div class="split"><section class="card card-pad"><div class="card-header"><div><h2>Recorded actions</h2><p>Visible and traceable simulated workflow changes</p></div>${badge(`${state.audit.length} events`,'blue')}</div>
 ${state.audit.map(a=>`<div class="audit-row"><div class="audit-icon">◷</div><div><strong>${e(a.action.replaceAll('_',' '))}</strong><p>${e(a.description)}</p><div class="tiny muted">Target: ${e(a.target)} · ${e(a.actor)}</div><time>${e(asDate(a.time))}</time></div></div>`).join('')}</section>
 <aside class="card card-pad"><div class="card-header"><h2>Transparency safeguards</h2></div><ul class="checks"><li><span class="check-icon">✓</span><div><strong>Explainable screening</strong><br>Every preliminary result has interpretable checks and warnings.</div></li><li><span class="check-icon">✓</span><div><strong>No allocation action</strong><br>Users cannot approve or assign an organ through this demo.</div></li><li><span class="check-icon">✓</span><div><strong>Synthetic session</strong><br>Hosted demo changes are temporary and isolated by browser session.</div></li><li><span class="check-icon warn">!</span><div><strong>Not production secure</strong><br>Real hospital integration requires authentication, encryption, access controls and legal approval.</div></li></ul></aside></div>`;
}
function render(){
 const content={availability:staffAvailability,appointments:demoAppointments,requests:organRequests,dashboard,matching,registry,waiting,audit,directory,learn,operations,access:roleOverview};
 syncRoleNavigation();
 $('#view').innerHTML=content[state.route]();
}
async function runScreen(){
 const btn=$('#run-screen');if(btn){btn.disabled=true;btn.textContent='Running educational checks…';}
 try{state.matches=await api('/matches?donorId='+encodeURIComponent(state.donorId));state.selectedRecipientId=null;render();toast('Preliminary screening complete. Clinical compatibility remains unverified.');}
 catch(err){toast(err.message);if(btn){btn.disabled=false;btn.textContent='Run preliminary screening';}}
}
async function openDonor(id){state.donorId=id;state.matches=null;state.selectedRecipientId=null;loadRoute('matching');await runScreen();}
function createModal(){
 const existing=$('.modal-overlay');if(existing)existing.remove();
 const overlay=document.createElement('div');overlay.className='modal-overlay';overlay.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="Add demo donor"><div class="modal-heading"><h2>Add a fictional donor</h2><button class="close-modal" type="button" data-close-modal aria-label="Close">×</button></div><p class="tiny muted" style="margin-top:-10px;margin-bottom:21px">This is a synthetic scenario. Do not enter actual donor, patient or medical information.</p><form id="donor-form"><div class="form-grid"><div class="field"><label for="new-blood">Example blood group</label><select id="new-blood" required>${bloods.map(b=>`<option value="${b}">${b}</option>`).join('')}</select></div><div class="field"><label for="new-city">Example city</label><select id="new-city" required>${cities.map(c=>`<option value="${c}">${c}</option>`).join('')}</select></div><div class="field form-span"><label for="new-hospital">Fictional hospital label</label><input id="new-hospital" required minlength="3" maxlength="65" value="Demo Training Hospital" placeholder="Demo Training Hospital"></div><div class="field form-span"><label for="new-hla">Example HLA labels (optional)</label><input id="new-hla" placeholder="A*02, B*07, DRB1*04"><small>Only sample labels. These are not laboratory test results.</small></div></div><div class="modal-footer"><button class="btn btn-outline" type="button" data-close-modal>Cancel</button><button class="btn btn-primary" type="submit">Create sample record</button></div></form></div>`;
 overlay.addEventListener('click',ev=>{if(ev.target===overlay||ev.target.closest('[data-close-modal]'))overlay.remove();});
 overlay.querySelector('form').addEventListener('submit',async ev=>{
   ev.preventDefault();const bloodGroup=$('#new-blood').value,city=$('#new-city').value,hospital=$('#new-hospital').value.trim(),raw=$('#new-hla').value.trim();
   const hlaMarkers=raw?raw.split(',').map(x=>x.trim()).filter(Boolean):[];
   try{const data=await api('/donors',{method:'POST',body:JSON.stringify({bloodGroup,city,hospital,hlaMarkers})});overlay.remove();await refresh();toast('Fictional donor created: '+data.donor.id);state.donorId=data.donor.id;state.matches=null;loadRoute('registry');}
   catch(err){toast(err.message);}
 });
 document.body.appendChild(overlay);
}
function reviewModal(id){
 const r=state.matches?.results.find(x=>x.recipientId===id);if(!r)return;
 const old=$('.modal-overlay');if(old)old.remove();
 state.selectedRecipientId=id;
 const overlay=document.createElement('div');overlay.className='modal-overlay';
 const hlaText=r.hla.recorded?`${r.hla.overlaps} shared example labels (not diagnostic)`:'Typing not available';
 overlay.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="Screening explanation"><div class="modal-heading"><h2>Candidate ${e(r.recipientId)}</h2><button class="close-modal" data-close-modal aria-label="Close">×</button></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:15px">${indicator(r)} ${badge('LAB CROSSMATCH PENDING','amber')}</div><div class="details-grid"><div class="detail-tile"><span>Blood groups · donor → recipient</span><strong>${e(r.donorBloodGroup)} → ${e(r.recipientBloodGroup)}</strong></div><div class="detail-tile"><span>Air distance estimate</span><strong>${r.distanceKm===null?'Unknown':r.distanceKm+' km'}</strong></div><div class="detail-tile"><span>HLA labels</span><strong>${e(hlaText)}</strong></div><div class="detail-tile"><span>Queue tag (input)</span><strong>${e(r.urgencyTag)}</strong></div></div><h3 style="font-size:14px;margin:22px 0 6px">Explainable screening checks</h3><ul class="checks">${r.notes.map((note,i)=>`<li><span class="check-icon ${i===0?'':'warn'}">${i===0?'✓':'!'}</span><span>${e(note)}</span></li>`).join('')}</ul><div class="alert"><strong>No clinical compatibility decision.</strong> This tool must not determine a transplant offer or priority. An authorized clinical team must follow official rules and complete medical evaluation.</div><div class="review-actions"><button class="btn btn-primary btn-sm" data-review-action="REQUEST_TESTS">Request lab review</button><button class="btn btn-outline btn-sm" data-review-action="FLAG_FOR_COORDINATOR">Flag for coordinator</button><button class="btn btn-outline btn-sm" data-review-action="MARK_REVIEWED">Mark demo reviewed</button></div><button class="btn-text" style="margin-top:17px" data-json-view>View explanation JSON →</button><div id="json-display" style="display:none"><pre class="code-block">${e(JSON.stringify(r,null,2))}</pre></div></div>`;
 overlay.addEventListener('click',async ev=>{
   if(ev.target===overlay||ev.target.closest('[data-close-modal]')){overlay.remove();return;}
   if(ev.target.closest('[data-json-view]')){const el=overlay.querySelector('#json-display');el.style.display=el.style.display==='none'?'block':'none';return;}
   const btn=ev.target.closest('[data-review-action]');
   if(btn){btn.disabled=true;try{await api('/reviews',{method:'POST',body:JSON.stringify({donorId:r.donorId,recipientId:r.recipientId,action:btn.dataset.reviewAction})});overlay.remove();await refresh();render();toast('Administrative simulation action recorded in audit trail.');}catch(err){btn.disabled=false;toast(err.message);}}
 });
 document.body.appendChild(overlay);
}
function wireEvents(){
 document.addEventListener('click',async ev=>{
   const nav=ev.target.closest('[data-route]');if(nav){loadRoute(nav.dataset.route);return;}
   if(ev.target.closest('#mobile-menu')){$('.sidebar').classList.toggle('open');return;}
   if(ev.target.closest('[data-open-create]')){createModal();return;}
   const donor=ev.target.closest('[data-open-donor]');if(donor){await openDonor(donor.dataset.openDonor);return;}
   if(ev.target.closest('#run-screen')){await runScreen();return;}
   const review=ev.target.closest('[data-review]');if(review){reviewModal(review.dataset.review);return;}
   if(ev.target.closest('[data-reset]')){
     if(!window.confirm('Reset all synthetic demonstration data and audit actions?'))return;
     try{await api('/reset',{method:'POST',body:'{}'});state.matches=null;state.selectedRecipientId=null;await refresh();render();toast('Demo records have been restored.');}catch(err){toast(err.message);}
   }
 });
 document.addEventListener('change',ev=>{
   if(ev.target.matches('#donor-choice')){state.donorId=ev.target.value;state.matches=null;state.selectedRecipientId=null;render();}
 });
 document.addEventListener('input',ev=>{
   if(ev.target.matches('#wait-search')){state.filter=ev.target.value;const start=ev.target.selectionStart;render();const input=$('#wait-search');input?.focus();input?.setSelectionRange(start,start);}
 });
}
async function init(){wireEvents();try{await restoreLogin();state.route=roleRoutes[currentRole][0];await refresh();render();}catch(err){
 $('#view').innerHTML=`<div class="card card-pad empty-state"><h3>Connection error</h3><p>Unable to reach the local API: ${e(err.message)}. Start the server with <code>npm start</code> and refresh the page.</p></div>`;
 }}
init();
