here/* =========================================================
   ZIP → PDF CONVERTER
   fees1dd textbook
   ========================================================= */

(() => {
  "use strict";

  const MAX_FILE_SIZE = 500 * 1024 * 1024;

  const REQUIRED_ORDER = [
    "fees1ps.pdf",
    "fees1cc.jpg",
    "fees101.pdf",
    "fees102.pdf",
    "fees103.pdf",
    "fees104.pdf",
    "fees105.pdf",
    "fees106.pdf",
    "fees107.pdf",
    "fees108.pdf",
    "fees109.pdf",
    "fees110.pdf",
    "fees111.pdf",
    "fees112.pdf",
    "fees113.pdf",
    "fees114.pdf",
    "fees1gl.pdf"
  ];

  const JSZIP_URL =
    "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";

  const PDFLIB_URL =
    "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";

  let zipInput;
  let convertBtn;
  let fileInfo;
  let statusBox;


  /* =========================================================
     FIND ELEMENTS
     ========================================================= */

  function getElements() {
    zipInput = document.getElementById("zipInput");
    convertBtn = document.getElementById("convertBtn");
    fileInfo = document.getElementById("fileInfo");
    statusBox = document.getElementById("conversionStatus");

    console.log("ZIP converter elements:", {
      zipInput,
      convertBtn,
      fileInfo,
      statusBox
    });
  }


  /* =========================================================
     STATUS
     ========================================================= */

  function showStatus(message, type = "info") {
    if (!statusBox) return;

    statusBox.style.display = "block";
    statusBox.textContent = message;

    statusBox.style.padding = "15px";
    statusBox.style.borderRadius = "12px";
    statusBox.style.whiteSpace = "pre-wrap";
    statusBox.style.lineHeight = "1.5";

    if (type === "success") {
      statusBox.style.background = "#e8f5e9";
      statusBox.style.border = "1px solid #81c784";
      statusBox.style.color = "#1b5e20";
    } else if (type === "error") {
      statusBox.style.background = "#ffebee";
      statusBox.style.border = "1px solid #ef9a9a";
      statusBox.style.color = "#b71c1c";
    } else if (type === "warning") {
      statusBox.style.background = "#fff8e1";
      statusBox.style.border = "1px solid #ffcc80";
      statusBox.style.color = "#e65100";
    } else {
      statusBox.style.background = "#f1f5f9";
      statusBox.style.border = "1px solid #cbd5e1";
      statusBox.style.color = "#111827";
    }
  }


  /* =========================================================
     FILE SIZE
     ========================================================= */

  function formatBytes(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }


  /* =========================================================
     FILE SELECTION
     ========================================================= */

  function handleFileSelection() {
    console.log("File input changed.");

    if (!zipInput) {
      console.error("zipInput not found.");
      return;
    }

    const files = zipInput.files;

    console.log("Selected files:", files);

    if (!files || files.length === 0) {
      if (fileInfo) {
        fileInfo.textContent = "No ZIP file selected.";
      }

      if (convertBtn) {
        convertBtn.disabled = true;
      }

      return;
    }

    const file = files[0];

    console.log("Selected ZIP:", file.name, file.size);

    if (!file.name.toLowerCase().endsWith(".zip")) {
      if (fileInfo) {
        fileInfo.textContent =
          "❌ Please select a .zip file.";
      }

      if (convertBtn) {
        convertBtn.disabled = true;
      }

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      if (fileInfo) {
        fileInfo.textContent =
          `❌ File is too large.\n\n` +
          `Selected: ${formatBytes(file.size)}\n` +
          `Maximum: 500 MB`;
      }

      if (convertBtn) {
        convertBtn.disabled = true;
      }

      return;
    }

    /* IMPORTANT:
       Update the actual HTML fileInfo element. */

    if (fileInfo) {
      fileInfo.textContent =
        `Selected: ${file.name}\n` +
        `Size: ${formatBytes(file.size)}\n\n` +
        `✅ Ready to convert.`;
    }

    /* IMPORTANT:
       Enable Convert button immediately. */

    if (convertBtn) {
      convertBtn.disabled = false;
      convertBtn.style.display = "block";
    }

    showStatus(
      "ZIP file selected successfully.\n\n" +
      "Tap “Convert ZIP to PDF” to begin.",
      "success"
    );
  }


  /* =========================================================
     LOAD SCRIPT
     ========================================================= */

  function loadScript(src, globalName) {
    return new Promise((resolve, reject) => {

      if (window[globalName]) {
        resolve(window[globalName]);
        return;
      }

      const script = document.createElement("script");

      script.src = src;
      script.async = true;

      script.onload = () => {
        if (window[globalName]) {
          resolve(window[globalName]);
        } else {
          reject(
            new Error(
              `${globalName} loaded but is unavailable.`
            )
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            `Could not load ${globalName}.`
          )
        );
      };

      document.head.appendChild(script);
    });
  }


  /* =========================================================
     LOAD LIBRARIES
     ========================================================= */

  async function loadLibraries() {
    showStatus(
      "Loading conversion libraries...\n\nPlease wait.",
      "info"
    );

    const results = await Promise.all([
      loadScript(JSZIP_URL, "JSZip"),
      loadScript(PDFLIB_URL, "PDFLib")
    ]);

    return {
      JSZip: results[0],
      PDFLib: results[1]
    };
  }


  /* =========================================================
     ZIP PATH
     ========================================================= */

  function baseName(path) {
    return path
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      .trim()
      .toLowerCase();
  }


  /* =========================================================
     FIND REQUIRED FILES
     ========================================================= */

  function findFiles(zip) {
    const found = {};
    const duplicates = [];

    for (const path of Object.keys(zip.files)) {

      const entry = zip.files[path];

      if (entry.dir) {
        continue;
      }

      const name = baseName(path);

      if (!REQUIRED_ORDER.includes(name)) {
        continue;
      }

      if (found[name]) {
        duplicates.push(name);
        continue;
      }

      found[name] = {
        path,
        entry
      };
    }

    return {
      found,
      duplicates
    };
  }


  /* =========================================================
     VALIDATE ZIP
     ========================================================= */

  function validateZip(found, duplicates) {

    if (duplicates.length > 0) {
      throw new Error(
        "Duplicate required files found:\n\n" +
        duplicates.join("\n")
      );
    }

    const missing = [];

    for (const name of REQUIRED_ORDER) {
      if (!found[name]) {
        missing.push(name);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        "The ZIP is missing required files:\n\n" +
        missing.map(x => "• " + x).join("\n")
      );
    }
  }


  /* =========================================================
     ADD PDF
     ========================================================= */

  async function addPdf(
    outputPdf,
    bytes,
    PDFLib
  ) {

    const sourcePdf =
      await PDFLib.PDFDocument.load(bytes, {
        ignoreEncryption: false,
        updateMetadata: false
      });

    const pageCount =
      sourcePdf.getPageCount();

    const pages =
      await outputPdf.copyPages(
        sourcePdf,
        Array.from(
          { length: pageCount },
          (_, i) => i
        )
      );

    for (const page of pages) {
      outputPdf.addPage(page);
    }

    return pageCount;
  }


  /* =========================================================
     ADD JPG
     
     IMPORTANT:
     We do NOT manually search for the JPEG SOI marker.
     pdf-lib itself validates the image.
     ========================================================= */

  async function addJpg(
    outputPdf,
    bytes,
    PDFLib
  ) {

    const image =
      await outputPdf.embedJpg(bytes);

    const A4_WIDTH = 595.2756;
    const A4_HEIGHT = 841.8898;

    const page =
      outputPdf.addPage([
        A4_WIDTH,
        A4_HEIGHT
      ]);

    /* Use dimensions supplied by pdf-lib. */

    const imageWidth = image.width;
    const imageHeight = image.height;

    const imageRatio =
      imageWidth / imageHeight;

    const pageRatio =
      A4_WIDTH / A4_HEIGHT;

    let width;
    let height;
    let x;
    let y;

    if (imageRatio > pageRatio) {

      width = A4_WIDTH;
      height = width / imageRatio;

      x = 0;
      y = (A4_HEIGHT - height) / 2;

    } else {

      height = A4_HEIGHT;
      width = height * imageRatio;

      x = (A4_WIDTH - width) / 2;
      y = 0;
    }

    page.drawImage(image, {
      x,
      y,
      width,
      height
    });

    return 1;
  }


  /* =========================================================
     CONVERT
     ========================================================= */

  async function convertZip(file) {

    if (!file) {
      throw new Error(
        "Please select a ZIP file first."
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        "The ZIP file is larger than 500 MB."
      );
    }

    const {
      JSZip,
      PDFLib
    } = await loadLibraries();

    showStatus(
      "Reading ZIP file...\n\nPlease wait.",
      "info"
    );

    const zip =
      await JSZip.loadAsync(file);

    const {
      found,
      duplicates
    } = findFiles(zip);

    validateZip(
      found,
      duplicates
    );

    const outputPdf =
      await PDFLib.PDFDocument.create();

    outputPdf.setTitle(
      "fees1dd Converted PDF"
    );

    outputPdf.setCreator(
      "ZIP to PDF Converter"
    );

    let totalPages = 0;

    /* =====================================================
       PROCESS IN EXACT ORDER
       ===================================================== */

    for (
      let i = 0;
      i < REQUIRED_ORDER.length;
      i++
    ) {

      const filename =
        REQUIRED_ORDER[i];

      const item =
        found[filename];

      const percent =
        Math.round(
          ((i + 1) /
            REQUIRED_ORDER.length) *
            100
        );

      showStatus(
        `Converting ${i + 1} of ${REQUIRED_ORDER.length}\n\n` +
        `${filename}\n\n` +
        `Progress: ${percent}%`,
        "info"
      );

      let bytes;

      try {

        bytes =
          await item.entry.async(
            "uint8array"
          );

      } catch (error) {

        throw new Error(
          `Could not read:\n${filename}\n\n` +
          `${error.message || error}`
        );
      }


      /* JPG */

      if (
        filename.endsWith(".jpg")
      ) {

        try {

          const pages =
            await addJpg(
              outputPdf,
              bytes,
              PDFLib
            );

          totalPages += pages;

        } catch (error) {

          throw new Error(
            `Could not process:\n${filename}\n\n` +
            `${error.message || error}`
          );
        }

        continue;
      }


      /* PDF */

      if (
        filename.endsWith(".pdf")
      ) {

        try {

          const pages =
            await addPdf(
              outputPdf,
              bytes,
              PDFLib
            );

          totalPages += pages;

        } catch (error) {

          throw new Error(
            `Could not process:\n${filename}\n\n` +
            `${error.message || error}`
          );
        }

        continue;
      }

      throw new Error(
        `Unsupported file:\n${filename}`
      );
    }


    /* =====================================================
       SAVE
       ===================================================== */

    showStatus(
      "All files processed successfully.\n\n" +
      `Total pages: ${totalPages}\n\n` +
      "Creating final PDF...",
      "info"
    );

    const finalBytes =
      await outputPdf.save({
        useObjectStreams: true,
        addDefaultPage: false
      });

    return {
      bytes: finalBytes,
      pageCount: totalPages
    };
  }


  /* =========================================================
     DOWNLOAD
     ========================================================= */

  function downloadPdf(bytes) {

    const blob =
      new Blob(
        [bytes],
        {
          type: "application/pdf"
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "fees1dd-converted.pdf";

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);
  }


  /* =========================================================
     CONVERT BUTTON
     ========================================================= */

  async function handleConvert() {

    if (!zipInput) {
      showStatus(
        "ZIP input was not found.",
        "error"
      );
      return;
    }

    const file =
      zipInput.files &&
      zipInput.files[0];

    if (!file) {
      showStatus(
        "Please choose your ZIP file first.",
        "warning"
      );
      return;
    }

    if (
      convertBtn.dataset.busy === "true"
    ) {
      return;
    }

    convertBtn.dataset.busy = "true";
    convertBtn.disabled = true;

    const oldText =
      convertBtn.textContent;

    convertBtn.textContent =
      "Converting...";

    try {

      const result =
        await convertZip(file);

      showStatus(
        `✅ CONVERSION COMPLETED\n\n` +
        `Pages created: ${result.pageCount}\n\n` +
        `File: fees1dd-converted.pdf\n\n` +
        `The required files were processed in the specified order.`,
        "success"
      );

      downloadPdf(result.bytes);

    } catch (error) {

      console.error(
        "Conversion error:",
        error
      );

      showStatus(
        `❌ CONVERSION FAILED\n\n` +
        `${error.message || error}`,
        "error"
      );

    } finally {

      convertBtn.dataset.busy =
        "false";

      convertBtn.disabled = false;

      convertBtn.textContent =
        oldText || "Convert ZIP to PDF";
    }
  }


  /* =========================================================
     INITIALIZE
     ========================================================= */

  function initialize() {

    getElements();

    if (!zipInput) {

      console.error(
        "ERROR: #zipInput not found."
      );

      return;
    }

    if (!convertBtn) {

      console.error(
        "ERROR: #convertBtn not found."
      );

      return;
    }

    if (!fileInfo) {

      console.error(
        "ERROR: #fileInfo not found."
      );

      return;
    }

    /* Start disabled */

    convertBtn.disabled = true;

    /* IMPORTANT: Listen directly to #zipInput */

    zipInput.addEventListener(
      "change",
      handleFileSelection
    );

    /* Convert */

    convertBtn.addEventListener(
      "click",
      handleConvert
    );

    console.log(
      "✅ ZIP → PDF converter initialized."
    );
  }


  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );

  } else {

    initialize();
  }

})();
