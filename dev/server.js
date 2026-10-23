import { register } from 'node:module'; register('./hooks.js', import.meta.url);
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const PUB = path.resolve('public'); const BLOBS='/tmp/claude-0/-home-claude/c2ec2f48-a56f-5724-bd14-5386e009de09/scratchpad/blobs';
const apis = {}; for (const f of ['login','logout','state','upload']) apis[f]=(await import(`../api/${f}.js`)).default;
http.createServer(async (req,res)=>{
  const u=new URL(req.url,'http://x');
  if(u.pathname.startsWith('/api/')){ const h=apis[u.pathname.slice(5)]; if(!h){res.statusCode=404;return res.end();}
    const chunks=[]; for await (const c of req) chunks.push(c); const raw=Buffer.concat(chunks);
    const ct=req.headers['content-type']||''; if(ct.includes('json')) req.body=raw.length?JSON.parse(raw):{}; else if(ct.includes('octet-stream')) req.body=raw;
    try{ await h(req,res);}catch(e){console.error(e);res.statusCode=500;res.end(JSON.stringify({error:String(e)}));} return; }
  if(u.pathname.startsWith('/_blob/')){ const f=path.join(BLOBS,u.pathname.slice(7)); if(fs.existsSync(f)){res.setHeader('Content-Type','image/jpeg');return fs.createReadStream(f).pipe(res);} res.statusCode=404;return res.end(); }
  const f=path.join(PUB,u.pathname==='/'?'index.html':u.pathname); if(fs.existsSync(f)){res.setHeader('Content-Type','text/html');return fs.createReadStream(f).pipe(res);} res.statusCode=404;res.end();
}).listen(3000,()=>console.log('dev on :3000'));
