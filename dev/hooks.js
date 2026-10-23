export async function resolve(spec, ctx, next){ if(spec==='@vercel/blob') return {url:new URL('./blob-mock.js',import.meta.url).href, shortCircuit:true}; return next(spec,ctx); }
