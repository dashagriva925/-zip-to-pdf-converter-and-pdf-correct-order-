document.addEventListener("DOMContentLoaded",function(){
"use strict";

const $=id=>document.getElementById(id);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const ext=name=>{let i=name.lastIndexOf(".");return i<0?"":name.slice(i+1).toLowerCase()};
const size=b=>b<1048576?(b/1024).toFixed(1)+" KB":(b/1048576).toFixed(2)+" MB";
const esc=t=>String(t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function msg(el,text,type=""){el.textContent=text;el.className="status "+type}

const zipTab=$("zipTab"), organizerTab=$("organizerTab"), zipPage=$("zipPage"), organizerPage=$("organizerPage");

zipTab.onclick=()=>{zipTab.classList.add("active");organizerTab.classList.remove("active");zipPage.classList.add("active");organizerPage.classList.remove("active")};
organizerTab.onclick=()=>{organizerTab.classList.add("active");zipTab.classList.remove("active");organizerPage.classList.add("active");zipPage.classList.remove("active")};

let selectedZIP=null;
const zipInput=$("zipInput"),zipInfo=$("zipInfo"),zipConvert=$("zipConvert"),zipStatus=$("zipStatus"),zipDownload=$("zipDownload");

zipInput.onchange=()=>{
selectedZIP=zipInput.files[0]||null;zipDownload.classList.add("hidden");
if(!selectedZIP){zipInfo.textContent="No ZIP selected.";zipConvert.disabled=true;return}
if(!selectedZIP.name.toLowerCase().endsWith(".zip")){selectedZIP=null;zipInfo.textContent="Please select a ZIP file.";zipConvert.disabled=true;msg(zipStatus,"❌ Please choose a .zip file.","err");return}
zipInfo.textContent=selectedZIP.name+" — "+size(selectedZIP.size);zipConvert.disabled=false;msg(zipStatus,"ZIP selected. Ready to convert.","ok");
};

zipConvert.onclick=async()=>{
if(!selectedZIP)return;zipConvert.disabled=true;
try{
msg(zipStatus,"⏳ Reading ZIP...");
const zip=await JSZip.loadAsync(selectedZIP);
const entries=Object.values(zip.files).filter(f=>!f.dir&&!f.name.startsWith("__MACOSX/")).filter(f=>["pdf","jpg","jpeg","png"].includes(ext(f.name))).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:"base"}));
if(!entries.length)throw new Error("No PDF, JPG or PNG files found.");
const out=await PDFLib.PDFDocument.create();
for(let i=0;i<entries.length;i++){
let e=entries[i],eext=ext(e.name);msg(zipStatus,`⏳ Processing ${i+1}/${entries.length}: ${e.name}`);
if(eext==="pdf"){
const src=await PDFLib.PDFDocument.load(await e.async("uint8array"));
const copied=await out.copyPages(src,src.getPageIndices());copied.forEach(p=>out.addPage(p));
}else{
const bytes=await e.async("uint8array");const image=eext==="png"?await out.embedPng(bytes):await out.embedJpg(bytes);
const W=595.28,H=841.89,M=28,maxW=W-2*M,maxH=H-2*M,scale=Math.min(maxW/image.width,maxH/image.height),w=image.width*scale,h=image.height*scale;
const page=out.addPage([W,H]);page.drawImage(image,{x:(W-w)/2,y:(H-h)/2,width:w,height:h});
}
await delay(1);
}
msg(zipStatus,"⏳ Creating final PDF...");
const bytes=await out.save(),url=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));
zipDownload.href=url;zipDownload.classList.remove("hidden");msg(zipStatus,"✅ PDF created successfully. Tap Download PDF.","ok");
}catch(e){console.error(e);msg(zipStatus,"❌ "+e.message,"err")}finally{zipConvert.disabled=false}
};

const pdfInput=$("pdfInput"),pdfInfo=$("pdfInfo"),analyzeBtn=$("analyzeBtn"),organizerStatus=$("organizerStatus"),autoMode=$("autoMode"),manualMode=$("manualMode"),autoPanel=$("autoPanel"),manualPanel=$("manualPanel"),autoList=$("autoList"),manualList=$("manualList"),recreateAuto=$("recreateAuto"),recreateManual=$("recreateManual"),organizerDownload=$("organizerDownload");

let selectedPDF=null,originalPDFBytes=null,pages=[],automaticOrder=[],manualOrder=[],currentMode="auto";

autoMode.onclick=()=>{currentMode="auto";autoMode.classList.add("active");manualMode.classList.remove("active");if(pages.length){autoPanel.classList.remove("hidden");manualPanel.classList.add("hidden")}};
manualMode.onclick=()=>{currentMode="manual";manualMode.classList.add("active");autoMode.classList.remove("active");if(pages.length){manualPanel.classList.remove("hidden");autoPanel.classList.add("hidden")}};

pdfInput.onchange=()=>{
selectedPDF=pdfInput.files[0]||null;organizerDownload.classList.add("hidden");
if(!selectedPDF){pdfInfo.textContent="No PDF selected.";analyzeBtn.disabled=true;return}
if(!selectedPDF.name.toLowerCase().endsWith(".pdf")){selectedPDF=null;pdfInfo.textContent="Please select a PDF.";analyzeBtn.disabled=true;msg(organizerStatus,"❌ Only PDF files are supported.","err");return}
pdfInfo.textContent=selectedPDF.name+" — "+size(selectedPDF.size);analyzeBtn.disabled=false;msg(organizerStatus,"PDF selected. Tap Analyze PDF.","ok");
};

