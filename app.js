here/* =========================================================
   ZIP → PDF CONVERTER
   FEES1DD VERSION

   Required order:

   1.  fees1ps.pdf
   2.  fees1cc.jpg
   3.  fees101.pdf
   4.  fees102.pdf
   5.  fees103.pdf
   6.  fees104.pdf
   7.  fees105.pdf
   8.  fees106.pdf
   9.  fees107.pdf
   10. fees108.pdf
   11. fees109.pdf
   12. fees110.pdf
   13. fees111.pdf
   14. fees112.pdf
   15. fees113.pdf
   16. fees114.pdf
   17. fees1gl.pdf

   IMPORTANT:
   - PDFs are copied without rebuilding their pages.
   - JPG/PNG images are placed onto A4 PDF pages.
   - fees1cc.jpg has a browser-decoding fallback because some
     JPEG files are rejected by pdf-lib even though browsers
     can display them.
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     SETTINGS
     ========================================================= */

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

  const PDFLIB_URL =
    "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";

  const JSZIP_URL =
    "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";


  /* =========================================================
     GLOBALS
     ========================================================= */

  let statusBox = null;
  let lastOutputBytes = null;


  /* =========================================================
     FIND FILE INPUT
     ========================================================= */

  function findFileInput() {
    const ids = [
      "zipInput",
      "zipFile",
      "fileInput",
      "file",
      "uploadFile",
      "zip"
    ];

    for (const id of ids) {
      const element = document.getElementById(id);

      if (
        element &&
        element.tagName === "INPUT" &&
        element.type === "file"
      ) {
        return element;
      }
    }

    return document.querySelector(
      'input[type="file"]'
    );
  }


  /* =========================================================
     FIND CONVERT BUTTON
     ========================================================= */

  function findConvertButton() {
    const ids = [
      "convertBtn",
      "convertButton",
      "convert",
      "convertZip",
      "convertZipBtn"
    ];

    for (const id of ids) {
      const element =
        document.getElementById(id);

      if (element) {
        return element;
      }
    }

    const buttons =
      document.querySelectorAll("button");

    for (const button of buttons) {
      const text =
        (button.textContent || "")
          .trim()
          .toLowerCase();

      if (
        text.includes("convert") &&
        text.includes("zip")
      ) {
        return button;
      }
    }

    for (const button of buttons) {
      const text =
        (button.textContent || "")
          .trim()
          .toLowerCase();

      if (text.includes("convert")) {
        return button;
      }
    }

    return null;
  }


  /* =========================================================
     FIND FILE INFO
     ========================================================= */

  function findFileInfo() {
    return document.getElementById(
      "fileInfo"
    );
  }


  /* =========================================================
     STATUS BOX
     ========================================================= */

  function createStatusBox() {
    if (statusBox) {
      return statusBox;
    }

    statusBox =
      document.getElementById(
        "conversionStatus"
      );

    if (!statusBox) {
      statusBox =
        document.createElement("div");

      statusBox.id =
        "conversionStatus";

      const button =
        findConvertButton();

      if (
        button &&
        button.parentNode
      ) {
        button.parentNode.insertBefore(
          statusBox,
          button.nextSibling
        );
      } else {
        document.body.appendChild(
          statusBox
        );
      }
    }

    statusBox.style.marginTop = "18px";
    statusBox.style.padding = "16px";
    statusBox.style.borderRadius = "14px";
    statusBox.style.fontFamily =
      "Arial, sans-serif";
    statusBox.style.fontSize = "16px";
    statusBox.style.lineHeight = "1.5";
    statusBox.style.whiteSpace = "pre-wrap";
    statusBox.style.wordBreak = "break-word";

    return statusBox;
  }


  function showStatus(
    message,
    type = "info"
  ) {
    const box =
      createStatusBox();

    box.style.display = "block";

    if (type === "success") {
      box.style.background =
        "#e8f5e9";

      box.style.border =
        "1px solid #81c784";

      box.style.color =
        "#1b5e20";
    }

    else if (type === "error") {
      box.style.background =
        "#ffebee";

      box.style.border =
        "1px solid #ef9a9a";

      box.style.color =
        "#b71c1c";
    }

    else if (type === "warning") {
      box.style.background =
        "#fff8e1";

      box.style.border =
        "1px solid #ffcc80";

      box.style.color =
        "#e65100";
    }

    else {
      box.style.background =
        "#f1f5f9";

      box.style.border =
        "1px solid #cbd5e1";

      box.style.color =
        "#111827";
    }

    box.textContent =
      message;
  }


  /* =========================================================
     FORMAT BYTES
     ========================================================= */

  function formatBytes(bytes) {
    if (
      !Number.isFinite(bytes)
    ) {
      return "0 B";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return (
        (bytes / 1024)
          .toFixed(2) +
        " KB"
      );
    }

    if (
      bytes <
      1024 *
      1024 *
      1024
    ) {
      return (
        (
          bytes /
          (1024 * 1024)
        ).toFixed(2) +
        " MB"
      );
    }

    return (
      (
        bytes /
        (1024 *
          1024 *
          1024)
      ).toFixed(2) +
      " GB"
    );
  }


  /* =========================================================
     LOAD EXTERNAL SCRIPT
     ========================================================= */

  function loadScript(
    src,
    globalName
  ) {
    return new Promise(
      (resolve, reject) => {
        if (
          window[globalName]
        ) {
          resolve(
            window[globalName]
          );
          return;
        }

        const existing =
          document.querySelector(
            `script[src="${src}"]`
          );

        if (existing) {
          existing.addEventListener(
            "load",
            () => {
              if (
                window[globalName]
              ) {
                resolve(
                  window[
                    globalName
                  ]
                );
              } else {
                reject(
                  new Error(
                    `${globalName} loaded but was not found.`
                  )
                );
              }
            },
            {
              once: true
            }
          );

          existing.addEventListener(
            "error",
            () => {
              reject(
                new Error(
                  `Could not load ${globalName}.`
                )
              );
            },
            {
              once: true
            }
          );

          return;
        }

        const script =
          document.createElement(
            "script"
          );

        script.src = src;
        script.async = true;

        script.onload = () => {
          if (
            window[globalName]
          ) {
            resolve(
              window[globalName]
            );
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
              `Could not load ${globalName}.`
            )
          );
        };

        document.head.appendChild(
          script
        );
      }
    );
  }


  /* =========================================================
     LOAD LIBRARIES
     ========================================================= */

  async function loadLibraries() {
    showStatus(
      "Loading conversion libraries...",
      "info"
    );

    const results =
      await Promise.all([
        loadScript(
          JSZIP_URL,
          "JSZip"
        ),
        loadScript(
          PDFLIB_URL,
          "PDFLib"
        )
      ]);

    return {
      JSZip: results[0],
      PDFLib: results[1]
    };
  }


  /* =========================================================
     GET BASE NAME
     ========================================================= */

  function getBaseName(path) {
    if (!path) {
      return "";
    }

    const normalized =
      path.replace(
        /\\/g,
        "/"
      );

    const parts =
      normalized.split("/");

    return (
      parts[parts.length - 1]
        .trim()
        .toLowerCase()
    );
  }


  /* =========================================================
     FIND REQUIRED FILES
     ========================================================= */

  function findRequiredFiles(zip) {
    const found = {};
    const duplicates = [];

    for (
      const zipPath of Object.keys(
        zip.files
      )
    ) {
      const entry =
        zip.files[zipPath];

      if (entry.dir) {
        continue;
      }

      const baseName =
        getBaseName(zipPath);

      if (
        !REQUIRED_ORDER.includes(
          baseName
        )
      ) {
        continue;
      }

      if (
        found[baseName]
      ) {
        duplicates.push(
          `${baseName}\n` +
          `  - ${found[baseName].name}\n` +
          `  - ${zipPath}`
        );

        continue;
      }

      found[baseName] = {
        name: zipPath,
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

  function validateFiles(
    found,
    duplicates
  ) {
    if (
      duplicates.length > 0
    ) {
      throw new Error(
        "Duplicate required files were found:\n\n" +
        duplicates.join(
          "\n\n"
        )
      );
    }

    const missing = [];

    for (
      const filename of
      REQUIRED_ORDER
    ) {
      if (
        !found[filename]
      ) {
        missing.push(
          filename
        );
      }
    }

    if (
      missing.length > 0
    ) {
      throw new Error(
        "The ZIP is missing these required files:\n\n" +
        missing
          .map(
            name =>
              "• " + name
          )
          .join("\n")
      );
    }
  }


  /* =========================================================
     CHECK IMAGE SIGNATURE
     ========================================================= */

  function hasJpegSignature(
    bytes
  ) {
    return (
      bytes &&
      bytes.length >= 2 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8
    );
  }


  function hasPngSignature(
    bytes
  ) {
    return (
      bytes &&
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }


  /* =========================================================
     NORMALIZE JPEG

     Some ZIPs contain a JPEG with extra bytes before FF D8.

     pdf-lib expects the JPEG SOI marker at byte zero.

     This function removes junk before SOI and after EOI.
     ========================================================= */

  function normalizeJpeg(
    bytes
  ) {
    if (
      hasJpegSignature(bytes)
    ) {
      return bytes;
    }

    let start = -1;

    for (
      let i = 0;
      i < bytes.length - 1;
      i++
    ) {
      if (
        bytes[i] === 0xff &&
        bytes[i + 1] === 0xd8
      ) {
        start = i;
        break;
      }
    }

    if (start < 0) {
      return bytes;
    }

    let end =
      bytes.length;

    for (
      let i = start + 2;
      i < bytes.length - 1;
      i++
    ) {
      if (
        bytes[i] === 0xff &&
        bytes[i + 1] === 0xd9
      ) {
        end = i + 2;
        break;
      }
    }

    return bytes.slice(
      start,
      end
    );
  }


  /* =========================================================
     BROWSER IMAGE DECODER

     This is the important fallback for fees1cc.jpg.

     If pdf-lib rejects the JPEG, the browser decodes it
     and a canvas turns it into a clean PNG.

     That PNG is then embedded into the PDF.
     ========================================================= */

  async function decodeImageToPng(
    bytes,
    mimeType
  ) {
    const blob =
      new Blob(
        [bytes],
        {
          type:
            mimeType ||
            "image/jpeg"
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    try {
      const image =
        await new Promise(
          (
            resolve,
            reject
          ) => {
            const img =
              new Image();

            img.onload = () => {
              resolve(img);
            };

            img.onerror = () => {
              reject(
                new Error(
                  "The browser could not decode this image."
                )
              );
            };

            img.src = url;
          }
        );

      const width =
        image.naturalWidth ||
        image.width;

      const height =
        image.naturalHeight ||
        image.height;

      if (
        !width ||
        !height
      ) {
        throw new Error(
          "Image dimensions could not be determined."
        );
      }

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width =
        width;

      canvas.height =
        height;

      const context =
        canvas.getContext(
          "2d"
        );

      if (!context) {
        throw new Error(
          "Could not create image canvas."
        );
      }

      /*
        White background prevents transparent PNGs from
        becoming black/transparent unexpectedly.
      */

      context.fillStyle =
        "#ffffff";

      context.fillRect(
        0,
        0,
        width,
        height
      );

      context.drawImage(
        image,
        0,
        0,
        width,
        height
      );

      const pngBlob =
        await new Promise(
          resolve =>
            canvas.toBlob(
              resolve,
              "image/png"
            )
        );

      if (!pngBlob) {
        throw new Error(
          "Could not create PNG from image."
        );
      }

      return {
        bytes:
          new Uint8Array(
            await pngBlob.arrayBuffer()
          ),
        width,
        height
      };
    }

    finally {
      URL.revokeObjectURL(
        url
      );
    }
  }


  /* =========================================================
     GET IMAGE DIMENSIONS
     ========================================================= */

  function getImageDimensions(
    bytes
  ) {
    /*
      JPEG
    */

    const jpeg =
      normalizeJpeg(bytes);

    if (
      hasJpegSignature(jpeg)
    ) {
      let offset = 2;

      while (
        offset <
        jpeg.length
      ) {
        while (
          offset <
            jpeg.length &&
          jpeg[offset] !==
            0xff
        ) {
          offset++;
        }

        while (
          offset <
            jpeg.length &&
          jpeg[offset] ===
            0xff
        ) {
          offset++;
        }

        if (
          offset >=
          jpeg.length
        ) {
          break;
        }

        const marker =
          jpeg[offset++];

        if (
          marker === 0xd8 ||
          marker === 0xd9 ||
          (
            marker >= 0xd0 &&
            marker <= 0xd7
          )
        ) {
          continue;
        }

        if (
          offset + 1 >=
          jpeg.length
        ) {
          break;
        }

        const length =
          (jpeg[offset] << 8) |
          jpeg[offset + 1];

        if (
          length < 2
        ) {
          break;
        }

        const isSOF =
          (
            marker >= 0xc0 &&
            marker <= 0xc3
          ) ||
          (
            marker >= 0xc5 &&
            marker <= 0xc7
          ) ||
          (
            marker >= 0xc9 &&
            marker <= 0xcb
          ) ||
          (
            marker >= 0xcd &&
            marker <= 0xcf
          );

        if (isSOF) {
          if (
            offset + 7 >=
            jpeg.length
          ) {
            break;
          }

          const height =
            (jpeg[offset + 3] << 8) |
            jpeg[offset + 4];

          const width =
            (jpeg[offset + 5] << 8) |
            jpeg[offset + 6];

          return {
            width,
            height
          };
        }

        offset +=
          length;
      }
    }

    /*
      PNG
    */

    if (
      hasPngSignature(bytes) &&
      bytes.length >= 24
    ) {
      const view =
        new DataView(
          bytes.buffer,
          bytes.byteOffset,
          bytes.byteLength
        );

      return {
        width:
          view.getUint32(
            16
          ),
        height:
          view.getUint32(
            20
          )
      };
    }

    return null;
  }


  /* =========================================================
     A4 PAGE CONSTANTS
     ========================================================= */

  const A4_WIDTH =
    595.2756;

  const A4_HEIGHT =
    841.8898;


  /* =========================================================
     ADD IMAGE PAGE
     ========================================================= */

  async function addImagePage(
    pdfDoc,
    bytes,
    PDFLib,
    filename
  ) {
    let image;
    let imageWidth;
    let imageHeight;

    const lower =
      filename.toLowerCase();

    /*
      ---------------------------------------------------------
      PNG
      ---------------------------------------------------------
    */

    if (
      lower.endsWith(".png") ||
      hasPngSignature(bytes)
    ) {
      try {
        image =
          await pdfDoc.embedPng(
            bytes
          );

        const dimensions =
          getImageDimensions(
            bytes
          );

        if (
          dimensions
        ) {
          imageWidth =
            dimensions.width;

          imageHeight =
            dimensions.height;
        }
      }

      catch (error) {
        /*
          Browser fallback
        */

        const converted =
          await decodeImageToPng(
            bytes,
            "image/png"
          );

        image =
          await pdfDoc.embedPng(
            converted.bytes
          );

        imageWidth =
          converted.width;

        imageHeight =
          converted.height;
      }
    }

    /*
      ---------------------------------------------------------
      JPEG
      ---------------------------------------------------------
    */

    else {
      const normalized =
        normalizeJpeg(
          bytes
        );

      try {
        image =
          await pdfDoc.embedJpg(
            normalized
          );

        const dimensions =
          getImageDimensions(
            normalized
          );

        if (
          dimensions
        ) {
          imageWidth =
            dimensions.width;

          imageHeight =
            dimensions.height;
        }
      }

      catch (jpegError) {
        console.warn(
          "Direct JPEG embedding failed for:",
          filename,
          jpegError
        );

        /*
          IMPORTANT FALLBACK

          Let the browser decode the JPEG.
        */

        const converted =
          await decodeImageToPng(
            bytes,
            "image/jpeg"
          );

        image =
          await pdfDoc.embedPng(
            converted.bytes
          );

        imageWidth =
          converted.width;

        imageHeight =
          converted.height;
      }
    }

    /*
      If dimensions are unavailable, use the embedded
      image dimensions supplied by pdf-lib.
    */

    if (
      !imageWidth ||
      !imageHeight
    ) {
      imageWidth =
        image.width;

      imageHeight =
        image.height;
    }

    const page =
      pdfDoc.addPage([
        A4_WIDTH,
        A4_HEIGHT
      ]);

    const imageRatio =
      imageWidth /
      imageHeight;

    const pageRatio =
      A4_WIDTH /
      A4_HEIGHT;

    let drawWidth;
    let drawHeight;
    let x;
    let y;

    /*
      Fit inside A4 while preserving aspect ratio.
    */

    if (
      imageRatio >
      pageRatio
    ) {
      drawWidth =
        A4_WIDTH;

      drawHeight =
        drawWidth /
        imageRatio;

      x = 0;

      y =
        (
          A4_HEIGHT -
          drawHeight
        ) / 2;
    }

    else {
      drawHeight =
        A4_HEIGHT;

      drawWidth =
        drawHeight *
        imageRatio;

      x =
        (
          A4_WIDTH -
          drawWidth
        ) / 2;

      y = 0;
    }

    page.drawImage(
      image,
      {
        x,
        y,
        width:
          drawWidth,
        height:
          drawHeight
      }
    );

    return page;
  }


  /* =========================================================
     APPEND PDF
     ========================================================= */

  async function appendPdf(
    outputPdf,
    pdfBytes,
    PDFLib,
    filename
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

    const indexes =
      Array.from(
        {
          length:
            pageCount
        },
        (_, index) =>
          index
      );

    const copiedPages =
      await outputPdf.copyPages(
        sourcePdf,
        indexes
      );

    for (
      const page of
      copiedPages
    ) {
      outputPdf.addPage(
        page
      );
    }

    return pageCount;
  }


  /* =========================================================
     CONVERT ZIP
     ========================================================= */

  async function convertZipToPdf(
    file
  ) {
    if (!file) {
      throw new Error(
        "Please choose a ZIP file first."
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

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      throw new Error(
        "The ZIP file is larger than 500 MB.\n\n" +
        "Selected: " +
        formatBytes(
          file.size
        ) +
        "\n" +
        "Maximum: 500 MB"
      );
    }

    const {
      JSZip,
      PDFLib
    } =
      await loadLibraries();

    showStatus(
      "Reading ZIP file...",
      "info"
    );

    const zip =
      await JSZip.loadAsync(
        file
      );

    const {
      found,
      duplicates
    } =
      findRequiredFiles(
        zip
      );

    validateFiles(
      found,
      duplicates
    );

    showStatus(
      "ZIP verified successfully.\n\n" +
      "All required files were found.\n\n" +
      "Starting conversion in the required order...",
      "info"
    );

    /*
      Create final PDF.
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


    /* =======================================================
       PROCESS EXACT ORDER
       ======================================================= */

    for (
      let i = 0;
      i <
      REQUIRED_ORDER.length;
      i++
    ) {
      const filename =
        REQUIRED_ORDER[i];

      const item =
        found[filename];

      const progress =
        Math.round(
          (
            i /
            REQUIRED_ORDER.length
          ) *
          100
        );

      showStatus(
        `Converting ${i + 1} of ${REQUIRED_ORDER.length}\n\n` +
        `${filename}\n\n` +
        `Progress: ${progress}%`,
        "info"
      );

      let bytes;

      try {
        bytes =
          await item.entry.async(
            "uint8array"
          );
      }

      catch (error) {
        throw new Error(
          `Could not read:\n${filename}\n\n` +
          `${error.message || error}`
        );
      }


      /* =====================================================
         PDF
         ===================================================== */

      if (
        filename.endsWith(".pdf")
      ) {
        try {
          const pagesAdded =
            await appendPdf(
              outputPdf,
              bytes,
              PDFLib,
              filename
            );

          totalPages +=
            pagesAdded;

          showStatus(
            `✓ Added ${filename}\n\n` +
            `Pages in this file: ${pagesAdded}\n` +
            `Total pages so far: ${totalPages}`,
            "info"
          );
        }

        catch (error) {
          throw new Error(
            `Could not process:\n${filename}\n\n` +
            `${error.message || error}`
          );
        }
      }


      /* =====================================================
         IMAGE
         ===================================================== */

      else if (
        filename.endsWith(".jpg") ||
        filename.endsWith(".jpeg") ||
        filename.endsWith(".png")
      ) {
        try {
          await addImagePage(
            outputPdf,
            bytes,
            PDFLib,
            filename
          );

          totalPages++;

          showStatus(
            `✓ Added image successfully\n\n` +
            `${filename}\n\n` +
            `Image became PDF page ${totalPages}.`,
            "info"
          );
        }

        catch (error) {
          throw new Error(
            `Could not process:\n${filename}\n\n` +
            `${error.message || error}`
          );
        }
      }


      /* =====================================================
         UNKNOWN
         ===================================================== */

      else {
        throw new Error(
          `Unsupported file type:\n${filename}`
        );
      }

      /*
        Release reference.
      */

      bytes = null;
    }


    /* =======================================================
       FINAL SAVE
       ======================================================= */

    showStatus(
      "All files have been processed.\n\n" +
      `Total PDF pages created: ${totalPages}\n\n` +
      "Building final PDF...",
      "info"
    );

    const finalBytes =
      await outputPdf.save({
        useObjectStreams: true,
        addDefaultPage: false
      });

    return {
      bytes:
        finalBytes,
      pageCount:
        totalPages
    };
  }


  /* =========================================================
     DOWNLOAD
     ========================================================= */

  function downloadPdf(
    bytes
  ) {
    const blob =
      new Blob(
        [bytes],
        {
          type:
            "application/pdf"
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href =
      url;

    link.download =
      "fees1dd-converted.pdf";

    link.style.display =
      "none";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    setTimeout(
      () => {
        URL.revokeObjectURL(
          url
        );
      },
      15000
    );
  }


  /* =========================================================
     FILE INFORMATION
     ========================================================= */

  function updateFileInfo(
    file
  ) {
    const info =
      findFileInfo();

    if (!info) {
      return;
    }

    if (!file) {
      info.textContent =
        "No ZIP file selected.";

      return;
    }

    info.textContent =
      `Selected: ${file.name}\n` +
      `Size: ${formatBytes(file.size)}\n\n` +
      `✅ Ready to convert.`;
  }


  /* =========================================================
     FILE INPUT
     ========================================================= */

  function setupFileInput(
    fileInput,
    convertButton
  ) {
    fileInput.addEventListener(
      "change",
      () => {
        const file =
          fileInput.files &&
          fileInput.files[0];

        updateFileInfo(
          file
        );

        if (!file) {
          convertButton.disabled =
            true;

          return;
        }

        if (
          !file.name
            .toLowerCase()
            .endsWith(".zip")
        ) {
          convertButton.disabled =
            true;

          showStatus(
            "Please choose a .zip file.",
            "warning"
          );

          return;
        }

        if (
          file.size >
          MAX_FILE_SIZE
        ) {
          convertButton.disabled =
            true;

          showStatus(
            "This ZIP is larger than 500 MB.",
            "warning"
          );

          return;
        }

        /*
          THIS IS IMPORTANT:
          Enable Convert as soon as a valid ZIP is selected.
        */

        convertButton.disabled =
          false;

        showStatus(
          "✅ ZIP selected successfully.\n\n" +
          `File: ${file.name}\n` +
          `Size: ${formatBytes(file.size)}\n\n` +
          "Tap “Convert ZIP to PDF”.",
          "info"
        );
      }
    );
  }


  /* =========================================================
     CONVERTER SETUP
     ========================================================= */

  function setupConverter() {
    const fileInput =
      findFileInput();

    const convertButton =
      findConvertButton();

    if (!fileInput) {
      console.error(
        "ZIP Converter: file input not found."
      );

      showStatus(
        "❌ ZIP file input was not found.",
        "error"
      );

      return;
    }

    if (!convertButton) {
      console.error(
        "ZIP Converter: convert button not found."
      );

      showStatus(
        "❌ Convert button was not found.",
        "error"
      );

      return;
    }


    /*
      Make sure the button exists visually.
    */

    convertButton.style.display =
      "block";

    convertButton.style.width =
      "100%";

    convertButton.style.minHeight =
      "58px";


    setupFileInput(
      fileInput,
      convertButton
    );


    /* =======================================================
       CONVERT BUTTON
       ======================================================= */

    convertButton.addEventListener(
      "click",
      async event => {
        event.preventDefault();

        if (
          convertButton.dataset.busy ===
          "true"
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

        convertButton.disabled =
          true;

        convertButton.textContent =
          "Converting...";


        try {
          lastOutputBytes =
            null;

          const result =
            await convertZipToPdf(
              file
            );

          lastOutputBytes =
            result.bytes;

          showStatus(
            `✅ CONVERSION COMPLETED\n\n` +
            `Total PDF pages: ${result.pageCount}\n\n` +
            `Output: fees1dd-converted.pdf\n\n` +
            `The files were merged in the required order.`,
            "success"
          );

          downloadPdf(
            result.bytes
          );
        }

        catch (error) {
          console.error(
            "ZIP → PDF conversion error:",
            error
          );

          showStatus(
            `❌ CONVERSION FAILED\n\n` +
            `${error.message || error}`,
            "error"
          );
        }

        finally {
          convertButton.dataset.busy =
            "false";

          convertButton.disabled =
            false;

          convertButton.textContent =
            originalText ||
            "Convert ZIP to PDF";
        }
      }
    );


    /*
      Initial state.
    */

    const currentFile =
      fileInput.files &&
      fileInput.files[0];

    if (currentFile) {
      updateFileInfo(
        currentFile
      );

      convertButton.disabled =
        false;
    }

    else {
      convertButton.disabled =
        true;
    }
  }


  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      setupConverter,
      {
        once: true
      }
    );
  }

  else {
    setupConverter();
  }

})();
