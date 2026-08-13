(() => {
  "use strict";

  const MAX_BYTES = 500 * 1024 * 1024;
  const A4_W = 595.28;
  const A4_H = 841.89;
  const MARGIN = 36;

  const $ = (id) => document.getElementById(id);
  const zipInput = $("zipInput");
  const dropzone = $("dropzone");
  const fileInfo = $("fileInfo");
  const convertBtn = $("convertBtn");
  const progressArea = $("progressArea");
  const statusText = $("statusText");
  const progressPercent = $("progressPercent");
  const progressBar = $("progressBar");
  const detailText = $("detailText");
  const result = $("result");
  const summary = $("summary");
  const downloadBtn = $("downloadBtn");
  const openBtn = $("openBtn");
  const errorBox = $("errorBox");
  const resetBtn = $("resetBtn");

  let selectedFile = null;
  let pdfBytes = null;
  let pdfUrl = null;

  function setProgress(percent, status, detail = "") {
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    progressBar.style.width = `${p}%`;
    progressPercent.textContent = `${p}%`;
    statusText.textContent = status;
    detailText.textContent = detail;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
  }

  function clearError() {
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB"];
    let n = bytes / 1024, i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(n >= 100 ? 0 : 1)} ${units[i]}`;
  }

  function cleanupUrl() {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      pdfUrl = null;
    }
  }

  function getExt(name) {
    const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : "";
  }

  function setSelectedFile(file) {
    clearError();
    result.classList.add("hidden");
    resetBtn.classList.add("hidden");
    pdfBytes = null;
    cleanupUrl();

    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      showError("Please choose a ZIP file (.zip).");
      return;
    }
    if (file.size > MAX_BYTES) {
      showError(`This ZIP is ${formatBytes(file.size)}. The maximum is 500 MB.`);
      return;
    }

    selectedFile = file;
    fileInfo.innerHTML = `<strong>${escapeHtml(file.name)}</strong><br><span>${formatBytes(file.size)}</span>`;
    fileInfo.classList.remove("hidden");
    convertBtn.classList.remove("hidden");
    convertBtn.disabled = false;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
  }

  zipInput.addEventListener("change", e => setSelectedFile(e.target.files[0]));

  ["dragenter", "dragover"].forEach(ev => dropzone.addEventListener(ev, e => {
    e.preventDefault(); dropzone.classList.add("drag");
  }));
  ["dragleave", "drop"].forEach(ev => dropzone.addEventListener(ev, e => {
    e.preventDefault(); dropzone.classList.remove("drag");
  }));
  dropzone.addEventListener("drop", e => setSelectedFile(e.dataTransfer.files[0]));

  convertBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    clearError();
    convertBtn.disabled = true;
    progressArea.classList.remove("hidden");
    result.classList.add("hidden");
    resetBtn.classList.add("hidden");
    cleanupUrl();
    pdfBytes = null;

    try {
      setProgress(5, "Reading ZIP…", `Loading ${formatBytes(selectedFile.size)}`);
      const zip = await JSZip.loadAsync(selectedFile, {
        checkCRC32: false,
        createFolders: false
      });

      const entries = Object.values(zip.files)
        .filter(entry => !entry.dir)
        .map(entry => ({ entry, name: entry.name.replace(/\\/g, "/") }))
        .filter(x => ["pdf", "jpg", "jpeg", "png"].includes(getExt(x.name)))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

      if (!entries.length) throw new Error("The ZIP contains no supported PDF, JPG, JPEG, or PNG files.");

      const pdfCount = entries.filter(x => getExt(x.name) === "pdf").length;
      const imageCount = entries.length - pdfCount;

      const merged = await PDFLib.PDFDocument.create();
      let pagesAdded = 0;

      for (let i = 0; i < entries.length; i++) {
        const { entry, name } = entries[i];
        const ext = getExt(name);
        const start = 10 + (i / entries.length) * 80;

        if (ext === "pdf") {
          setProgress(start, "Merging PDF…", `${i + 1}/${entries.length}: ${name}`);
          const bytes = await entry.async("uint8array");
          const source = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: false });
          const pages = await merged.copyPages(source, source.getPageIndices());
          pages.forEach(page => merged.addPage(page));
          pagesAdded += pages.length;
        } else {
          setProgress(start, "Converting image…", `${i + 1}/${entries.length}: ${name}`);
          const bytes = await entry.async("uint8array");
          const image = ext === "png"
            ? await merged.embedPng(bytes)
            : await merged.embedJpg(bytes);

          const page = merged.addPage([A4_W, A4_H]);
          const maxW = A4_W - MARGIN * 2;
          const maxH = A4_H - MARGIN * 2;
          const scale = Math.min(maxW / image.width, maxH / image.height);
          const w = image.width * scale;
          const h = image.height * scale;
          page.drawImage(image, {
            x: (A4_W - w) / 2,
            y: (A4_H - h) / 2,
            width: w,
            height: h
          });
          pagesAdded++;
        }

        await new Promise(r => setTimeout(r, 0));
      }

      setProgress(92, "Creating final PDF…", `${pagesAdded} pages`);
      pdfBytes = await merged.save({ useObjectStreams: true });

      if (!(pdfBytes instanceof Uint8Array) || pdfBytes.length < 100 || String.fromCharCode(...pdfBytes.slice(0, 4)) !== "%PDF") {
        throw new Error("The PDF was generated but its data is invalid.");
      }

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      pdfUrl = URL.createObjectURL(blob);

      setProgress(100, "Complete", `Generated ${formatBytes(pdfBytes.length)}`);
      summary.textContent = `${pdfCount} PDF${pdfCount === 1 ? "" : "s"} and ${imageCount} image${imageCount === 1 ? "" : "s"} → ${pagesAdded} page${pagesAdded === 1 ? "" : "s"} (${formatBytes(pdfBytes.length)}).`;
      result.classList.remove("hidden");
      resetBtn.classList.remove("hidden");
    } catch (err) {
      console.error(err);
      showError(`Conversion failed: ${err?.message || err}. Try a smaller ZIP or check that the PDFs are not password-protected/corrupted.`);
      progressArea.classList.add("hidden");
    } finally {
      convertBtn.disabled = false;
    }
  });

  function ensurePdfUrl() {
    if (!pdfBytes || !pdfBytes.length) throw new Error("PDF data is no longer available. Please convert the ZIP again.");
    if (!pdfUrl) pdfUrl = URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
    return pdfUrl;
  }

  downloadBtn.addEventListener("click", () => {
    try {
      const url = ensurePdfUrl();
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      showError(`Download failed: ${err?.message || err}. Use "Open PDF" and save it from the browser.`);
    }
  });

  openBtn.addEventListener("click", () => {
    try {
      const url = ensurePdfUrl();
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        location.href = url;
      }
    } catch (err) {
      console.error(err);
      showError(`Could not open the PDF: ${err?.message || err}`);
    }
  });

  resetBtn.addEventListener("click", () => {
    selectedFile = null;
    pdfBytes = null;
    cleanupUrl();
    zipInput.value = "";
    fileInfo.classList.add("hidden");
    convertBtn.classList.add("hidden");
    progressArea.classList.add("hidden");
    result.classList.add("hidden");
    resetBtn.classList.add("hidden");
    clearError();
    setProgress(0, "Preparing…", "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("beforeunload", cleanupUrl);
})();
