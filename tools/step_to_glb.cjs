// STEP -> GLB (Y-up, metres) + assembly.json (pivot axes). Usage: node convert.cjs in.step outDir
const fs = require('fs'), path = require('path');
const [,, inFile, outDir] = process.argv;
const txt = fs.readFileSync(inFile, 'latin1');
const bodyNames = [...txt.matchAll(/MANIFOLD_SOLID_BREP\('([^']*)'/g)].map(m => m[1]);
const cat = n =>
  /^Ecran/.test(n) ? 'screen' :
  /^(Vis|Axe)/.test(n) ? 'zinc' :
  /^VESA/.test(n) ? 'black' :
  /^(Bague)/.test(n) ? 'nylon' :
  /^(Patin|Rondelle|Cache|Bouton|Clip|Embout)/.test(n) ? 'graphite' : 'steel';
const MATS = { steel:[0.925,0.92,0.90,0.55,0.15], zinc:[0.62,0.64,0.66,0.35,0.9], black:[0.07,0.07,0.07,0.6,0.1], nylon:[0.86,0.85,0.82,0.75,0], graphite:[0.11,0.11,0.115,0.7,0], screen:[0.09,0.11,0.14,0.25,0.3] };
const matKeys = Object.keys(MATS);
// Z-up mm -> Y-up m
const tp = (x,y,z) => [x*0.001, z*0.001, -y*0.001];
const tn = (x,y,z) => [x, z, -y];
require('occt-import-js')().then(o => {
  const r = o.ReadStepFile(new Uint8Array(fs.readFileSync(inFile)), { linearUnit:'millimeter', linearDeflectionType:'bounding_box_ratio', linearDeflection:0.0005, angularDeflection:0.25 });
  if (!r.success || r.meshes.length !== bodyNames.length) throw new Error('mesh/body count mismatch ' + r.meshes.length + ' vs ' + bodyNames.length);
  const comps = r.root.children[0].children;
  const chunks = []; let off = 0;
  const bufferViews = [], accessors = [], meshes = [], nodes = [];
  const push = (typed, target) => { const b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength); const pad = (4 - b.length % 4) % 4; chunks.push(b, Buffer.alloc(pad)); bufferViews.push({ buffer:0, byteOffset:off, byteLength:b.length, target }); off += b.length + pad; return bufferViews.length - 1; };
  const bodies = {}; let tris = 0;
  const compNodeIdx = [];
  for (const c of comps) {
    const kids = [];
    for (const mi of c.meshes) {
      const m = r.meshes[mi], name = bodyNames[mi];
      const p = m.attributes.position.array, nn = m.attributes.normal.array;
      const P = new Float32Array(p.length), N = new Float32Array(p.length);
      const min=[1e9,1e9,1e9], max=[-1e9,-1e9,-1e9];
      const pts = [];
      for (let i=0;i<p.length;i+=3){ const a=tp(p[i],p[i+1],p[i+2]), b=tn(nn[i],nn[i+1],nn[i+2]); P.set(a,i); N.set(b,i); for(let k=0;k<3;k++){min[k]=Math.min(min[k],a[k]);max[k]=Math.max(max[k],a[k]);} pts.push(a); }
      const nv = p.length/3, idx = nv < 65536 ? Uint16Array.from(m.index.array) : Uint32Array.from(m.index.array);
      tris += idx.length/3;
      const pa = accessors.push({ bufferView:push(P,34962), componentType:5126, count:nv, type:'VEC3', min, max }) - 1;
      const na = accessors.push({ bufferView:push(N,34962), componentType:5126, count:nv, type:'VEC3' }) - 1;
      const ia = accessors.push({ bufferView:push(idx,34963), componentType: nv<65536?5123:5125, count:idx.length, type:'SCALAR' }) - 1;
      const k = cat(name);
      meshes.push({ name, primitives:[{ attributes:{ POSITION:pa, NORMAL:na }, indices:ia, material:matKeys.indexOf(k) }] });
      nodes.push({ name, mesh:meshes.length-1, extras:{ category:k, component:c.name } });
      kids.push(nodes.length-1);
      if (/^Axe/.test(name)) bodies[name] = axisOf(pts);
    }
    nodes.push({ name:c.name, children:kids, extras:{ component:true } });
    compNodeIdx.push(nodes.length-1);
  }
  nodes.push({ name:'Support_ecrans', children:compNodeIdx });
  const materials = matKeys.map(k => { const [r_,g,b,rough,metal]=MATS[k]; return { name:k, pbrMetallicRoughness:{ baseColorFactor:[r_,g,b,1], roughnessFactor:rough, metallicFactor:metal } }; });
  const bin = Buffer.concat(chunks);
  const gltf = { asset:{ version:'2.0', generator:'occt-import-js -> custom', copyright:'Support_ecrans' }, scene:0, scenes:[{ nodes:[nodes.length-1] }], nodes, meshes, materials, accessors, bufferViews, buffers:[{ byteLength:bin.length }] };
  let json = Buffer.from(JSON.stringify(gltf)); json = Buffer.concat([json, Buffer.alloc((4 - json.length%4)%4, 0x20)]);
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546C67,0); header.writeUInt32LE(2,4); header.writeUInt32LE(12+8+json.length+8+bin.length,8);
  const ch = (len,type)=>{const b=Buffer.alloc(8); b.writeUInt32LE(len,0); b.writeUInt32LE(type,4); return b;};
  fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(path.join(outDir,'support_ecrans.glb'), Buffer.concat([header, ch(json.length,0x4E4F534A), json, ch(bin.length,0x004E4942), bin]));
  fs.writeFileSync(path.join(outDir,'axes.json'), JSON.stringify(bodies,null,1));
  console.log('tris',tris,'glb kB',Math.round((bin.length+json.length)/1024));
});
// principal axis of a pin: PCA via power iteration
function axisOf(pts){
  const c=[0,0,0]; pts.forEach(p=>{c[0]+=p[0];c[1]+=p[1];c[2]+=p[2];}); c.forEach((v,i)=>c[i]=v/pts.length);
  const C=[[0,0,0],[0,0,0],[0,0,0]]; pts.forEach(p=>{const d=[p[0]-c[0],p[1]-c[1],p[2]-c[2]]; for(let i=0;i<3;i++)for(let j=0;j<3;j++)C[i][j]+=d[i]*d[j];});
  let v=[0.3,0.9,0.2]; for(let it=0;it<100;it++){const w=[0,1,2].map(i=>C[i][0]*v[0]+C[i][1]*v[1]+C[i][2]*v[2]); const l=Math.hypot(...w); v=w.map(x=>x/l);}
  // snap near-axis-aligned components
  v=v.map(x=>Math.abs(x)<1e-4?0:x); if (v[0]+v[1]+v[2] < 0) v=v.map(x=>-x);
  const len = 2*Math.sqrt(Math.max(...pts.map(p=>{const d=[p[0]-c[0],p[1]-c[1],p[2]-c[2]]; const t=d[0]*v[0]+d[1]*v[1]+d[2]*v[2]; return t*t;})));
  return { p:c.map(x=>+x.toFixed(6)), d:v.map(x=>+x.toFixed(5)), len:+len.toFixed(4) };
}
