import {spawn,spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync,mkdirSync,openSync,chmodSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);mkdirSync('.runtime',{recursive:true});
function command(binary,args){const r=spawnSync(binary,args,{cwd:root,stdio:'inherit',env:{...process.env,PATH:`${process.env.HOME}/.local/bin:${process.env.PATH}`}});if(r.status!==0)throw Error(`Failed: ${binary} ${args.join(' ')}`)}
async function available(start){for(let n=start;n<start+100;n++){const free=await new Promise(resolve=>{const s=createServer();s.once('error',()=>resolve(false));s.listen(n,'127.0.0.1',()=>s.close(()=>resolve(true)))});if(free)return n}throw Error('No free localhost port')}
async function healthy(url){try{const r=await fetch(url,{signal:AbortSignal.timeout(2500)});return r.ok}catch{return false}}
if(process.argv.includes('--stop')){if(existsSync('.runtime/web.json')){const d=JSON.parse(readFileSync('.runtime/web.json','utf8'));if(d.pid){try{process.kill(d.pid,'SIGTERM')}catch{}}}command('docker',['compose','stop']);console.log('EGIN stopped; database and uploads are preserved.');process.exit(0)}
if(!existsSync('.env')){writeFileSync('.env',`POSTGRES_DB=egin\nPOSTGRES_USER=egin\nPOSTGRES_PASSWORD=${randomBytes(18).toString('hex')}\nDB_PORT=${await available(55432)}\nAPI_PORT=${await available(8000)}\nWEB_PORT=${await available(3000)}\nSESSION_SECRET=${randomBytes(48).toString('hex')}\nCOOKIE_SECURE=false\n`);chmodSync('.env',0o600)}
const env=Object.fromEntries(readFileSync('.env','utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)]}));
if(!existsSync('apps/web/node_modules/next'))command('npx',['--yes','pnpm@10.32.1','install','--frozen-lockfile']);
const existingDb=spawnSync('docker',['compose','ps','-q','db'],{encoding:'utf8'}).stdout.trim();
if(!existingDb)env.DB_PORT=String(await available(Number(env.DB_PORT)));
if(!await healthy(`http://localhost:${env.API_PORT}/health`))env.API_PORT=String(await available(Number(env.API_PORT)));
let ownWeb=false;if(existsSync('.runtime/web.json')){const d=JSON.parse(readFileSync('.runtime/web.json','utf8'));try{process.kill(d.pid,0);ownWeb=await healthy(`http://localhost:${d.port}/login`)}catch{}}
if(!ownWeb)env.WEB_PORT=String(await available(Number(env.WEB_PORT)));
writeFileSync('.env',Object.entries(env).map(([k,v])=>`${k}=${v}`).join('\n')+'\n');chmodSync('.env',0o600);
writeFileSync('apps/web/.env.local',`API_URL=http://127.0.0.1:${env.API_PORT}\n`);
command(process.execPath,['scripts/copy-map-worker.mjs']);
command('python3',['scripts/download_boundaries.py']);
command('docker',['compose','up','-d',...(process.argv.includes('--rebuild')?['--build']:[])]);
console.log('Waiting for migrations, seed and local model…');
let apiReady=false;for(let i=0;i<120;i++){if(await healthy(`http://localhost:${env.API_PORT}/health`)){apiReady=true;break}await new Promise(r=>setTimeout(r,1000))}
if(!apiReady)throw Error('API startup failed. Inspect: docker compose logs api');
if(!ownWeb && !await healthy(`http://localhost:${env.WEB_PORT}/login`)){const log=openSync('.runtime/web.log','a');const production=process.argv.includes('--production')&&existsSync('apps/web/.next/BUILD_ID');const child=spawn(process.execPath,['node_modules/next/dist/bin/next',production?'start':'dev',...(!production?['--webpack']:[]),'-H','127.0.0.1','-p',env.WEB_PORT],{cwd:resolve(root,'apps/web'),detached:true,stdio:['ignore',log,log],env:{...process.env,API_URL:`http://127.0.0.1:${env.API_PORT}`,NEXT_TELEMETRY_DISABLED:'1',NODE_OPTIONS:'--max-old-space-size=1536'}});child.unref();writeFileSync('.runtime/web.json',JSON.stringify({pid:child.pid,port:env.WEB_PORT,mode:production?'production':'development'}));}
let webReady=false;for(let i=0;i<90;i++){if(await healthy(`http://localhost:${env.WEB_PORT}/login`)){webReady=true;break}await new Promise(r=>setTimeout(r,1000))}
if(!webReady)throw Error('Web startup failed. Inspect .runtime/web.log');
console.log(`EGIN is running\nWeb: http://localhost:${env.WEB_PORT}\nAPI: http://localhost:${env.API_PORT}\nDocs: http://localhost:${env.API_PORT}/docs\nStop: pnpm stop`);
