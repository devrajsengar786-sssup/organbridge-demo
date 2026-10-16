'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {assess,haversineKm,cleanAbo}=require('../lib/matching');
const {createSeed}=require('../data/seed');
const {donors,recipients}=createSeed();
test('normalizes ABO groups and discards invalid values',()=>{
 assert.equal(cleanAbo('o+'),'O');assert.equal(cleanAbo('AB-'),'AB');assert.equal(cleanAbo('invalid'),null);
});
test('ABO screen passes but never claims clinical compatibility',()=>{
 const result=assess(donors[0],recipients[0]);
 assert.equal(result.screening,'ABO_PRELIMINARY_PASS');
 assert.equal(result.crossmatchStatus,'NOT_VERIFIED');
 assert.equal(result.allocationDecision,'HUMAN_REVIEW_REQUIRED');
});
test('typical A donor to O recipient needs ABO review',()=>{
 const result=assess(donors[1],recipients[0]);
 assert.equal(result.screening,'ABO_REVIEW');
 assert.equal(result.allocationDecision,'HUMAN_REVIEW_REQUIRED');
});
test('missing HLA remains unverified and does not create a match',()=>{
 const result=assess(donors[0],recipients[4]);
 assert.equal(result.hla.recorded,false);
 assert.equal(result.hla.overlaps,null);
 assert.equal(result.allocationDecision,'HUMAN_REVIEW_REQUIRED');
});
test('same place is zero straight-line kilometers',()=>{
 assert.equal(haversineKm(donors[0].location,recipients[0].location),0);
});
test('missing blood group never passes',()=>{
 const result=assess({...donors[0],bloodGroup:''},recipients[0]);
 assert.equal(result.screening,'UNDETERMINED');
});
