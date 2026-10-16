'use strict';
const dashboardFilters={query:'',city:'',blood:'',kind:''};
let dashboardUpdatedAt=null;
function dashboardRecords(){
 return [...state.donors.map(r=>({...r,kind:'Donor'})),...state.recipients.map(r=>({...r,kind:'Recipient'}))].filter(r=>
  (!dashboardFilters.city||r.city===dashboardFilters.city)&&(!dashboardFilters.blood||r.bloodGroup===dashboardFilters.blood)&&
  (!dashboardFilters.kind||r.kind===dashboardFilters.kind)&&[r.id,r.city,r.hospital,r.bloodGroup].join(' ').toLowerCase().includes(dashboardFilters.query.trim().toLowerCase()));
}
function dashboardBars(rows,key,labels){
 const max=Math.max(1,...labels.map(label=>rows.filter(r=>r[key]===label).length));
 return `<div class="dashboard-bars">${labels.map(label=>{const n=rows.filter(r=>r[key]===label).length;return `<div class="chart-row"><span>${e(label)}</span><div class="chart-track"><div style="width:${n/max*100}%"></div></div><strong>${n}</strong></div>`;}).join('')}</div>`;
}
function dashboard(){
 const rows=dashboardRecords(),donors=rows.filter(r=>r.kind==='Donor'),recipients=rows.filter(r=>r.kind==='Recipient');
 const options=(values,selected)=>values.map(v=>`<option value="${e(v)}" ${v===selected?'selected':''}>${e(v)}</option>`).join('');
 const cityLabels=[...new Set([...state.donors,...state.recipients].map(r=>r.city))].sort();
 const stat=(label,value,description,route)=>`<button class="card stat dashboard-stat" data-route="${route}"><div class="stat-label">${label} ↗</div><div class="stat-value">${value}</div><div class="stat-bottom">${description}</div></button>`;
 return `${pageHeading('SYNTHETIC COORDINATION DASHBOARD','Your coordination overview.','Explore fictional records and administrative activity. No clinical eligibility or allocation is calculated.',`<div class="dashboard-actions"><button class="btn btn-outline" id="dashboard-refresh">↻ Refresh</button><button class="btn btn-primary" id="dashboard-export" ${rows.length?'':'disabled'}>Download CSV ↓</button></div>`)}
 <section class="card card-pad dashboard-filters" aria-label="Dashboard filters">
 <div class="field dashboard-search"><label for="dashboard-query">Search records</label><input id="dashboard-query" type="search" placeholder="Record ID, hospital, city, blood group…" value="${e(dashboardFilters.query)}"></div>
 <div class="field"><label for="dashboard-city">City</label><select id="dashboard-city"><option value="">All cities</option>${options(cityLabels,dashboardFilters.city)}</select></div>
 <div class="field"><label for="dashboard-blood">Blood group</label><select id="dashboard-blood"><option value="">All groups</option>${options(bloods,dashboardFilters.blood)}</select></div>
 <div class="field"><label for="dashboard-kind">Record type</label><select id="dashboard-kind"><option value="">All records</option>${options(['Donor','Recipient'],dashboardFilters.kind)}</select></div>
 <button class="btn btn-outline" id="dashboard-clear">Clear filters</button></section>
 <div class="dashboard-context"><span>${rows.length} of ${state.donors.length+state.recipients.length} records shown · Charts and counts follow filters</span><span>Updated ${e(dashboardUpdatedAt?asDate(dashboardUpdatedAt):'just now')}</span></div>
 <div class="stat-grid">${stat('Donor scenarios',donors.length,'Filtered fictional donors','registry')}${stat('Recipient scenarios',recipients.length,'Filtered fictional waiting list','waiting')}${stat('Open donor cases',donors.filter(r=>r.status==='OPEN').length,'Filtered open simulation cases','registry')}${stat('Review actions',state.reviews.length,'All session actions · not filtered','audit')}</div>
 ${liveRequestsPanel()}
 <div class="dashboard-chart-grid"><section class="card card-pad"><div class="card-header"><div><h2>Records by blood group</h2><p>Combined fictional records · counts, not compatibility</p></div>${badge('FILTERED','green')}</div>${dashboardBars(rows,'bloodGroup',bloods)}</section>
 <section class="card card-pad"><div class="card-header"><div><h2>Records by city</h2><p>Fictional center locations · no transport estimates</p></div>${badge('FILTERED','blue')}</div>${dashboardBars(rows,'city',cityLabels)}${!rows.length?'<p class="muted">No records match these filters.</p>':''}</section></div>
 <section class="card card-pad dashboard-records"><div class="card-header"><div><h2>Record explorer</h2><p>Sorted by record ID · no allocation ranking</p></div><button class="btn btn-soft" data-open-create>＋ Add fictional donor</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Record ID</th><th>Type</th><th>Blood group</th><th>City / fictional center</th><th>Status</th><th>Explore</th></tr></thead><tbody>${rows.sort((a,b)=>a.id.localeCompare(b.id)).map(r=>`<tr><td><b>${e(r.id)}</b></td><td>${badge(r.kind,r.kind==='Donor'?'green':'blue')}</td><td><span class="small-blood">${e(r.bloodGroup)}</span></td><td>${e(r.city)}<div class="tiny muted">${e(r.hospital)}</div></td><td>${e(r.status)}</td><td>${r.kind==='Donor'?`<button class="btn btn-outline btn-sm" data-open-donor="${e(r.id)}">Screen →</button>`:'<button class="btn-text" data-route="waiting">Waiting list →</button>'}</td></tr>`).join('')||'<tr><td colspan="6"><div class="empty-state"><h3>No matching records</h3><p>Try another search or clear the filters.</p></div></td></tr>'}</tbody></table></div></section>
 <section class="card card-pad"><div class="card-header"><div><h2>Recent activity</h2><p>Latest session events · unaffected by record filters</p></div><button class="btn-text" data-route="audit">Full audit trail →</button></div>${state.audit.slice(0,4).map(a=>`<div class="audit-row"><div class="audit-icon">◷</div><div><strong>${e(a.action.replaceAll('_',' '))}</strong><p>${e(a.description)}</p><time>${e(asDate(a.time))} · ${e(a.target)}</time></div></div>`).join('')||'<p class="muted">No session activity yet.</p>'}</section>
 <div class="info-banner" style="margin-top:20px"><span>ⓘ</span><div><b>Educational simulation only</b><br>All records are synthetic. Charts describe this demo dataset, not organ availability, medical compatibility or allocation priority. Session changes are temporary in hosted demo mode.</div></div>`;
}
function exportDashboardCsv(){
 const cell=value=>'"'+String(value??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
 const rows=dashboardRecords().sort((a,b)=>a.id.localeCompare(b.id));
 const table=[['Notice','SYNTHETIC DATA ONLY - Educational prototype, not for clinical use'],['Generated at',new Date().toISOString()],['Search',dashboardFilters.query],['City',dashboardFilters.city||'All'],['Blood group',dashboardFilters.blood||'All'],['Record type',dashboardFilters.kind||'All'],[],['Record ID','Type','Organ','Blood group','City','Fictional hospital','Status'],...rows.map(r=>[r.id,r.kind,r.organ,r.bloodGroup,r.city,r.hospital,r.status])];
 const url=URL.createObjectURL(new Blob(['\uFEFF'+table.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='organbridge-synthetic-records.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(`Exported ${rows.length} fictional records.`);
}
document.addEventListener('input',ev=>{
 if(ev.target.id!=='dashboard-query')return;
 dashboardFilters.query=ev.target.value;const position=ev.target.selectionStart;render();const input=$('#dashboard-query');input.focus();input.setSelectionRange(position,position);
});
document.addEventListener('change',ev=>{
 const key={'dashboard-city':'city','dashboard-blood':'blood','dashboard-kind':'kind'}[ev.target.id];if(!key)return;
 dashboardFilters[key]=ev.target.value;render();$('#'+ev.target.id)?.focus();
});
document.addEventListener('click',async ev=>{
 if(ev.target.closest('#dashboard-export'))exportDashboardCsv();
 if(ev.target.closest('#dashboard-clear')){Object.keys(dashboardFilters).forEach(k=>dashboardFilters[k]='');render();$('#dashboard-query').focus();}
 const button=ev.target.closest('#dashboard-refresh');if(!button)return;
 button.disabled=true;button.textContent='Refreshing…';
 try{await refresh();render();toast('Dashboard updated.');}catch(err){toast(err.message);button.disabled=false;button.textContent='↻ Refresh';}
});
