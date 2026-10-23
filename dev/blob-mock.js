import fs from 'node:fs'; import path from 'node:path';
const ROOT = '/tmp/claude-0/-home-claude/c2ec2f48-a56f-5724-bd14-5386e009de09/scratchpad/blobs';
fs.mkdirSync(ROOT,{recursive:true});
const META = path.join(ROOT,'meta.json');
const meta = fs.existsSync(META)? JSON.parse(fs.readFileSync(META)) : {};
export async function put(pathname, body, opts){
  const name = opts?.addRandomSuffix ? pathname.replace(/\.jpg$/,'-'+Math.random().toString(36).slice(2,8)+'.jpg') : pathname;
  const file = path.join(ROOT,name.replace(/\//g,'__')); fs.writeFileSync(file, body);
  meta[name]={pathname:name,url:'http://localhost:3000/_blob/'+name.replace(/\//g,'__'),uploadedAt:new Date().toISOString(),size:body.length};
  fs.writeFileSync(META, JSON.stringify(meta)); return meta[name];
}
export async function list({prefix='',limit=1000}={}){ const blobs=Object.values(meta).filter(b=>b.pathname.startsWith(prefix)).slice(0,limit); return {blobs,hasMore:false}; }
