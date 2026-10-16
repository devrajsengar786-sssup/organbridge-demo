'use strict';
const cityCoordinates={
  Bhopal:{lat:23.2599,lng:77.4126},
  Indore:{lat:22.7196,lng:75.8577},
  Gwalior:{lat:26.2183,lng:78.1828},
  Jabalpur:{lat:23.1815,lng:79.9864},
  Ujjain:{lat:23.1765,lng:75.7885},
  Sagar:{lat:23.8388,lng:78.7378}
};
const loc=city=>({...cityCoordinates[city]});
function createSeed(){
 return {
  demo:true,
  donors:[
    {id:'DNR-2048',organ:'Kidney',bloodGroup:'O+',city:'Bhopal',hospital:'Demo Central Transplant Unit',location:loc('Bhopal'),hlaMarkers:['A*02','A*24','B*07','B*35','DRB1*04'],createdAt:'2026-10-16T08:20:00.000Z',status:'OPEN'},
    {id:'DNR-2049',organ:'Kidney',bloodGroup:'A+',city:'Indore',hospital:'Demo Regional Medical Unit',location:loc('Indore'),hlaMarkers:['A*01','A*24','B*07','DRB1*13'],createdAt:'2026-10-16T08:50:00.000Z',status:'OPEN'}
  ],
  recipients:[
    {id:'RCP-1001',organ:'Kidney',bloodGroup:'O+',city:'Bhopal',hospital:'Demo Central Transplant Unit',location:loc('Bhopal'),hlaMarkers:['A*02','A*24','B*08','DRB1*04'],daysWaiting:460,urgencyTag:'Coordinator attention',status:'ACTIVE'},
    {id:'RCP-1002',organ:'Kidney',bloodGroup:'A+',city:'Indore',hospital:'Demo Regional Medical Unit',location:loc('Indore'),hlaMarkers:['A*24','B*07','DRB1*15'],daysWaiting:310,urgencyTag:'Time-sensitive',status:'ACTIVE'},
    {id:'RCP-1003',organ:'Kidney',bloodGroup:'B+',city:'Gwalior',hospital:'Demo North Medical Unit',location:loc('Gwalior'),hlaMarkers:['A*03','B*35','DRB1*04'],daysWaiting:510,urgencyTag:'Standard',status:'ACTIVE'},
    {id:'RCP-1004',organ:'Kidney',bloodGroup:'AB+',city:'Jabalpur',hospital:'Demo East Medical Unit',location:loc('Jabalpur'),hlaMarkers:['A*02','B*07'],daysWaiting:220,urgencyTag:'Standard',status:'ACTIVE'},
    {id:'RCP-1005',organ:'Kidney',bloodGroup:'O+',city:'Ujjain',hospital:'Demo West Medical Unit',location:loc('Ujjain'),hlaMarkers:[],daysWaiting:600,urgencyTag:'Time-sensitive',status:'ACTIVE'},
    {id:'RCP-1006',organ:'Kidney',bloodGroup:'A+',city:'Sagar',hospital:'Demo District Medical Unit',location:loc('Sagar'),hlaMarkers:['A*01','B*13','DRB1*07'],daysWaiting:180,urgencyTag:'Standard',status:'ACTIVE'}
  ],
  reviews:[],
  audit:[{id:'AUD-0001',time:'2026-10-16T08:20:00.000Z',actor:'Demo Coordinator',action:'DATASET_INITIALIZED',target:'SYSTEM',description:'Synthetic donor and waiting-list dataset loaded.'}]
 };
}
module.exports={createSeed,cityCoordinates};
