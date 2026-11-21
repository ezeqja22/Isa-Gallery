// Read-only runtime asset audit. All output stays in the project.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
async function main() {
  const result = { generated: new Date().toISOString(), models: {}, duplicates: {}, production: [] };
  for (const name of ['hallway','room1','room2']) {
    const b = fs.readFileSync(path.join(root, 'public/models', name+'.glb'));
    const jsonLength = b.readUInt32LE(12);
    const g = JSON.parse(b.subarray(20,20+jsonLength));
    const bin = b.subarray(28+jsonLength);
    const images = [];
    for (const i of g.images || []) {
      const v = g.bufferViews[i.bufferView];
      const data = bin.subarray(v.byteOffset || 0, (v.byteOffset || 0)+v.byteLength);
      const meta = await sharp(data).metadata();
      const sha256 = hash(data);
      images.push({ name:i.name, bytes:data.length, sha256, width:meta.width, height:meta.height, depth:meta.depth, channels:meta.channels, estimatedRGBA8WithMips:meta.width*meta.height*4*4/3 });
      (result.duplicates[sha256] ||= []).push(name+'/'+i.name);
    }
    result.models[name] = { bytes:b.length, sha256:hash(b), nodes:g.nodes.length, materials:g.materials.length, primitives:g.meshes.reduce((n,m)=>n+m.primitives.length,0), triangles:g.meshes.reduce((n,m)=>n+m.primitives.reduce((s,p)=>s+g.accessors[p.indices ?? p.attributes.POSITION].count/3,0),0), images };
  }
  for (const name of ['hallway','room1','room2']) {
    const url = `https://isa-gallery-navy.vercel.app/models/${name}.glb`;
    try {
      const r = await fetch(url, {headers:{Range:'bytes=0-31'}, signal:AbortSignal.timeout(30000)});
      const reader=r.body.getReader(); const {value}=await reader.read(); await reader.cancel();
      result.production.push({url,status:r.status,type:r.headers.get('content-type'),length:r.headers.get('content-length'),range:r.headers.get('content-range'),magic:Buffer.from(value).subarray(0,4).toString(),lfsPointer:Buffer.from(value).subarray(0,32).toString().includes('version https')});
    } catch(e) { result.production.push({url,error:e.message}); }
  }
  fs.mkdirSync(path.join(root,'reports/performance/baseline'),{recursive:true});
  fs.writeFileSync(path.join(root,'reports/performance/baseline/assets.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
