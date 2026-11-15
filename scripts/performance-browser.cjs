// Uses an existing Playwright installation; no global installs or external outputs.
const fs = require('node:fs');
const path = require('node:path');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'reports/performance',process.env.AUDIT_LABEL || 'baseline');
fs.mkdirSync(output,{recursive:true});
process.env.TEMP=process.env.TMP=path.join(root,'reports/performance/tmp');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/nvm4w/nodejs/node_modules/@playwright/cli/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
   window.__fiberRoots=[];
   window.__REACT_DEVTOOLS_GLOBAL_HOOK__={supportsFiber:true,inject:()=>1,onCommitFiberRoot:(_id,root)=>{if(!window.__fiberRoots.includes(root))window.__fiberRoots.push(root)},onCommitFiberUnmount:()=>{}};
   window.__audit={longTasks:[],draws:0,triangles:0};
   new PerformanceObserver(l=>window.__audit.longTasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});
 });
 const start=Date.now();
 await page.goto(process.env.AUDIT_URL || 'http://localhost:3000',{waitUntil:'domcontentloaded',timeout:60000});
 try {await page.locator('.arrival-card--ready').waitFor({timeout:180000});} catch(e){errors.push(e.message);}
 const readyMs=Date.now()-start;
 await page.evaluate(()=>{
   function find(f){if(!f)return;const o=f.stateNode;const store=o?.object?.__r3f?.root || o?.__r3f?.root;if(store)return store;return find(f.child)||find(f.sibling)}
   for(const r of window.__fiberRoots){const store=find(r.current);if(store){window.__sceneStore=store;break}}
 });
 await page.screenshot({path:path.join(output,'hallway.png')});
 fs.writeFileSync(path.join(output,'page.txt'),await page.locator('body').innerText());
 if(await page.locator('.arrival-card--ready').count()) {
   await page.getByRole('button',{name:'View the gallery',exact:false}).click();
   await page.getByRole('button',{name:'Visit the atelier',exact:false}).waitFor();
   await page.waitForFunction(()=>!document.querySelector('.chapter-next')?.disabled);
   await page.screenshot({path:path.join(output,'room1.png')});
   await page.getByRole('button',{name:'Visit the atelier',exact:false}).click();
   await page.waitForTimeout(2300);
   await page.screenshot({path:path.join(output,'stairs-timing-reference.png')});
   await page.waitForFunction(()=>!document.querySelector('.chapter-next')?.disabled);
   await page.screenshot({path:path.join(output,'room2.png')});
   if(await page.evaluate(()=>!!window.__sceneStore)) {
     for(const [name,position,target] of [
       ['stairs',[11.2,-.7,-4],[14.5,.3,-4]],
       ['arch',[0,-.5,15],[0,1,10]],
       ['art-closeup',[0,-.2,-6],[0,-.2,-9.7]]
     ]){
       await page.evaluate(({position,target})=>{const s=window.__sceneStore.getState();s.camera.position.set(...position);s.camera.lookAt(...target);s.invalidate()}, {position,target});
       await page.waitForTimeout(200);
       await page.screenshot({path:path.join(output,name+'.png')});
     }
   }
 }
 const data=await page.evaluate(()=>{
   const s=window.__sceneStore?.getState();
   return {renderer:s?{render:s.gl.info.render,memory:s.gl.info.memory,programs:s.gl.info.programs.length,dpr:s.gl.getPixelRatio(),gpu:s.gl.getContext().getParameter(s.gl.getContext().RENDERER)}:null,resources:performance.getEntriesByType('resource').map(r=>({url:r.name,bytes:r.transferSize,decoded:r.decodedBodySize,duration:r.duration})),...window.__audit};
 });
 fs.writeFileSync(path.join(output,'browser.json'),JSON.stringify({readyMs,errors,...data},null,2));
 console.log(JSON.stringify({readyMs,errors,output}));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
