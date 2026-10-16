'use strict';

// EDUCATIONAL DEMONSTRATION ONLY.
// This is not organ allocation, transplant eligibility, medical advice, or a clinical crossmatch.
const KIDNEY_ABO_SCREEN = Object.freeze({
  O: ['O', 'A', 'B', 'AB'],
  A: ['A', 'AB'],
  B: ['B', 'AB'],
  AB: ['AB']
});
const URGENCY_TAGS = ['Standard', 'Time-sensitive', 'Coordinator attention'];

function cleanAbo(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase().replace(/[+-]$/, '');
  return Object.prototype.hasOwnProperty.call(KIDNEY_ABO_SCREEN, normalized) ? normalized : null;
}
function haversineKm(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) ||
      !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return null;
  const r = 6371;
  const rad = degrees => degrees * Math.PI / 180;
  const phi = rad(b.lat - a.lat);
  const lambda = rad(b.lng - a.lng);
  const h = Math.sin(phi/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(lambda/2)**2;
  return Math.round(2*r*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)));
}
function informationalHla(donor, recipient) {
  if (!Array.isArray(donor.hlaMarkers) || !Array.isArray(recipient.hlaMarkers) ||
      !donor.hlaMarkers.length || !recipient.hlaMarkers.length) {
    return {recorded: false, overlaps: null, note: 'HLA typing incomplete; specialist laboratory review required.'};
  }
  const matches = donor.hlaMarkers.filter(marker=>recipient.hlaMarkers.includes(marker));
  return {recorded:true, overlaps:matches.length,
    note:'Shared example HLA labels are informational only. This is NOT an HLA compatibility result.'};
}
function assess(donor, recipient) {
  const donorABO=cleanAbo(donor.bloodGroup);
  const recipientABO=cleanAbo(recipient.bloodGroup);
  const hla=informationalHla(donor, recipient);
  const distanceKm=haversineKm(donor.location,recipient.location);
  let screening='UNDETERMINED';
  let label='Needs manual data verification';
  const notes=[];
  if (donor.organ!=='Kidney' || recipient.organ!=='Kidney') {
    notes.push('The demonstration implements kidney-only screening.');
  } else if (!donorABO || !recipientABO) {
    notes.push('Missing or unsupported ABO information.');
  } else if (!KIDNEY_ABO_SCREEN[donorABO].includes(recipientABO)) {
    screening='ABO_REVIEW';
    label='Standard ABO rule not met';
    notes.push('The simplified ABO screen does not meet the usual donor-to-recipient blood-group rule. Clinician review is still required; exceptions exist.');
  } else {
    screening='ABO_PRELIMINARY_PASS';
    label='Preliminary ABO screen passed';
    notes.push('Typical ABO pattern passes this educational screening only. No clinical compatibility is established.');
  }
  notes.push('Laboratory crossmatch, antibody assessment, clinical suitability and authorization have NOT been verified.');
  if (!hla.recorded) notes.push('HLA information is incomplete.');
  if (distanceKm!==null) notes.push('Distance shown is approximate straight-line distance, not transit time or organ viability.');
  return {
    donorId: donor.id,
    recipientId: recipient.id,
    screening,
    label,
    donorBloodGroup:donor.bloodGroup,
    recipientBloodGroup:recipient.bloodGroup,
    donorCity:donor.city,
    recipientCity:recipient.city,
    hospital:recipient.hospital,
    organ:recipient.organ,
    urgencyTag:URGENCY_TAGS.includes(recipient.urgencyTag)?recipient.urgencyTag:'Standard',
    daysWaiting:recipient.daysWaiting,
    hla,
    distanceKm,
    crossmatchStatus:'NOT_VERIFIED',
    allocationDecision:'HUMAN_REVIEW_REQUIRED',
    notes
  };
}
function assessAll(donor, recipients) {
  // Display by synthetic record ID, never by an automated allocation rank.
  return recipients.map(r=>assess(donor,r)).sort((a,b)=>a.recipientId.localeCompare(b.recipientId));
}
module.exports={KIDNEY_ABO_SCREEN,cleanAbo,haversineKm,informationalHla,assess,assessAll};
