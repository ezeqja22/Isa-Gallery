import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { dedup, prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'public/optimized');
const hash=b=>createHash('sha256').update(b).digest('hex').slice(0,20);
async function writeStable(filename,data){try{if(hash(await fs.readFile(filename))===hash(data))return;}catch(error){if(error.code!=='ENOENT')throw error;}await fs.writeFile(filename,data);}
await fs.mkdir(out,{recursive:true});
await MeshoptEncoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const converted=new Map();
const report={models:{},textures:{},notes:['No decimation or quantization. All original transforms and full-detail nodes retained.','High: original painting JPEGs; other textures lossless WebP at original dimensions.','Balanced/low: only non-art textures capped at 2048/1024. Shell textures capped at 256.']};
for(const name of ['hallway','room1','room2']) {
 for(const tier of ['high','balanced','low','shell']) {
  const source=path.join(root,'public/models',name+'.glb');
  const doc=await io.read(source);
  const originalNodes=doc.getRoot().listNodes().map(n=>({name:n.getName(),matrix:n.getMatrix()}));
  if(tier==='shell' && name==='room2') {
   // Keep the actual enclosing architecture and trim while the destination loads.
   const keep=/^(Room2_(Ceiling|EntryWall|Floor|SideWall|WindowWall)|Atelier_(Horizontal_Moulding|LowerPanel|Panel_|Pilaster|Window)|Studio_EntrySurround|Balcony|Exterior terrace|Fanlight|Capital volute|Ceiling inset|Cornice|Pilaster fluting|Window |Panel central|Panel scroll)/;
   for(const n of doc.getRoot().listNodes()) if(n.getMesh() && !keep.test(n.getName())) n.setMesh(null);
   await doc.transform(prune({keepLeaves:false}));
  }
  for(const texture of doc.getRoot().listTextures()) {
   const input=texture.getImage();
   const isArt=/piktura/.test(texture.getName());
   if(isArt) {
    const filename=texture.getName().match(/piktura\d+/)[0]+'.jpeg';
    texture.setURI('../paintings/'+filename);
    continue;
   }
   const limit={high:Infinity,balanced:2048,low:1024,shell:256}[tier];
   const key=hash(input)+'-'+limit;
   if(!converted.has(key)) {
    let pipeline=sharp(input);
    const meta=await pipeline.metadata();
    if(Math.max(meta.width,meta.height)>limit) pipeline=pipeline.resize({width:limit,height:limit,fit:'inside',withoutEnlargement:true});
    let data=await pipeline.webp({lossless:true,effort:6}).toBuffer();
    let mime='image/webp';
    if(limit===Infinity && meta.depth==='uchar' && data.length>=input.byteLength){data=Buffer.from(input);mime=texture.getMimeType();}
    converted.set(key,{data,mime});
    report.textures[key]={name:texture.getName(),before:input.byteLength,after:data.length,limit:Number.isFinite(limit)?limit:'original'};
   }
   const {data,mime}=converted.get(key);
   texture.setImage(data).setMimeType(mime).setURI('texture-'+hash(data)+'.'+(mime==='image/webp'?'webp':mime==='image/jpeg'?'jpg':'png'));
  }
  doc.createExtension(EXTTextureWebP).setRequired(true);
  await doc.transform(dedup({propertyTypes:[PropertyType.ACCESSOR,PropertyType.TEXTURE,PropertyType.MESH]}));
  // QUANTIZE mode without the quantize transform encodes existing float data losslessly.
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
  const jsonDoc=await io.writeJSON(doc);
  for(const buffer of jsonDoc.json.buffers || []) {
   if(!buffer.uri)continue;
   const data=jsonDoc.resources[buffer.uri];
   const filename='geometry-'+hash(data)+'.bin';
   await writeStable(path.join(out,filename),data);buffer.uri=filename;
  }
  for(const image of jsonDoc.json.images || []) {
   // Original art is already served from public/paintings. Never rewrite it.
   if(image.uri.startsWith('../paintings/'))continue;
   await writeStable(path.join(out,image.uri),jsonDoc.resources[image.uri]);
  }
  const filename=name+'-'+tier+'.gltf';
  await writeStable(path.join(out,filename),JSON.stringify(jsonDoc.json));
  const finalNodes=doc.getRoot().listNodes().map(n=>({name:n.getName(),matrix:n.getMatrix()}));
  if(tier!=='shell' && JSON.stringify(originalNodes)!==JSON.stringify(finalNodes))throw new Error('Node/transform preservation failed: '+filename);
  report.models[filename]={nodes:finalNodes.length,meshes:doc.getRoot().listMeshes().length,materials:doc.getRoot().listMaterials().length,geometryBytes:(jsonDoc.json.buffers||[]).filter(b=>b.uri).reduce((s,b)=>s+b.byteLength,0),nodeTransformsPreserved:tier!=='shell'};
  console.log(filename,report.models[filename]);
 }
}
await fs.mkdir(path.join(root,'reports/performance'),{recursive:true});
await fs.writeFile(path.join(root,'reports/performance/optimization.json'),JSON.stringify(report,null,2));
