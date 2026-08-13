/* =========================================================
   ZIP → PDF CONVERTER
   fees1dd required order
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

  const fileInput = document.getElementById("zipInput");
  const convertBtn = document.getElementById("convertBtn");
  const fileInfo = document.getElementById("fileInfo");
  const statusBox = document.getElementById("conversionStatus");

  let selectedFile = null;
  let isConverting = false;


  /* =========================================================
     BASIC CHECK
     ========================================================= */

  if (!fileInput || !convertBtn || !fileInfo || !statusBox) {
    console.error("ZIP converter: required HTML elements not found.");
    return;
  }


  /* =========================================================
     STATUS
     ========================================================= */

  function showStatus(message, type = "info") {
    statusBox.style.display = "block";
    statusBox.textContent = message;

    statusBox.style.padding = "12px";
    statusBox.style.marginTop = "18px";
    statusBox.style.borderRadius = "10px";
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
      return bytes + " B";
    }

    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + " KB";
    }

    if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    }

    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  }


  /* =========================================================
     LOAD LIBRARIES
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
              globalName + " loaded but was not available."
            )
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            "Could not load " + globalName + ".\n\n" +
            "Please check your internet connection and refresh the page."
          )
        );
      };

      document.head.appendChild(script);
    });
  }


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
     NORMALIZE ZIP FILE NAME
     ========================================================= */

  function getBaseName(path) {
    path = String(path || "").replace(/\\/g, "/");

    const parts = path.split("/");

    return parts[parts.length - 1]
      .trim()
      .toLowerCase();
  }


  /* =========================================================
     FIND REQUIRED FILES
     ========================================================= */

  function findRequiredFiles(zip) {

    const found = {};
    const duplicates = [];

    Object.keys(zip.files).forEach((zipPath) => {

      const entry = zip.files[zipPath];

      if (entry.dir) {
        return;
      }

      const baseName = getBaseName(zipPath);

      if (!REQUIRED_ORDER.includes(baseName)) {
        return;
      }

      if (found[baseName]) {

        duplicates.push(
          baseName +
          "\n  " + found[baseName].name +
          "\n  " + zipPath
        );

        return;
      }

      found[baseName] = {
        name: zipPath,
        entry: entry
      };
    });

    return {
      found,
      duplicates
    };
  }


  /* =========================================================
     VALIDATE ZIP
     ========================================================= */

  function validateFiles(found, duplicates) {

    if (duplicates.length > 0) {
      throw new Error(
        "Duplicate required files found:\n\n" +
        duplicates.join("\n\n")
      );
    }

    const missing = [];

    REQUIRED_ORDER.forEach((filename) => {
      if (!found[filename]) {
        missing.push(filename);
      }
    });

    if (missing.length > 0) {

      throw new Error(
        "The ZIP is missing required files:\n\n" +
        missing.map((x) => "• " + x).join("\n") +
        "\n\nThe conversion cannot continue."
      );
    }
  }


  /* =========================================================
     JPEG DIMENSIONS
     ========================================================= */

  function getJpegDimensions(bytes) {

    if (
      bytes.length < 2 ||
      bytes[0] !== 0xff ||
      bytes[1] !== 0xd8
    ) {
      throw new Error(
        "fees1cc.jpg is not a valid JPEG file."
      );
    }

    let offset = 2;

    while (offset < bytes.length) {

      while (
        offset < bytes.length &&
        bytes[offset] !== 0xff
      ) {
        offset++;
      }

      while (
        offset < bytes.length &&
        bytes[offset] === 0xff
      ) {
        offset++;
      }

      if (offset >= bytes.length) {
        break;
      }

      const marker = bytes[offset];
      offset++;

      if (
        marker === 0xd8 ||
        marker === 0xd9 ||
        (marker >= 0xd0 && marker <= 0xd7)
      ) {
        continue;
      }

      if (offset + 1 >= bytes.length) {
        break;
      }

      const length =
        (bytes[offset] << 8) |
        bytes[offset + 1];

      if (length < 2) {
        break;
      }

      const isSOF =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);

      if (isSOF) {

        if (offset + 7 >= bytes.length) {
          break;
        }

        const height =
          (bytes[offset + 3] << 8) |
          bytes[offset + 4];

        const width =
          (bytes[offset + 5] << 8) |
          bytes[offset + 6];

        return {
          width,
          height
        };
      }

      offset += length;
    }

    throw new Error(
      "Could not determine JPEG dimensions."
    );
  }


  /* =========================================================
     ADD JPG AS A4 PAGE
     ========================================================= */

  async function addJpgPage(pdfDoc, jpgBytes) {

    const image =
      await pdfDoc.embedJpg(jpgBytes);

    const A4_WIDTH = 595.2756;
    const A4_HEIGHT = 841.8898;

    const page =
      pdfDoc.addPage([
        A4_WIDTH,
        A4_HEIGHT
      ]);

    const dimensions =
      getJpegDimensions(jpgBytes);

    const imageRatio =
      dimensions.width / dimensions.height;

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
  }


  /* =========================================================
     APPEND PDF
     ========================================================= */

  async function appendPdf(
    outputPdf,
    pdfBytes,
    PDFLib
  ) {

    const sourcePdf =
      await PDFLib.PDFDocument.load(
        pdfBytes,
        {
          ignoreEncryption: false,
          updateMetadata: false
        }
      );

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

    pages.forEach((page) => {
      outputPdf.addPage(page);
    });

    return pageCount;
  }


  /* =========================================================
     CONVERT
     ========================================================= */

  async function convertZipToPdf(file) {

    if (!file) {
      throw new Error(
        "Please select a ZIP file first."
      );
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith(".zip")
    ) {
      throw new Error(
        "Please select a .zip file."
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        "The ZIP file is larger than 500 MB.\n\n" +
        "Selected: " +
        formatBytes(file.size) +
        "\nMaximum: 500 MB"
      );
    }

    const {
      JSZip,
      PDFLib
    } = await loadLibraries();

    showStatus(
      "Reading ZIP file...\n\n" +
      "Please wait.",
      "info"
    );

    const zip =
      await JSZip.loadAsync(file);

    const {
      found,
      duplicates
    } = findRequiredFiles(zip);

    validateFiles(found, duplicates);

    showStatus(
      "ZIP verified successfully.\n\n" +
      "All required files were found.\n\n" +
      "Starting conversion...",
      "info"
    );

    const outputPdf =
      await PDFLib.PDFDocument.create();

    outputPdf.setTitle(
      "fees1dd converted PDF"
    );

    outputPdf.setSubject(
      "Converted fees1dd textbook"
    );

    outputPdf.setCreator(
      "ZIP to PDF Converter"
    );

    outputPdf.setProducer(
      "ZIP to PDF Converter"
    );

    let totalPages = 0;


    /* =======================================================
       IMPORTANT:
       PROCESS EXACTLY IN REQUIRED_ORDER
       ======================================================= */

    for (
      let i = 0;
      i < REQUIRED_ORDER.length;
      i++
    ) {

      const filename =
        REQUIRED_ORDER[i];

      const item =
        found[filename];

      const progress =
        Math.round(
          ((i + 1) /
            REQUIRED_ORDER.length) *
          100
        );

      showStatus(
        "Converting...\n\n" +
        "File " +
        (i + 1) +
        " of " +
        REQUIRED_ORDER.length +
        "\n\n" +
        filename +
        "\n\n" +
        "Progress: " +
        progress +
        "%",
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
          "Could not read:\n" +
          filename +
          "\n\n" +
          (error.message || error)
        );
      }


      /* -----------------------------------------------------
         JPG
         ----------------------------------------------------- */

      if (
        filename.endsWith(".jpg")
      ) {

        try {

          await addJpgPage(
            outputPdf,
            bytes
          );

          totalPages++;

        } catch (error) {

          throw new Error(
            "Could not process:\n" +
            filename +
            "\n\n" +
            (error.message || error)
          );
        }

        continue;
      }


      /* -----------------------------------------------------
         PDF
         ----------------------------------------------------- */

      if (
        filename.endsWith(".pdf")
      ) {

        try {

          const pagesAdded =
            await appendPdf(
              outputPdf,
              bytes,
              PDFLib
            );

          totalPages += pagesAdded;

        } catch (error) {

          throw new Error(
            "Could not process:\n" +
            filename +
            "\n\n" +
            (error.message || error)
          );
        }

        continue;
      }


      throw new Error(
        "Unsupported file type:\n" +
        filename
      );
    }


    /* =======================================================
       SAVE
       ======================================================= */

    showStatus(
      "All files converted successfully.\n\n" +
      "Total PDF pages: " +
      totalPages +
      "\n\n" +
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

    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);
  }


  /* =========================================================
     ZIP FILE SELECTION
     ========================================================= */

  fileInput.addEventListener(
    "change",
    () => {

      const file =
        fileInput.files &&
        fileInput.files[0];

      selectedFile = file || null;

      /* IMPORTANT FIX:
         Enable Convert button after selecting ZIP.
      */

      convertBtn.disabled = true;

      if (!file) {

        fileInfo.textContent =
          "No ZIP file selected.";

        showStatus(
          "Please choose your ZIP file.",
          "warning"
        );

        return;
      }


      /* Check extension */

      if (
        !file.name
          .toLowerCase()
          .endsWith(".zip")
      ) {

        fileInfo.textContent =
          "❌ " +
          file.name +
          "\n\nPlease select a .zip file.";

        showStatus(
          "Please select a .zip file.",
          "error"
        );

        return;
      }


      /* Check size */

      if (file.size > MAX_FILE_SIZE) {

        fileInfo.textContent =
          "❌ File is too large.\n\n" +
          "Selected: " +
          formatBytes(file.size) +
          "\n" +
          "Maximum: 500 MB";

        showStatus(
          "The selected ZIP is larger than 500 MB.",
          "error"
        );

        return;
      }


      /* VALID FILE */

      fileInfo.textContent =
        "Selected: " +
        file.name +
        "\n" +
        "Size: " +
        formatBytes(file.size) +
        "\n\n" +
        "✅ Ready to convert.";

      /* THIS IS THE IMPORTANT LINE */
      convertBtn.disabled = false;

      showStatus(
        "ZIP file selected successfully.\n\n" +
        "The Convert ZIP to PDF button is ready.",
        "success"
      );
    }
  );


  /* =========================================================
     CONVERT BUTTON
     ========================================================= */

  convertBtn.addEventListener(
    "click",
    async (event) => {

      event.preventDefault();

      if (isConverting) {
        return;
      }

      if (!selectedFile) {

        showStatus(
          "Please choose a ZIP file first.",
          "warning"
        );

        return;
      }

      isConverting = true;

      convertBtn.disabled = true;
      convertBtn.textContent =
        "Converting...";

      try {

        const result =
          await convertZipToPdf(
            selectedFile
          );

        showStatus(
          "✅ CONVERSION COMPLETED\n\n" +
          "Total pages: " +
          result.pageCount +
          "\n\n" +
          "The files were merged in this exact order:\n\n" +
          REQUIRED_ORDER.join("\n") +
          "\n\n" +
          "Downloading fees1dd-converted.pdf...",
          "success"
        );

        downloadPdf(
          result.bytes
        );

      } catch (error) {

        console.error(
          "ZIP → PDF error:",
          error
        );

        showStatus(
          "❌ CONVERSION FAILED\n\n" +
          (error.message || error),
          "error"
        );

      } finally {

        isConverting = false;

        convertBtn.disabled =
          !selectedFile;

        convertBtn.textContent =
          "Convert ZIP to PDF";
      }
    }
  );


  /* =========================================================
     INITIAL STATE
     ========================================================= */

  convertBtn.disabled = true;

  fileInfo.textContent =
    "No ZIP file selected.";

  statusBox.style.display = "none";

  console.log(
    "ZIP → PDF Converter loaded successfully."
  );

})();
