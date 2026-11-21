import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const checks=[];
for(const room of ['hallway','room1','room2']){
 const before=await io.read(path.join(root,'public/models',room+'.glb'));
 const after=await io.read(path.join(root,'public/optimized',room+'-high.gltf'));
 const nodes=new Map(after.getRoot().listNodes().map(n=>[n.getName(),n]));
 let primitives=0,triangles=0;
 for(const node of before.getRoot().listNodes()){
  const next=nodes.get(node.getName());assert(next,`Missing ${node.getName()}`);
  assert.deepEqual(next.getMatrix(),node.getMatrix());
  const a=node.getMesh()?.listPrimitives()||[],b=next.getMesh()?.listPrimitives()||[];
  assert.equal(a.length,b.length);
  for(let i=0;i<a.length;i++){
   const ia=a[i].getIndices()?.getArray(),ib=b[i].getIndices()?.getArray();
   assert.equal(ia?.length,ib?.length);
   // Meshopt may cyclically rotate a triangle's three indices; winding is unchanged.
   if(ia)for(let t=0;t<ia.length;t+=3){let same=false;for(let r=0;r<3;r++)if([0,1,2].every(k=>ia[t+k]===ib[t+(k+r)%3]))same=true;assert(same,`Changed triangle ${node.getName()}/${t/3}`);}
   for(const semantic of a[i].listSemantics())assert.deepEqual(a[i].getAttribute(semantic).getArray(),b[i].getAttribute(semantic).getArray(),`${node.getName()}/${semantic}`);
   const ma=a[i].getMaterial(),mb=b[i].getMaterial();
   for(const method of ['getBaseColorFactor','getMetallicFactor','getRoughnessFactor','getNormalScale','getAlphaMode','getAlphaCutoff','getDoubleSided','getEmissiveFactor'])assert.deepEqual(ma?.[method](),mb?.[method]());
   primitives++;triangles+=(a[i].getIndices()?.getCount()||a[i].getAttribute('POSITION').getCount())/3;
  }
 }
 checks.push({room,nodes:nodes.size,primitives,triangles,exactGeometryTransformsAndMaterialFactors:true});
}
await fs.writeFile(path.join(root,'reports/performance/geometry-verification.json'),JSON.stringify(checks,null,2));
console.log(checks);