analyzeBtn.onclick=async()=>{
if(!selectedPDF)return;analyzeBtn.disabled=true;
try{
msg(organizerStatus,"⏳ Reading PDF...");
originalPDFBytes=new Uint8Array(await selectedPDF.arrayBuffer());
if(!window.pdfjsLib)throw new Error("PDF reader has not loaded yet. Refresh the page.");
const pdf=await pdfjsLib.getDocument({data:originalPDFBytes}).promise;pages=[];
for(let n=1;n<=pdf.numPages;n++){
const p=await pdf.getPage(n),content=await p.getTextContent(),text=content.items.map(x=>x.str).join(" ");
pages.push({page:n,text});msg(organizerStatus,`⏳ Reading page ${n}/${pdf.numPages}`);await delay(1);
}
automaticOrder=pages.map((p,i)=>{const t=detectTopic(p.text);return{index:i,number:t.number,priority:t.priority,original:i}}).sort((a,b)=>a.number-b.number||a.priority-b.priority||a.original-b.original).map(x=>x.index);
manualOrder=pages.map((_,i)=>i);renderAutomatic();renderManual();recreateAuto.disabled=false;recreateManual.disabled=false;
if(currentMode==="auto"){autoPanel.classList.remove("hidden");manualPanel.classList.add("hidden")}else{manualPanel.classList.remove("hidden");autoPanel.classList.add("hidden")}
msg(organizerStatus,`✅ ${pages.length} pages analyzed.`,"ok");
}catch(e){console.error(e);msg(organizerStatus,"❌ "+e.message,"err")}finally{analyzeBtn.disabled=false}
};

function detectTopic(text){
const clean=text.replace(/\s+/g," ").trim();
let m=clean.match(/(?:chapter|ch\.?|topic|unit|lesson|section|part)\s*[-.:]?\s*(\d{1,3})/i);
if(m)return{number:parseInt(m[1]),priority:0};
m=clean.match(/^\s*(\d{1,3})\s*[.)\-:]\s+/);
if(m)return{number:parseInt(m[1]),priority:1};
return{number:999999,priority:999};
}

function pageTitle(p){let t=p.text.replace(/\s+/g," ").trim();return !t?"Page "+p.page:t.length>100?t.slice(0,100)+"…":t}

function renderAutomatic(){
autoList.innerHTML="";
automaticOrder.forEach((idx,pos)=>{const p=pages[idx],item=document.createElement("div");item.className="pageItem";item.innerHTML=`<div class="pageNumber">${pos+1}</div><div class="pageText"><div>${esc(pageTitle(p))}</div><div class="originalPage">Original page ${p.page}</div></div>`;autoList.appendChild(item)});
}

function renderManual(){
manualList.innerHTML="";
manualOrder.forEach((idx,pos)=>{const p=pages[idx],item=document.createElement("div");item.className="pageItem";item.innerHTML=`<div class="pageNumber">${pos+1}</div><div class="pageText"><div>${esc(pageTitle(p))}</div><div class="originalPage">Original page ${p.page}</div></div><button class="moveButton" type="button" data-up="${pos}">↑</button><button class="moveButton" type="button" data-down="${pos}">↓</button>`;manualList.appendChild(item)});
manualList.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>moveManual(+b.dataset.up,-1));
manualList.querySelectorAll("[data-down]").forEach(b=>b.onclick=()=>moveManual(+b.dataset.down,1));
}

function moveManual(pos,dir){
const np=pos+dir;if(np<0||np>=manualOrder.length)return;
[manualOrder[pos],manualOrder[np]]=[manualOrder[np],manualOrder[pos]];renderManual();
}

recreateAuto.onclick=()=>recreatePDF(automaticOrder);
recreateManual.onclick=()=>recreatePDF(manualOrder);

async function recreatePDF(order){
if(!originalPDFBytes||!order.length){msg(organizerStatus,"❌ Analyze the PDF first.","err");return}
recreateAuto.disabled=true;recreateManual.disabled=true;
try{
msg(organizerStatus,"⏳ Creating new PDF...");
const source=await PDFLib.PDFDocument.load(originalPDFBytes),out=await PDFLib.PDFDocument.create();
for(let i=0;i<order.length;i++){
const copied=await out.copyPages(source,[order[i]]);copied.forEach(p=>out.addPage(p));
msg(organizerStatus,`⏳ Creating PDF... ${Math.round((i+1)/order.length*100)}%`);await delay(1);
}
const bytes=await out.save(),url=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));
organizerDownload.href=url;organizerDownload.download="organized-"+selectedPDF.name.replace(/\.pdf$/i,"")+".pdf";organizerDownload.classList.remove("hidden");
msg(organizerStatus,"✅ PDF created! Tap Download Organized PDF.","ok");
organizerDownload.scrollIntoView({behavior:"smooth",block:"center"});
}catch(e){console.error(e);msg(organizerStatus,"❌ "+e.message,"err")}finally{recreateAuto.disabled=false;recreateManual.disabled=false}
}

console.log("ZIP to PDF Converter is ready.");
});
