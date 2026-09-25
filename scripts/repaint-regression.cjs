/* Start `npm run demo`, then run this with an installed Electron binary:
   `electron scripts/repaint-regression.cjs`.
   Set FIELD_REPAINT_IMAGE to keep a screenshot of the settled drag. */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const output = process.env.FIELD_REPAINT_IMAGE;
const push = 16;
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 800, show: false, webPreferences: { backgroundThrottling: false } });
  await win.loadURL(process.env.FIELD_REPAINT_URL || 'http://127.0.0.1:5173/surface-field/');
  await new Promise(resolve => setTimeout(resolve, 1000));
  const controls = await win.webContents.executeJavaScript(`([...document.querySelectorAll('input[type=range]')].map(e => ({label:e.getAttribute('aria-label'),value:e.value,rect:(()=>{let r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})()})))`);
  const slider = controls.find(x => x.label === 'Ripple displacement');
  if (slider) {
    await win.webContents.executeJavaScript(`(()=>{let e=document.querySelector('input[aria-label="Ripple displacement"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'${push}');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  } else throw new Error('Demo slider missing');
  await win.webContents.executeJavaScript(`(()=>{let e=document.querySelector('input[aria-label="Brightness"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'48');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await new Promise(resolve => setTimeout(resolve, 350));
  await win.webContents.executeJavaScript(`(()=>{window.__rafDurations=[];let old=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>old(t=>{let start=performance.now();try{return cb(t)}finally{window.__rafDurations.push(performance.now()-start)}})})()`);
  const handle = await win.webContents.executeJavaScript(`(()=>{let r=document.querySelector('.field-note .move-handle').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
  win.webContents.sendInputEvent({type:'mouseMove',x:handle.x,y:handle.y});
  win.webContents.sendInputEvent({type:'mouseDown',x:handle.x,y:handle.y,button:'left',clickCount:1});
  for (let i=1;i<=10;i++) {
    win.webContents.sendInputEvent({type:'mouseMove',x:handle.x+i*2,y:handle.y+i*2,button:'left'});
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  win.webContents.sendInputEvent({type:'mouseUp',x:handle.x+20,y:handle.y+20,button:'left',clickCount:1});
  const timing = await win.webContents.executeJavaScript(`(()=>{let a=window.__rafDurations.slice().sort((x,y)=>x-y);return{count:a.length,max:a.at(-1)||0,p95:a[Math.floor(a.length*.95)]||0,mean:a.reduce((s,x)=>s+x,0)/Math.max(1,a.length)}})()`);
  await new Promise(resolve => setTimeout(resolve, 4000));
  const final = await win.webContents.executeJavaScript(`({sliders:[...document.querySelectorAll('input[type=range]')].map(e=>({label:e.getAttribute('aria-label'),value:e.value})), canvases:[...document.querySelectorAll('canvas')].map(e=>{let r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})})`);
  if (final.sliders.find(item => item.label === 'Ripple displacement')?.value !== '16' ||
      final.sliders.find(item => item.label === 'Brightness')?.value !== '48') throw new Error('Demo settings did not settle');
  if (output) {
    const image = await win.webContents.capturePage();
    fs.writeFileSync(output, image.toPNG());
  }
  await win.webContents.executeJavaScript(`window.__fieldBefore = document.querySelectorAll('canvas')[3].getContext('2d').getImageData(0,0,document.querySelectorAll('canvas')[3].width,document.querySelectorAll('canvas')[3].height)`);
  await win.webContents.executeJavaScript(`document.documentElement.classList.add('dark')`);
  await new Promise(resolve => setTimeout(resolve, 200));
  await win.webContents.executeJavaScript(`document.documentElement.classList.remove('dark')`);
  await new Promise(resolve => setTimeout(resolve, 400));
  const parity = await win.webContents.executeJavaScript(`(()=>{let a=window.__fieldBefore,b=document.querySelectorAll('canvas')[3].getContext('2d').getImageData(0,0,a.width,a.height),changed=0,max=0,total=0;for(let i=0;i<a.data.length;i++){let d=Math.abs(a.data[i]-b.data[i]);if(d){changed++;total+=d;max=Math.max(max,d)}}return{changed,max,total,pixels:a.width*a.height}})()`);
  console.log(JSON.stringify({parity,timing}));
  if (parity.max > 80 || parity.total > 5000) throw new Error('Incremental dots differ from a clean redraw');
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
