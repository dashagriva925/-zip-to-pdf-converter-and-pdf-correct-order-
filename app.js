// Memory Cleanup Variables
let currentZipBlobUrl = null;
let currentOrgBlobUrl = null;

// --- TAB SWITCHING LOGIC ---
const tabZipBtn = document.getElementById('tabZipBtn');
const tabPdfBtn = document.getElementById('tabPdfBtn');
const zipTab = document.getElementById('zipTab');
const pdfTab = document.getElementById('pdfTab');

tabZipBtn.onclick = () => {
  tabZipBtn.classList.add('active');
  tabPdfBtn.classList.remove('active');
  zipTab.classList.add('active');
  pdfTab.classList.remove('active');
};

tabPdfBtn.onclick = () => {
  tabPdfBtn.classList.add('active');
  tabZipBtn.classList.remove('active');
  pdfTab.classList.add('active');
  zipTab.classList.remove('active');
};


// ==========================================
// TAB 1: ZIP TO PDF CONVERTER
// ==========================================
const input = document.getElementById('zipInput'),
  info = document.getElementById('fileInfo'),
  btn = document.getElementById('convertBtn'),
  status = document.getElementById('status'),
  down = document.getElementById('downloadBtn'),
  box = document.getElementById('progressBox'),
  bar = document.getElementById('progress'),
  pt = document.getElementById('progressText');

let file = null;
const imgs = new Set(['jpg','jpeg','png','gif','bmp','webp','svg']);
const texts = new Set(['txt','csv','html','htm','xml','json','md','log']);

const ext = n => { let i = n.toLowerCase().lastIndexOf('.'); return i < 0 ? '' : n.slice(i + 1).split('?')[0]; };
const size = n => n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB';

function msg(t, c = '') { status.textContent = t; status.className = c; }
function prog(n, t) { bar.style.width = n + '%'; pt.textContent = t; }

input.onchange = () => {
  file = input.files[0];
  down.classList.add('hidden');
  msg('');
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.zip')) {
    file = null; btn.disabled = true;
    info.textContent = 'Please choose a .zip file.';
    msg('Only .zip files are accepted.', 'err');
    return;
  }
  if (file.size > 524288000) {
    file = null; btn.disabled = true;
    info.textContent = 'ZIP is ' + size(input.files[0].size);
    msg('Maximum size is 500 MB.', 'err');
    return;
  }
  info.textContent = file.name + ' — ' + size(file.size);
  btn.disabled = false;
  msg('ZIP selected. Tap “Convert ZIP to PDF”.', 'ok');
};

btn.onclick = async () => {
  if (!file) return;
  btn.disabled = true;
  box.classList.remove('hidden');
  down.classList.add('hidden');
  
  try {
    msg('Opening ZIP...');
    prog(2, 'Reading ZIP...');
    const z = await JSZip.loadAsync(file);
    const entries = Object.values(z.files).filter(x => !x.dir && !x.name.startsWith('__MACOSX/')).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    
    if (!entries.length) throw Error('The ZIP contains no files.');
    const out = await PDFLib.PDFDocument.create();
    let done = 0, skip = [];

    for (let i = 0; i < entries.length; i++) {
      let e = entries[i], x = ext(e.name);
      prog(Math.round((i / entries.length) * 90), `Processing ${i + 1} of ${entries.length}: ${e.name}`);
      try {
        if (x === 'pdf') {
          let b = await e.async('uint8array'), src = await PDFLib.PDFDocument.load(b);
          (await out.copyPages(src, src.getPageIndices())).forEach(p => out.addPage(p));
          done++;
        } else if (imgs.has(x)) {
          let b = await e.async('uint8array');
          await imagePage(out, b, x);
          done++;
        } else if (texts.has(x)) {
          let t = await e.async('text');
          textPages(out, e.name, t);
          done++;
        } else {
          skip.push(e.name);
        }
      } catch (err) {
        skip.push(e.name + ' (could not read)');
      }
    }

    if (!out.getPageCount()) throw Error('No supported files were found.');
    prog(96, 'Creating PDF...');
    
    let bytes = await out.save();
    if (currentZipBlobUrl) URL.revokeObjectURL(currentZipBlobUrl);
    currentZipBlobUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    
    down.href = currentZipBlobUrl;
    down.classList.remove('hidden');
    prog(100, 'Done');
    msg(`Success: ${done} file(s) converted.${skip.length ? ' ' + skip.length + ' unsupported file(s) skipped.' : ''}`, skip.length ? 'warn' : 'ok');
  } catch (e) {
    prog(0, 'Failed');
    msg('Conversion failed: ' + e.message, 'err');
  } finally {
    btn.disabled = false;
  }
};

