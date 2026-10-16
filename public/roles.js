'use strict';
let currentRole='visitor';
let staffCity='Bhopal';
function cityRequests(){return (state.requests||[]).filter(r=>currentRole!=='staff'||r.city===staffCity);}
function cityAppointments(){return (state.appointments||[]).filter(a=>currentRole==='visitor'?a.audience!=='STAFF_ONLY':a.audience==='STAFF_ONLY'&&(currentRole!=='staff'||(a.city===staffCity||a.toCity===staffCity)));}
const roleRoutes={visitor:['directory','requests','appointments','learn'],staff:['dashboard','availability','appointments','requests','registry','waiting','matching','audit'],admin:['operations','appointments','access','audit']};
const roleNames={visitor:'Visitor',staff:'Hospital Staff',admin:'Administrator'};
const directoryFilters={query:'',city:''};
const demoHospitals=[
 ['HSP-01','Demo Central Transplant Unit','Bhopal',['Coordination desk','Laboratory review']],
 ['HSP-02','Demo Regional Medical Unit','Indore',['Coordination desk','Laboratory review']],
 ['HSP-03','Demo North Medical Unit','Gwalior',['Coordination desk']],
 ['HSP-04','Demo East Medical Unit','Jabalpur',['Coordination desk','Laboratory review']],
 ['HSP-05','Demo West Medical Unit','Ujjain',['Coordination desk']],
 ['HSP-06','Demo District Medical Unit','Sagar',['Coordination desk']]
].map(([id,name,city,services])=>({id,name,city,services}));
function syncRoleNavigation(){
 syncLoginControls();
 $('.simulation-pill').textContent=state.route==='directory'?'PUBLIC DIRECTORY':'SYNTHETIC DATA';
 const icons={availability:'♧',appointments:'◷',requests:'◷',directory:'⌕',learn:'ⓘ',dashboard:'◫',registry:'▤',waiting:'♧',matching:'⌘',audit:'◷',operations:'◫',access:'♙'};
 $('#sidebar-nav').innerHTML=roleRoutes[currentRole].map(route=>`<button class="nav-item ${route===state.route?'active':''}" data-route="${route}"><span class="nav-symbol">${icons[route]}</span>${e(titles[route])}</button>`).join('');
 $('.sidebar-user strong').textContent=roleNames[currentRole];
 $('.sidebar-user .user-avatar').textContent={visitor:'VI',staff:'HS',admin:'AD'}[currentRole];
 $('.sidebar-user span').textContent=currentRole==='staff'?staffCity+' · Demo':'Demo perspective';
 $('#crumb').textContent=titles[state.route];
}
function directory(){return hospitalDirectoryView();}
function learn(){return `${pageHeading('VISITOR / LEARN','Understand the coordination process.','A guided introduction using fictional scenarios only.')}<div class="hospital-grid">${[
 ['1. Record information','Hospital staff maintain sample donor and recipient records in the training workspace. Real records require approved privacy and access controls.'],
 ['2. Review preliminary observations','The demo illustrates simplified kidney ABO patterns. This cannot confirm clinical compatibility or eligibility.'],
 ['3. Request specialist review','Authorized clinical teams need complete evaluation and laboratory testing. The demo records simulated follow-up actions only.'],
 ['4. Follow authorized policy','OrganBridge does not offer, reserve, assign or prioritize organs. Real allocation belongs to authorized services and clinical teams.']
 ].map(([title,copy])=>`<section class="card card-pad"><h2>${title}</h2><p>${copy}</p></section>`).join('')}</div>`;}
