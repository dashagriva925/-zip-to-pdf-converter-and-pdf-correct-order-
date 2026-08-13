/* =========================================================
   ZIP → PDF CONVERTER
   Correct order for the fees1dd textbook

   Required order:
   fees1ps.pdf
   fees1cc.jpg
   fees101.pdf
   fees102.pdf
   fees103.pdf
   fees104.pdf
   fees105.pdf
   fees106.pdf
   fees107.pdf
   fees108.pdf
   fees109.pdf
   fees110.pdf
   fees111.pdf
   fees112.pdf
   fees113.pdf
   fees114.pdf
   fees1gl.pdf
   ========================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------
     SETTINGS
     --------------------------------------------------------- */

  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

  // EXACT required order
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

  const PDFLIB_URL =
    "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";

  const JSZIP_URL =
    "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";


  /* ---------------------------------------------------------
     FIND EXISTING HTML ELEMENTS
     --------------------------------------------------------- */

  function findFileInput() {
    const possibleIds = [
      "zipFile",
      "zipInput",
      "fileInput",
      "file",
      "uploadFile",
      "zip"
    ];

    for (const id of possibleIds) {
      const el = document.getElementById(id);

      if (el && el.tagName === "INPUT" && el.type === "file") {
        return el;
      }
    }

    // Fallback: first file input on the page
    return document.querySelector('input[type="file"]');
  }


  function findConvertButton() {
    const possibleIds = [
      "convertBtn",
      "convertButton",
      "convert",
      "convertZip",
      "convertZipBtn"
    ];

    for (const id of possibleIds) {
      const el = document.getElementById(id);

      if (el) {
        return el;
      }
    }

    // Fallback: find a button whose text contains Convert
    const buttons = document.querySelectorAll("button");

    for (const button of buttons) {
      const text = (button.textContent || "").trim().toLowerCase();

      if (
        text.includes("convert") &&
        text.includes("zip")
      ) {
        return button;
      }
    }

    for (const button of buttons) {
      const text = (button.textContent || "").trim().toLowerCase();

      if (text.includes("convert")) {
        return button;
      }
    }

    return null;
  }


  /* ---------------------------------------------------------
     CREATE STATUS AREA
     --------------------------------------------------------- */

  let statusBox = null;

  function createStatusBox() {
    if (statusBox) {
      return statusBox;
    }

    statusBox = document.createElement("div");

    statusBox.id = "conversionStatus";

    statusBox.style.marginTop = "12px";
    statusBox.style.padding = "12px";
    statusBox.style.borderRadius = "8px";
    statusBox.style.fontFamily =
      "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    statusBox.style.fontSize = "15px";
    statusBox.style.lineHeight = "1.5";
    statusBox.style.whiteSpace = "pre-wrap";
    statusBox.style.display = "none";

    const button = findConvertButton();

    if (button && button.parentNode) {
      button.parentNode.insertBefore(
        statusBox,
        button.nextSibling
      );
    } else {
      document.body.appendChild(statusBox);
    }

    return statusBox;
  }


  function showStatus(message, type = "info") {
    const box = createStatusBox();

    box.style.display = "block";

    if (type === "success") {
      box.style.background = "#e8f5e9";
      box.style.border = "1px solid #81c784";
      box.style.color = "#1b5e20";
    } else if (type === "error") {
      box.style.background = "#ffebee";
      box.style.border = "1px solid #ef9a9a";
      box.style.color = "#b71c1c";
    } else if (type === "warning") {
      box.style.background = "#fff8e1";
      box.style.border = "1px solid #ffcc80";
      box.style.color = "#e65100";
    } else {
      box.style.background = "#f1f5f9";
      box.style.border = "1px solid #cbd5e1";
      box.style.color = "#111827";
    }

    box.textContent = message;
  }


  /* ---------------------------------------------------------
     LOAD EXTERNAL LIBRARIES
     --------------------------------------------------------- */

  function loadScript(src, globalName) {
    return new Promise((resolve, reject) => {
      if (window[globalName]) {
        resolve(window[globalName]);
        return;
      }

      const existing = document.querySelector(
        `script[src="${src}"]`
      );

      if (existing) {
        existing.addEventListener("load", () => {
          if (window[globalName]) {
            resolve(window[globalName]);
          } else {
            reject(
              new Error(
                `${globalName} loaded but was not found.`
              )
            );
          }
        });

        existing.addEventListener("error", () => {
          reject(
            new Error(`Could not load ${globalName}.`)
          );
        });

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
              `${globalName} loaded but was not found.`
            )
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            `Could not load required library: ${globalName}`
          )
        );
      };

      document.head.appendChild(script);
    });
  }


  async function loadLibraries() {
    showStatus(
      "Loading PDF conversion libraries...",
      "info"
    );

    const [JSZip, PDFLib] = await Promise.all([
      loadScript(JSZIP_URL, "JSZip"),
      loadScript(PDFLIB_URL, "PDFLib")
    ]);

    return {
      JSZip,
      PDFLib
    };
  }


  /* ---------------------------------------------------------
     NORMALIZE ZIP PATH
     --------------------------------------------------------- */

  function getBaseName(path) {
    if (!path) {
      return "";
    }

    // Convert Windows path separators
    path = path.replace(/\\/g, "/");

    const parts = path.split("/");

    return parts[parts.length - 1].trim().toLowerCase();
  }


  /* ---------------------------------------------------------
     FIND FILES IN ZIP
     --------------------------------------------------------- */

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
          `${baseName}\n  - ${found[baseName].name}\n  - ${zipPath}`
        );

        return;
      }

      found[baseName] = {
        name: zipPath,
        entry
      };
    });

    return {
      found,
      duplicates
    };
  }


  /* ---------------------------------------------------------
     VALIDATE ZIP
     --------------------------------------------------------- */

  function validateFiles(found, duplicates) {
    const missing = [];

    for (const required of REQUIRED_ORDER) {
      if (!found[required]) {
        missing.push(required);
      }
    }

    if (duplicates.length > 0) {
      throw new Error(
        "Duplicate required files were found:\n\n" +
        duplicates.join("\n\n")
      );
    }

    if (missing.length > 0) {
      throw new Error(
        "The ZIP is missing these required files:\n\n" +
        missing.map((x) => "• " + x).join("\n") +
        "\n\nPlease check the original ZIP."
      );
    }
  }


  /* ---------------------------------------------------------
     GET JPEG SIZE
     --------------------------------------------------------- */

  function getJpegDimensions(bytes) {
    let offset = 0;

    // JPEG must start FF D8
    if (
      bytes.length < 2 ||
      bytes[0] !== 0xff ||
      bytes[1] !== 0xd8
    ) {
      throw new Error("The JPG file is not a valid JPEG image.");
    }

    offset = 2;

    while (offset < bytes.length) {
      // Find marker
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

      // Standalone markers
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

      // SOF markers
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
      "Could not determine the dimensions of fees1cc.jpg."
    );
  }


  /* ---------------------------------------------------------
     ADD JPG AS A PDF PAGE
     --------------------------------------------------------- */

  async function addJpgPage(pdfDoc, jpgBytes, PDFLib) {
    const image = await pdfDoc.embedJpg(jpgBytes);

    /*
      The source JPG is a page image.

      We use A4 dimensions because the source image has
      an A4-like portrait ratio (296 × 420).
    */

    const A4_WIDTH = 595.2756;
    const A4_HEIGHT = 841.8898;

    const page = pdfDoc.addPage([
      A4_WIDTH,
      A4_HEIGHT
    ]);

    const imageDimensions =
      getJpegDimensions(jpgBytes);

    const imageRatio =
      imageDimensions.width /
      imageDimensions.height;

    const pageRatio =
      A4_WIDTH / A4_HEIGHT;

    let drawWidth;
    let drawHeight;
    let x;
    let y;

    if (imageRatio > pageRatio) {
      drawWidth = A4_WIDTH;
      drawHeight = drawWidth / imageRatio;

      x = 0;
      y = (A4_HEIGHT - drawHeight) / 2;
    } else {
      drawHeight = A4_HEIGHT;
      drawWidth = drawHeight * imageRatio;

      x = (A4_WIDTH - drawWidth) / 2;
      y = 0;
    }

    page.drawImage(image, {
      x,
      y,
      width: drawWidth,
      height: drawHeight
    });

    return page;
  }


  /* ---------------------------------------------------------
     ADD PDF FILE TO FINAL DOCUMENT
     --------------------------------------------------------- */

  async function appendPdf(
    outputPdf,
    pdfBytes,
    PDFLib,
    filename,
    progressCallback
  ) {
    const sourcePdf =
      await PDFLib.PDFDocument.load(pdfBytes, {
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
          (_, index) => index
        )
      );

    pages.forEach((page) => {
      outputPdf.addPage(page);
    });

    if (progressCallback) {
      progressCallback(
        filename,
        pageCount
      );
    }

    return pageCount;
  }


  /* ---------------------------------------------------------
     CONVERT ZIP
     --------------------------------------------------------- */

  async function convertZipToPdf(file) {
    if (!file) {
      throw new Error(
        "Please choose a ZIP file first."
      );
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      throw new Error(
        "Please select a .zip file."
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `The ZIP file is larger than 500 MB.\n\n` +
        `Selected size: ${formatBytes(file.size)}\n` +
        `Maximum allowed: 500 MB`
      );
    }

    const { JSZip, PDFLib } =
      await loadLibraries();

    showStatus(
      "Reading ZIP file...",
      "info"
    );

    const zip =
      await JSZip.loadAsync(file);

    const {
      found,
      duplicates
    } = findRequiredFiles(zip);

    validateFiles(found, duplicates);

    /*
      Create one final PDF document.
    */

    const outputPdf =
      await PDFLib.PDFDocument.create();

    outputPdf.setTitle(
      "Exploring Society: India and Beyond"
    );

    outputPdf.setSubject(
      "Converted textbook PDF"
    );

    outputPdf.setCreator(
      "ZIP to PDF Converter"
    );

    outputPdf.setProducer(
      "ZIP to PDF Converter"
    );

    let totalPages = 0;

    /*
      PROCESS IN EXACT ORDER.

      This is the most important part of the fix.
    */

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
          ((i) / REQUIRED_ORDER.length) * 100
        );

      showStatus(
        `Converting ${i + 1} of ${REQUIRED_ORDER.length}\n` +
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

      /*
        JPG handling
      */

      if (
        filename.toLowerCase().endsWith(".jpg")
      ) {
        try {
          await addJpgPage(
            outputPdf,
            bytes,
            PDFLib
          );

          totalPages++;

          showStatus(
            `Added image page successfully:\n\n` +
            `${filename}\n\n` +
            `This JPG was converted into PDF page ${totalPages}.`,
            "info"
          );
        } catch (error) {
          throw new Error(
            `Could not process:\n${filename}\n\n` +
            `${error.message || error}`
          );
        }

        // Release reference
        bytes = null;

        continue;
      }

      /*
        PDF handling
      */

      if (
        filename.toLowerCase().endsWith(".pdf")
      ) {
        try {
          const pagesAdded =
            await appendPdf(
              outputPdf,
              bytes,
              PDFLib,
              filename,
              (name, count) => {
                totalPages += count;
              }
            );

          showStatus(
            `Added successfully:\n\n` +
            `${filename}\n` +
            `${pagesAdded} pages\n\n` +
            `Total pages so far: ${totalPages}`,
            "info"
          );
        } catch (error) {
          throw new Error(
            `Could not process:\n${filename}\n\n` +
            `${error.message || error}`
          );
        }

        // Release reference
        bytes = null;

        continue;
      }

      throw new Error(
        `Unsupported file type:\n${filename}`
      );
    }


    /* -------------------------------------------------------
       SAVE FINAL PDF
       ------------------------------------------------------- */

    showStatus(
      "All source files were processed.\n\n" +
      `Total pages: ${totalPages}\n\n` +
      "Creating the final PDF...",
      "info"
    );

    const finalBytes =
      await outputPdf.save({
        useObjectStreams: true,
        addDefaultPage: false
      });

    /*
      Expected source total:
      20 + 1 + 26 + 14 + 18 + 16 + 10 + 20 +
      20 + 12 + 12 + 14 + 10 + 10 + 12 + 14 + 12
      = 241
    */

    return {
      bytes: finalBytes,
      pageCount: totalPages
    };
  }


  /* ---------------------------------------------------------
     DOWNLOAD
     --------------------------------------------------------- */

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

    // Give the browser time to start the download
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);
  }


  /* ---------------------------------------------------------
     FORMAT FILE SIZE
     --------------------------------------------------------- */

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) {
      return "0 B";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(
        bytes /
        (1024 * 1024)
      ).toFixed(2)} MB`;
    }

    return `${(
      bytes /
      (1024 * 1024 * 1024)
    ).toFixed(2)} GB`;
  }


  /* ---------------------------------------------------------
     SHOW FILE INFORMATION
     --------------------------------------------------------- */

  function setupFileInformation(fileInput) {
    if (!fileInput) {
      return;
    }

    fileInput.addEventListener(
      "change",
      () => {
        const file =
          fileInput.files &&
          fileInput.files[0];

        if (!file) {
          return;
        }

        showStatus(
          `Selected: ${file.name}\n` +
          `Size: ${formatBytes(file.size)}\n\n` +
          "Ready to convert.",
          "info"
        );
      }
    );
  }


  /* ---------------------------------------------------------
     MAIN BUTTON
     --------------------------------------------------------- */

  function setupConverter() {
    const fileInput =
      findFileInput();

    const convertButton =
      findConvertButton();

    if (!fileInput) {
      console.error(
        "ZIP converter: file input not found."
      );

      showStatus(
        "Error: ZIP file input was not found.\n\n" +
        "Make sure your HTML contains an <input type=\"file\">.",
        "error"
      );

      return;
    }

    if (!convertButton) {
      console.error(
        "ZIP converter: convert button not found."
      );

      showStatus(
        "Error: Convert button was not found.",
        "error"
      );

      return;
    }

    setupFileInformation(fileInput);

    convertButton.addEventListener(
      "click",
      async (event) => {
        event.preventDefault();

        if (
          convertButton.dataset.busy === "true"
        ) {
          return;
        }

        const file =
          fileInput.files &&
          fileInput.files[0];

        if (!file) {
          showStatus(
            "Please choose your ZIP file first.",
            "warning"
          );

          return;
        }

        convertButton.dataset.busy =
          "true";

        const originalText =
          convertButton.textContent;

        convertButton.disabled = true;

        convertButton.textContent =
          "Converting...";

        try {
          const result =
            await convertZipToPdf(file);

          showStatus(
            `✅ Conversion completed successfully!\n\n` +
            `Pages created: ${result.pageCount}\n` +
            `Output: fees1dd-converted.pdf\n\n` +
            `The files were merged in the required order.`,
            "success"
          );

          downloadPdf(result.bytes);
        } catch (error) {
          console.error(
            "ZIP → PDF conversion error:",
            error
          );

          showStatus(
            `❌ Conversion failed\n\n` +
            `${error.message || error}`,
            "error"
          );
        } finally {
          convertButton.dataset.busy =
            "false";

          convertButton.disabled = false;

          convertButton.textContent =
            originalText || "Convert ZIP to PDF";
        }
      }
    );

    showStatus(
      "Choose your ZIP file, then tap “Convert ZIP to PDF”.",
      "info"
    );
  }


  /* ---------------------------------------------------------
     START
     --------------------------------------------------------- */

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      setupConverter
    );
  } else {
    setupConverter();
  }

})();
