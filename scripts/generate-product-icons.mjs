/**
 * Signal & Friction product imagery V2.
 * Deterministic 512x512 PNGs for all 13 Stripe product identities.
 * No fonts, prices, mutable commercial data, remote assets, or headless browser.
 * Output: public/product-icons-v2/
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const W = 512, H = 512;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../public/product-icons-v2');
fs.mkdirSync(OUT_DIR, { recursive: true });

const C = {
  bg:[10,9,8,255], panel:[16,14,12,255], gold:[212,168,83,255],
  ivory:[245,240,235,255], muted:[122,111,101,255],
  grid:[212,168,83,18], faint:[212,168,83,40],
};

const PRODUCTS = [
  ['dfy-beta-diagnostic','dfy','diagnostic'], ['dfy-intervention','dfy','intervention'],
  ['dfy-monitoring','dfy','monitoring'], ['dfy-expansion','dfy','expansion'],
  ['dfy-autonomy-kit','dfy','autonomy'], ['dwy-beta-diagnostic','dwy','diagnostic'],
  ['dwy-intervention','dwy','intervention'], ['dwy-monitoring','dwy','monitoring'],
  ['dwy-expansion','dwy','expansion'], ['dwy-autonomy-kit','dwy','autonomy'],
  ['certified-practitioner','certified','practitioner'], ['certified-agency','certified','agency'],
  ['certified-renewal','certified','renewal'],
];

function canvas(){
  const b=Buffer.alloc(W*H*4);
  for(let i=0;i<W*H;i++){b[i*4]=C.bg[0];b[i*4+1]=C.bg[1];b[i*4+2]=C.bg[2];b[i*4+3]=255;}
  return b;
}
function px(b,x,y,c){x=Math.round(x);y=Math.round(y);if(x<0||x>=W||y<0||y>=H)return;const i=(y*W+x)*4,a=(c[3]??255)/255,q=1-a;b[i]=Math.round(c[0]*a+b[i]*q);b[i+1]=Math.round(c[1]*a+b[i+1]*q);b[i+2]=Math.round(c[2]*a+b[i+2]*q);b[i+3]=255;}
function rect(b,x,y,w,h,c){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)px(b,xx,yy,c);}
function disc(b,cx,cy,r,c){const r2=r*r;for(let y=Math.floor(cy-r);y<=Math.ceil(cy+r);y++)for(let x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++){const dx=x-cx,dy=y-cy;if(dx*dx+dy*dy<=r2)px(b,x,y,c);}}
function line(b,x0,y0,x1,y1,t,c){const dx=x1-x0,dy=y1-y0,n=Math.max(Math.abs(dx),Math.abs(dy));if(!n){disc(b,x0,y0,t/2,c);return;}for(let s=0;s<=n;s++){const q=s/n;disc(b,x0+dx*q,y0+dy*q,t/2,c);}}
function poly(b,pts,c){const min=Math.floor(Math.min(...pts.map(p=>p[1]))),max=Math.ceil(Math.max(...pts.map(p=>p[1])));for(let y=min;y<=max;y++){const xs=[];for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if((yi>y)!=(yj>y))xs.push(xi+(y-yi)*(xj-xi)/(yj-yi));}xs.sort((a,z)=>a-z);for(let i=0;i<xs.length;i+=2)for(let x=Math.ceil(xs[i]);x<=Math.floor(xs[i+1]??xs[i]);x++)px(b,x,y,c);}}
function ring(b,cx,cy,r,t,c){const ro=r+t/2,ri=Math.max(0,r-t/2),a=ro*ro,z=ri*ri;for(let y=Math.floor(cy-ro);y<=Math.ceil(cy+ro);y++)for(let x=Math.floor(cx-ro);x<=Math.ceil(cx+ro);x++){const d=(x-cx)**2+(y-cy)**2;if(d<=a&&d>=z)px(b,x,y,c);}}
function outline(b,pts,t,c){for(let i=0;i<pts.length;i++){const a=pts[i],z=pts[(i+1)%pts.length];line(b,a[0],a[1],z[0],z[1],t,c);}}
function hex(cx,cy,r){return Array.from({length:6},(_,i)=>{const a=Math.PI/3*i-Math.PI/2;return[cx+Math.cos(a)*r,cy+Math.sin(a)*r];});}
function diamond(cx,cy,r){return[[cx,cy-r],[cx+r,cy],[cx,cy+r],[cx-r,cy]];}

function frame(b,family){
  rect(b,36,36,440,440,C.panel);
  for(let p=68;p<476;p+=64){line(b,p,52,p,460,1,C.grid);line(b,52,p,460,p,1,C.grid);}
  const a=C.faint;
  [[52,52,108,52],[52,52,52,108],[460,52,404,52],[460,52,460,108],[52,460,108,460],[52,460,52,404],[460,460,404,460],[460,460,460,404]].forEach(v=>line(b,...v,2,a));
  if(family==='dfy')rect(b,414,414,22,22,C.gold);
  else if(family==='dwy')outline(b,[[414,414],[436,414],[436,436],[414,436]],3,C.gold);
  else{ring(b,425,425,14,2,C.gold);ring(b,425,425,8,1,C.faint);}
}
function diagnostic(b,f){const solid=f==='dfy',d=diamond(256,246,92);if(solid){poly(b,d,[212,168,83,52]);outline(b,d,5,C.gold);}else{outline(b,d,4,C.gold);outline(b,diamond(256,246,54),2,C.faint);}line(b,150,246,218,246,2,C.muted);line(b,294,246,362,246,2,C.muted);line(b,256,140,256,208,2,C.muted);line(b,256,284,256,352,2,C.muted);disc(b,256,246,solid?14:9,solid?C.ivory:C.gold);if(!solid)disc(b,256,246,4,C.bg);}
function intervention(b,f){const solid=f==='dfy',sets=[[[154,176],[250,230],[218,246],[154,216]],[[358,276],[262,230],[294,214],[358,236]],[[154,316],[250,262],[218,246],[154,276]],[[358,176],[262,262],[294,278],[358,216]]];if(solid){poly(b,sets[0],C.gold);poly(b,sets[1],C.gold);poly(b,sets[2],[245,240,235,220]);poly(b,sets[3],[245,240,235,220]);}else sets.forEach(p=>outline(b,p,4,C.gold));line(b,240,246,272,246,3,C.bg);disc(b,256,246,6,C.ivory);}
function monitoring(b,f){const solid=f==='dfy';ring(b,256,246,92,solid?7:4,C.gold);ring(b,256,246,58,2,C.faint);disc(b,256,246,solid?9:5,C.ivory);const p=[[154,260],[194,260],[210,228],[230,286],[252,202],[276,270],[296,242],[318,260],[358,260]];for(let i=0;i<p.length-1;i++)line(b,...p[i],...p[i+1],solid?5:3,C.gold);}
function expansion(b,f){const solid=f==='dfy',n=[[256,246],[174,174],[338,174],[174,318],[338,318]];for(let i=1;i<n.length;i++)line(b,256,246,n[i][0],n[i][1],solid?5:3,C.gold);n.forEach(([x,y],i)=>{const r=i===0?16:12;if(solid)disc(b,x,y,r,i===0?C.ivory:C.gold);else{ring(b,x,y,r,3,C.gold);if(i===0)disc(b,x,y,4,C.ivory);}});[[150,174,164,174],[348,174,362,174],[150,318,164,318],[348,318,362,318]].forEach(v=>line(b,...v,2,C.muted));}
function autonomy(b,f){const solid=f==='dfy',h=hex(256,246,94);if(solid){poly(b,h,[212,168,83,42]);outline(b,h,6,C.gold);}else{outline(b,h,4,C.gold);outline(b,hex(256,246,64),2,C.faint);}ring(b,256,246,52,solid?5:3,C.ivory);poly(b,[[302,201],[324,206],[310,222]],solid?C.gold:C.ivory);disc(b,256,246,solid?11:6,C.gold);}
function certified(b,k){ring(b,256,246,100,5,C.gold);ring(b,256,246,78,2,C.faint);if(k==='practitioner'){outline(b,diamond(256,230,44),4,C.ivory);disc(b,256,230,8,C.gold);line(b,236,292,256,312,4,C.gold);line(b,256,312,276,292,4,C.gold);}else if(k==='agency'){const n=[[256,206],[218,264],[294,264]];n.forEach(([x,y])=>{ring(b,x,y,18,4,C.ivory);disc(b,x,y,6,C.gold);});line(b,256,224,226,250,3,C.gold);line(b,256,224,286,250,3,C.gold);line(b,236,264,276,264,3,C.gold);}else{ring(b,256,246,48,5,C.ivory);line(b,220,218,235,202,4,C.gold);line(b,235,202,254,197,4,C.gold);line(b,292,274,277,290,4,C.gold);line(b,277,290,258,295,4,C.gold);poly(b,[[254,190],[273,198],[257,211]],C.gold);poly(b,[[258,302],[239,294],[255,281]],C.gold);}}
function draw(f,k){const b=canvas();frame(b,f);if(f==='certified')certified(b,k);else if(k==='diagnostic')diagnostic(b,f);else if(k==='intervention')intervention(b,f);else if(k==='monitoring')monitoring(b,f);else if(k==='expansion')expansion(b,f);else autonomy(b,f);return b;}

let table;
function crc32(b){if(!table)table=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;return c>>>0;});let c=0xFFFFFFFF;for(const x of b)c=table[(c^x)&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function chunk(type,data){const t=Buffer.from(type,'ascii'),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
function png(rgba){const raw=Buffer.alloc((W*4+1)*H);for(let y=0;y<H;y++){const o=y*(W*4+1);raw[o]=0;rgba.copy(raw,o+1,y*W*4,(y+1)*W*4);}const h=Buffer.alloc(13);h.writeUInt32BE(W,0);h.writeUInt32BE(H,4);h[8]=8;h[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}

for(const [slug,family,kind] of PRODUCTS){
  const out=png(draw(family,kind));
  fs.writeFileSync(path.join(OUT_DIR,`${slug}.png`),out);
  console.log(`✓ ${slug}.png`);
}
console.log(`Generated ${PRODUCTS.length} immutable product-identity assets in public/product-icons-v2/`);
