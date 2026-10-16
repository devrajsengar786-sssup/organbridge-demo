'use strict';
let hospitalSuggestions=[],hospitalSuggestionIndex=-1;
function getHospitalSuggestions(){
 const query=hospitalSearch.query.trim().toLowerCase();if(query.length<2)return [];
 const records=(hospitalDirectory?.hospitals||[]).filter(h=>!hospitalSearch.ownership||h.ownership===hospitalSearch.ownership);
 const locations=new Map();
 for(const h of records)for(const part of (h.address||'').split(/[,;\n]/)){
  const value=part.trim();if(value.length>=3&&value.length<=70&&/[a-z]/i.test(value)&&value.toLowerCase().includes(query))locations.set(value.toLowerCase(),value);
 }
 const orderedLocations=[...locations.values()].sort((a,b)=>Number(!a.toLowerCase().startsWith(query))-Number(!b.toLowerCase().startsWith(query))||a.length-b.length||a.localeCompare(b)).slice(0,3);
 const hospitals=records.filter(h=>h.name.toLowerCase().includes(query)||h.id.toLowerCase().includes(query)).sort((a,b)=>Number(!a.name.toLowerCase().startsWith(query))-Number(!b.name.toLowerCase().startsWith(query))||a.name.localeCompare(b.name)).slice(0,4);
 const types=[...new Set(records.map(h=>h.type).filter(t=>t&&t.toLowerCase().includes(query)))].slice(0,2);
 return [...orderedLocations.map(value=>({value,label:value,kind:'Location in published address'})),...hospitals.map(h=>({value:h.id,label:h.name,kind:`Hospital · ${h.id}`})),...types.map(value=>({value,label:value,kind:'Facility type'}))];
}
function closeHospitalSuggestions(){
 const input=document.querySelector('#public-hospital-query'),list=document.querySelector('#hospital-suggestions');
 if(list)list.hidden=true;if(input){input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}hospitalSuggestionIndex=-1;
}
function showHospitalSuggestions(){
 const input=document.querySelector('#public-hospital-query'),list=document.querySelector('#hospital-suggestions');if(!input||!list)return;
 hospitalSuggestions=getHospitalSuggestions();hospitalSuggestionIndex=-1;
 if(hospitalSearch.query.trim().length<2){closeHospitalSuggestions();return;}
 list.innerHTML=hospitalSuggestions.length?hospitalSuggestions.map((s,i)=>`<div class="hospital-suggestion" id="hospital-suggestion-${i}" role="option" aria-selected="false" data-hospital-suggestion="${i}"><span>${e(s.label)}</span><small>${e(s.kind)}</small></div>`).join(''):'<div class="suggestion-empty" role="presentation">No suggestions found. Try another hospital or location.</div>';
 list.hidden=false;input.setAttribute('aria-expanded','true');
}
function chooseHospitalSuggestion(index){
 const suggestion=hospitalSuggestions[index];if(!suggestion)return;
 hospitalSearch.query=suggestion.value;hospitalSearch.page=1;render();document.querySelector('#public-hospital-query').focus();closeHospitalSuggestions();
}
document.addEventListener('focusin',ev=>{if(ev.target.id==='public-hospital-query')showHospitalSuggestions();});
document.addEventListener('focusout',ev=>{if(ev.target.id==='public-hospital-query')closeHospitalSuggestions();});
document.addEventListener('pointerdown',ev=>{if(ev.target.closest('[data-hospital-suggestion]'))ev.preventDefault();else if(!ev.target.closest('.search-autocomplete'))closeHospitalSuggestions();});
document.addEventListener('click',ev=>{const option=ev.target.closest('[data-hospital-suggestion]');if(option)chooseHospitalSuggestion(Number(option.dataset.hospitalSuggestion));});
document.addEventListener('keydown',ev=>{
 if(ev.target.id!=='public-hospital-query')return;
 const list=document.querySelector('#hospital-suggestions');
 if(ev.key==='Escape'){closeHospitalSuggestions();return;}
 if(ev.key==='Enter'){if(!list.hidden&&hospitalSuggestionIndex>=0){ev.preventDefault();chooseHospitalSuggestion(hospitalSuggestionIndex);}else closeHospitalSuggestions();return;}
 if(!['ArrowDown','ArrowUp'].includes(ev.key))return;
 ev.preventDefault();if(list.hidden)showHospitalSuggestions();if(!hospitalSuggestions.length)return;
 hospitalSuggestionIndex=hospitalSuggestionIndex<0?(ev.key==='ArrowDown'?0:hospitalSuggestions.length-1):(hospitalSuggestionIndex+(ev.key==='ArrowDown'?1:-1)+hospitalSuggestions.length)%hospitalSuggestions.length;
 list.querySelectorAll('[role="option"]').forEach((option,i)=>option.setAttribute('aria-selected',String(i===hospitalSuggestionIndex)));
 const active=document.querySelector('#hospital-suggestion-'+hospitalSuggestionIndex);ev.target.setAttribute('aria-activedescendant',active.id);active.scrollIntoView({block:'nearest'});
});