function operations(){
 const counts=[['Fictional centers',demoHospitals.length],['Donor records',state.donors.length],['Recipient records',state.recipients.length],['Review actions',state.reviews.length]];
 return `${pageHeading('ADMINISTRATOR / OPERATIONS','Monitor the demonstration.','Inspect session activity and sample network coverage.', '<button class="btn btn-outline" id="operations-refresh">↻ Refresh operations</button>')}
 <div class="stat-grid">${counts.map(([title,n])=>`<section class="card stat"><div class="stat-label">${title}</div><div class="stat-value" style="margin-top:16px">${n}</div></section>`).join('')}</div>
 ${liveRequestsPanel()}
 <section class="card card-pad"><div class="card-header"><div><h2>Review activity</h2><p>Administrative event counts · not completed clinical tests</p></div><button class="btn-text" data-route="audit">Inspect audit trail →</button></div>${[['REQUEST_TESTS','Lab review requests'],['FLAG_FOR_COORDINATOR','Coordinator flags'],['MARK_REVIEWED','Demo reviews marked']].map(([action,label])=>`<div class="preview-row"><span>${label}</span><strong>${state.reviews.filter(r=>r.action===action).length}</strong></div>`).join('')}</section>
 <section class="card card-pad" style="margin-top:20px"><div class="card-header"><div><h2>Sample hospital network</h2><p>Record counts in this browser session</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Fictional center</th><th>City</th><th>Donors</th><th>Recipients</th></tr></thead><tbody>${demoHospitals.map(h=>`<tr><td>${e(h.name)}</td><td>${e(h.city)}</td><td>${state.donors.filter(r=>r.hospital===h.name&&r.city===h.city).length}</td><td>${state.recipients.filter(r=>r.hospital===h.name&&r.city===h.city).length}</td></tr>`).join('')}</tbody></table></div><p class="tiny muted">${state.donors.filter(r=>!demoHospitals.some(h=>h.name===r.hospital&&h.city===r.city)).length} donor records belong to other fictional centers.</p></section>`;
}
function roleOverview(){return `${pageHeading('ADMINISTRATOR / ROLE OVERVIEW','Three perspectives. Clear responsibilities.','Inspect the prototype navigation available to each audience.')}<section class="card card-pad"><div class="table-wrap"><table class="data-table"><thead><tr><th>Perspective</th><th>Workspace</th><th>Demo actions</th></tr></thead><tbody><tr><td>Visitor</td><td>Hospital search, learning center</td><td>Search fictional centers and read service examples</td></tr><tr><td>Hospital Staff</td><td>Dashboard, registries, screening, audit</td><td>Add fictional donors and record simulated reviews</td></tr><tr><td>Administrator</td><td>Operations, role overview, audit</td><td>Supervise internal hospital meetings, inspect operations and audit events</td></tr></tbody></table></div></section><div class="alert" style="margin-top:20px"><strong>Prototype account access.</strong> Staff and administrator credentials are checked by the server. Staff accounts have fixed cities. Visitor email ownership is not verified. Use synthetic data only.</div>`;}
document.addEventListener('change',ev=>{
 if(ev.target.id==='hospital-city'){directoryFilters.city=ev.target.value;render();$('#hospital-city').focus();}
});
document.addEventListener('input',ev=>{if(ev.target.id!=='hospital-query')return;directoryFilters.query=ev.target.value;const start=ev.target.selectionStart;render();$('#hospital-query').focus();$('#hospital-query').setSelectionRange(start,start);});
document.addEventListener('click',async ev=>{
 if(ev.target.closest('#hospital-clear')){directoryFilters.query='';directoryFilters.city='';render();}
 const details=ev.target.closest('[data-hospital]');if(details){const h=demoHospitals.find(h=>h.id===details.dataset.hospital);if(!h)return;const overlay=document.createElement('div');overlay.className='modal-overlay';overlay.innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-label="Fictional hospital services"><div class="modal-heading"><h2>${e(h.name)}</h2><button class="close-modal" aria-label="Close">×</button></div><p>${e(h.city)} · Fictional center</p><ul>${h.services.map(s=>`<li>${e(s)} — simulated service</li>`).join('')}</ul><div class="alert">No real appointments, verified providers or organ availability are offered through this demonstration.</div></section>`;overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('.close-modal')){overlay.remove();details.focus();}});document.body.appendChild(overlay);overlay.querySelector('button').focus();}
 const refreshButton=ev.target.closest('#operations-refresh');if(refreshButton){refreshButton.disabled=true;try{await refresh();render();toast('Operations updated.');}catch(err){refreshButton.disabled=false;toast(err.message);}}
});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')document.querySelector('.modal-overlay')?.remove();});