async function imagePage(pdf, b, x) {
  let im;
  if (x === 'jpg' || x === 'jpeg') im = await pdf.embedJpg(b);
  else if (x === 'png') im = await pdf.embedPng(b);
  else {
    let blob = new Blob([b], { type: { gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml' }[x] || 'image/*' });
    let url = await read(blob);
    let png = await canvasPNG(url);
    im = await pdf.embedPng(png);
  }
  let W = 595.28, H = 841.89, p = pdf.addPage([W, H]);
  let s = Math.min(1, (W - 40) / im.width, (H - 40) / im.height); // Caps scale to prevent image distortion
  let w = im.width * s, h = im.height * s;
  p.drawImage(im, { x: (W - w) / 2, y: (H - h) / 2, width: w, height: h });
}

function read(b) {
  return new Promise((r, j) => {
    let f = new FileReader();
    f.onload = () => r(f.result);
    f.onerror = j;
    f.readAsDataURL(b);
  });
}

function canvasPNG(src) {
  return new Promise((r, j) => {
    let im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(src);
      let c = document.createElement('canvas'), s = Math.min(1, 3000 / Math.max(im.width, im.height));
      c.width = Math.max(1, im.width * s);
      c.height = Math.max(1, im.height * s);
      let q = c.getContext('2d');
      q.fillStyle = '#fff';
      q.fillRect(0, 0, c.width, c.height);
      q.drawImage(im, 0, 0, c.width, c.height);
      c.toBlob(async b => r(new Uint8Array(await b.arrayBuffer())), 'image/png');
    };
    im.onerror = () => { URL.revokeObjectURL(src); j(Error('Image could not be decoded.')); };
    im.src = src;
  });
}

function textPages(pdf, name, text) {
  let W = 595.28, H = 841.89, m = 42, y = H - m, p = pdf.addPage([W, H]), lines = [];
  String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').forEach(l => {
    if (!l) lines.push('');
    else for (let i = 0; i < l.length; i += 95) lines.push(l.slice(i, i + 95));
  });
  
  // Clean ASCII filter to avoid standard font crashes in pdf-lib
  const safeTitle = name.slice(0, 90).replace(/[^\x20-\x7E]/g, '');
  p.drawText(safeTitle, { x: m, y, size: 13, font: PDFLib.StandardFonts.HelveticaBold });
  y -= 25;
  
  for (let l of lines) {
    if (y < m) { p = pdf.addPage([W, H]); y = H - m; }
    let safeLine = l.slice(0, 110).replace(/[^\x20-\x7E]/g, '');
    p.drawText(safeLine, { x: m, y, size: 9, font: PDFLib.StandardFonts.Helvetica });
    y -= 13;
  }
}


// ==========================================
// TAB 2: CHAPTER & TOPIC ORGANIZER LOGIC
// ==========================================
const orgPdfInput = document.getElementById('orgPdfInput');
const orgFileInfo = document.getElementById('orgFileInfo');
const chapterManager = document.getElementById('chapterManager');
const chapterList = document.getElementById('chapterList');
const addChapterBtn = document.getElementById('addChapterBtn');
const rebuildPdfBtn = document.getElementById('rebuildPdfBtn');
const orgStatus = document.getElementById('orgStatus');
const orgDownloadBtn = document.getElementById('orgDownloadBtn');

let loadedPdfBytes = null;
let totalPdfPages = 0;
let chapterCounter = 0;

orgPdfInput.onchange = async () => {
  const file = orgPdfInput.files[0];
  orgDownloadBtn.classList.add('hidden');
  orgStatus.textContent = '';
  
  if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
    orgFileInfo.textContent = 'Please select a valid .pdf file.';
    chapterManager.classList.add('hidden');
    return;
  }

  orgFileInfo.textContent = `${file.name} — ${size(file.size)}`;
  loadedPdfBytes = await file.arrayBuffer();

  try {
    const pdfDoc = await PDFLib.PDFDocument.load(loadedPdfBytes);
    totalPdfPages = pdfDoc.getPageCount();
    
    // Clear & create default Chapter 1
    chapterList.innerHTML = '';
    chapterCounter = 0;
    addChapter('Chapter 1', [
      { name: 'Topic 1.1', pages: `1-${Math.min(3, totalPdfPages)}` }
    ]);

    chapterManager.classList.remove('hidden');
  } catch (err) {
    orgStatus.textContent = 'Error reading PDF: ' + err.message;
    orgStatus.className = 'err';
  }
};

addChapterBtn.onclick = () => {
  chapterCounter++;
  addChapter(`Chapter ${chapterList.children.length + 1}`, [
    { name: 'Topic Title', pages: '' }
  ]);
};

function addChapter(titleText, defaultTopics = []) {
  const chapDiv = document.createElement('div');
  chapDiv.className = 'chapter-card';
  chapDiv.innerHTML = `
    <div class="chapter-header">
      <input type="text" class="chapter-title-input" value="${titleText}">
      <button type="button" class="btn-icon" title="Move Up" onclick="moveUp(this.closest('.chapter-card'))">↑</button>
      <button type="button" class="btn-icon" title="Move Down" onclick="moveDown(this.closest('.chapter-card'))">↓</button>
      <button type="button" class="btn-icon btn-danger" title="Remove Chapter" onclick="this.closest('.chapter-card').remove()">✕</button>
    </div>
    <div class="topic-list"></div>
    <button type="button" class="btn-secondary" style="margin-top: 8px;" onclick="addTopicToChapter(this.previousElementSibling)">+ Add Topic</button>
  `;

  const topicList = chapDiv.querySelector('.topic-list');
  defaultTopics.forEach(t => addTopic(topicList, t.name, t.pages));
  
  chapterList.appendChild(chapDiv);
}

function addTopicToChapter(topicListElem) {
  addTopic(topicListElem, 'New Topic', '');
}

function addTopic(topicListElem, name, pages) {
  const topDiv = document.createElement('div');
  topDiv.className = 'topic-row';
  topDiv.innerHTML = `
    <input type="text" class="topic-title-input" placeholder="Topic Name" value="${name}">
    <input type="text" class="topic-pages-input" placeholder="Pages (e.g., 1-3, 5)" value="${pages}">
    <button type="button" class="btn-icon" title="Move Up" onclick="moveUp(this.closest('.topic-row'))">↑</button>
    <button type="button" class="btn-icon" title="Move Down" onclick="moveDown(this.closest('.topic-row'))">↓</button>
    <button type="button" class="btn-icon btn-danger" title="Remove Topic" onclick="this.closest('.topic-row').remove()">✕</button>
  `;
  topicListElem.appendChild(topDiv);
}

// Move item helpers
function moveUp(elem) {
  if (elem.previousElementSibling) {
    elem.parentNode.insertBefore(elem, elem.previousElementSibling);
  }
}
function moveDown(elem) {
  if (elem.nextElementSibling) {
    elem.parentNode.insertBefore(elem.nextElementSibling, elem);
  }
}

// Convert input strings like "1-3, 5, 8-10" into array of 0-based index numbers
function parsePageRanges(rangeStr, maxPages) {
  const indices = [];
  const parts = rangeStr.split(',');

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end > maxPages || start > end) {
        throw new Error(`Invalid range "${part}". Document has ${maxPages} pages.`);
      }
      for (let p = start; p <= end; p++) indices.push(p - 1);
    } else {
      const p = parseInt(part, 10);
      if (isNaN(p) || p < 1 || p > maxPages) {
        throw new Error(`Invalid page number "${part}". Document has ${maxPages} pages.`);
      }
      indices.push(p - 1);
    }
  }
  return indices;
}

// Rebuild PDF based on Chapter & Topic hierarchy
rebuildPdfBtn.onclick = async () => {
  if (!loadedPdfBytes) return;

  try {
    orgStatus.textContent = 'Rebuilding PDF in chapter order...';
    orgStatus.className = 'ok';

    const srcDoc = await PDFLib.PDFDocument.load(loadedPdfBytes);
    const newDoc = await PDFLib.PDFDocument.create();

    const chapters = chapterList.querySelectorAll('.chapter-card');
    if (!chapters.length) throw new Error('Add at least one chapter.');

    let totalPagesAdded = 0;

    for (let chap of chapters) {
      const topics = chap.querySelectorAll('.topic-row');
      for (let top of topics) {
        const pagesStr = top.querySelector('.topic-pages-input').value;
        if (!pagesStr.trim()) continue;

        const pageIndices = parsePageRanges(pagesStr, totalPdfPages);
        const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
        copiedPages.forEach(p => newDoc.addPage(p));
        totalPagesAdded += copiedPages.length;
      }
    }

    if (totalPagesAdded === 0) {
      throw new Error('No valid page numbers were entered for the topics.');
    }

    const pdfBytes = await newDoc.save();

    if (currentOrgBlobUrl) URL.revokeObjectURL(currentOrgBlobUrl);
    currentOrgBlobUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));

    orgDownloadBtn.href = currentOrgBlobUrl;
    orgDownloadBtn.classList.remove('hidden');
    orgStatus.textContent = `Success! Rebuilt PDF with ${totalPagesAdded} total pages in sequence.`;
  } catch (err) {
    orgStatus.textContent = 'Failed: ' + err.message;
    orgStatus.className = 'err';
  }
};
                  
