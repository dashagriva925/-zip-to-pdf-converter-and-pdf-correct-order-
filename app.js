// ZIP to PDF Converter - Version 2
// Processes everything locally in the browser.
// Supports:
// - PDF files
// - JPG / JPEG files
// - PNG files
// - Large images are converted through Canvas to avoid JPEG parser errors
// - Files are sorted naturally by filename
// - Images are fitted onto A4 pages

(() => {
  "use strict";

  // ------------------------------------------------------------
  // Find elements from index.html
  // ------------------------------------------------------------

  const zipInput =
    document.getElementById("zipInput") ||
    document.getElementById("fileInput") ||
    document.querySelector('input[type="file"]');

  const convertBtn =
    document.getElementById("convertBtn") ||
    document.getElementById("convertButton") ||
    document.querySelector("button");

  const fileInfo =
    document.getElementById("fileInfo") ||
    document.getElementById("selectedFile");

  const statusBox =
    document.getElementById("status") ||
    document.getElementById("statusBox") ||
    document.getElementById("message");

  let selectedZip = null;

  // ------------------------------------------------------------
  // Safety check
  // ------------------------------------------------------------

  if (!zipInput) {
    console.error("ZIP input element was not found.");
    return;
  }

  // ------------------------------------------------------------
  // Utility: show status
  // ------------------------------------------------------------

  function showStatus(message, type = "info") {
    if (!statusBox) {
      console.log(message);
      return;
    }

    statusBox.textContent = message;

    statusBox.className = "status " + type;

    if (type === "error") {
      statusBox.style.background = "#fff0f0";
      statusBox.style.color = "#9b1c31";
      statusBox.style.border = "1px solid #f3c2c9";
    } else if (type === "success") {
      statusBox.style.background = "#eafaf1";
      statusBox.style.color = "#166534";
      statusBox.style.border = "1px solid #b7e4c7";
    } else {
      statusBox.style.background = "#eef8ff";
      statusBox.style.color = "#075985";
      statusBox.style.border = "1px solid #bae6fd";
    }

    statusBox.style.padding = "18px";
    statusBox.style.borderRadius = "18px";
    statusBox.style.marginTop = "15px";
    statusBox.style.fontWeight = "600";
  }

  // ------------------------------------------------------------
  // Utility: format file size
  // ------------------------------------------------------------

  function formatBytes(bytes) {
    if (!bytes) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return (
      (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2) +
      " " +
      units[i]
    );
  }

  // ------------------------------------------------------------
  // Natural sorting
  // Example:
  // page1.pdf
  // page2.pdf
  // page10.pdf
  // ------------------------------------------------------------

  function naturalSort(a, b) {
    return a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base"
    });
  }

  // ------------------------------------------------------------
  // File selection
  // ------------------------------------------------------------

  zipInput.addEventListener("change", function () {
    if (!this.files || !this.files.length) {
      selectedZip = null;

      if (fileInfo) {
        fileInfo.textContent = "";
      }

      return;
    }

    const file = this.files[0];

    if (!file.name.toLowerCase().endsWith(".zip")) {
      selectedZip = null;

      showStatus("Please select a .zip file.", "error");

      if (fileInfo) {
        fileInfo.textContent = "";
      }

      return;
    }

    // 500 MB limit
    const maxSize = 500 * 1024 * 1024;

    if (file.size > maxSize) {
      selectedZip = null;

      showStatus(
        "This ZIP is larger than the 500 MB limit.",
        "error"
      );

      if (fileInfo) {
        fileInfo.textContent = "";
      }

      return;
    }

    selectedZip = file;

    if (fileInfo) {
      fileInfo.textContent =
        file.name + " — " + formatBytes(file.size);
    }

    showStatus(
      "ZIP selected. Tap “Convert ZIP to PDF”.",
      "success"
    );
  });

  // ------------------------------------------------------------
  // Check file type
  // ------------------------------------------------------------

  function getFileType(filename) {
    const name = filename.toLowerCase();

    if (name.endsWith(".pdf")) {
      return "pdf";
    }

    if (
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg")
    ) {
      return "jpeg";
    }

    if (name.endsWith(".png")) {
      return "png";
    }

    return null;
  }

  // ------------------------------------------------------------
  // Convert image to PNG using browser Canvas
  //
  // This is the important fix for:
  // "SOI not found in JPEG"
  //
  // We DO NOT directly pass the JPEG to pdf-lib.
  // Instead:
  //
  // JPEG -> Browser Image Decoder -> Canvas -> PNG
  //
  // Then pdf-lib embeds the PNG.
  // ------------------------------------------------------------

  async function imageToPngBytes(blob) {
    let bitmap = null;

    try {
      bitmap = await createImageBitmap(blob);

      let width = bitmap.width;
      let height = bitmap.height;

      if (!width || !height) {
        throw new Error("Image has invalid dimensions.");
      }

      // A4 at approximately 150 DPI
      const A4_WIDTH = 1240;
      const A4_HEIGHT = 1754;

      // Fit image inside A4 while keeping aspect ratio
      const scale = Math.min(
        A4_WIDTH / width,
        A4_HEIGHT / height,
        1
      );

      const drawWidth = Math.max(
        1,
        Math.round(width * scale)
      );

      const drawHeight = Math.max(
        1,
        Math.round(height * scale)
      );

      const canvas = document.createElement("canvas");

      canvas.width = drawWidth;
      canvas.height = drawHeight;

      const ctx = canvas.getContext("2d", {
        alpha: false
      });

      if (!ctx) {
        throw new Error("Canvas is not supported.");
      }

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        0,
        0,
        drawWidth,
        drawHeight
      );

      ctx.drawImage(
        bitmap,
        0,
        0,
        drawWidth,
        drawHeight
      );

      const pngBlob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          blobResult => {
            if (blobResult) {
              resolve(blobResult);
            } else {
              reject(
                new Error(
                  "Could not convert image to PNG."
                )
              );
            }
          },
          "image/png"
        );
      });

      const arrayBuffer =
        await pngBlob.arrayBuffer();

      return {
        bytes: new Uint8Array(arrayBuffer),
        width: drawWidth,
        height: drawHeight
      };
    } finally {
      if (bitmap) {
        bitmap.close();
      }
    }
  }

  // ------------------------------------------------------------
  // Add image as A4 PDF page
  // ------------------------------------------------------------

  async function addImagePage(pdfDoc, blob) {
    const imageData =
      await imageToPngBytes(blob);

    const pngImage =
      await pdfDoc.embedPng(
        imageData.bytes
      );

    // A4 dimensions in PDF points
    const PAGE_WIDTH = 595.28;
    const PAGE_HEIGHT = 841.89;

    const page =
      pdfDoc.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT
      ]);

    const imgWidth =
      imageData.width;

    const imgHeight =
      imageData.height;

    const scale = Math.min(
      (PAGE_WIDTH - 40) / imgWidth,
      (PAGE_HEIGHT - 40) / imgHeight
    );

    const drawWidth =
      imgWidth * scale;

    const drawHeight =
      imgHeight * scale;

    const x =
      (PAGE_WIDTH - drawWidth) / 2;

    const y =
      (PAGE_HEIGHT - drawHeight) / 2;

    page.drawImage(pngImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight
    });
  }

  // ------------------------------------------------------------
  // Add PDF pages
  // ------------------------------------------------------------

  async function addPdfPages(
    outputPdf,
    pdfBytes,
    filename
  ) {
    try {
      const sourcePdf =
        await PDFLib.PDFDocument.load(
          pdfBytes,
          {
            ignoreEncryption: false
          }
        );

      const pages =
        await outputPdf.copyPages(
          sourcePdf,
          sourcePdf.getPageIndices()
        );

      for (const page of pages) {
        outputPdf.addPage(page);
      }

      return pages.length;
    } catch (error) {
      console.error(
        "PDF error:",
        filename,
        error
      );

      throw new Error(
        "Could not read PDF: " +
          filename +
          ". It may be password-protected or corrupted."
      );
    }
  }

  // ------------------------------------------------------------
  // Main conversion
  // ------------------------------------------------------------

  async function convertZipToPdf() {
    if (!selectedZip) {
      showStatus(
        "Please select a ZIP file first.",
        "error"
      );

      return;
    }

    // Make sure required libraries exist
    if (typeof JSZip === "undefined") {
      showStatus(
        "JSZip library is missing. Check index.html.",
        "error"
      );

      return;
    }

    if (
      typeof PDFLib === "undefined" ||
      !PDFLib.PDFDocument
    ) {
      showStatus(
        "PDF library is missing. Check index.html.",
        "error"
      );

      return;
    }

    try {
      if (convertBtn) {
        convertBtn.disabled = true;
        convertBtn.style.opacity = "0.6";
        convertBtn.textContent =
          "Converting...";
      }

      showStatus(
        "Reading ZIP file...",
        "info"
      );

      const zipBuffer =
        await selectedZip.arrayBuffer();

      const zip =
        await JSZip.loadAsync(
          zipBuffer,
          {
            checkCRC32: false
          }
        );

      const entries = [];

      // --------------------------------------------------------
      // Collect supported files
      // --------------------------------------------------------

      Object.keys(zip.files).forEach(
        filename => {
          const entry = zip.files[filename];

          if (entry.dir) {
            return;
          }

          const type =
            getFileType(filename);

          if (!type) {
            return;
          }

          entries.push({
            filename,
            type,
            entry
          });
        }
      );

      // Sort files by filename
      entries.sort((a, b) =>
        naturalSort(
          a.filename,
          b.filename
        )
      );

      if (!entries.length) {
        throw new Error(
          "No PDF, JPG, JPEG or PNG files were found inside this ZIP."
        );
      }

      showStatus(
        "Found " +
          entries.length +
          " supported file" +
          (entries.length === 1
            ? ""
            : "s") +
          ". Starting conversion...",
        "info"
      );

      // --------------------------------------------------------
      // Create output PDF
      // --------------------------------------------------------

      const outputPdf =
        await PDFLib.PDFDocument.create();

      // Better compatibility
      outputPdf.setTitle(
        "Converted ZIP to PDF"
      );

      outputPdf.setSubject(
        "PDF created locally from ZIP files"
      );

      outputPdf.setCreator(
        "ZIP to PDF Converter"
      );

      // --------------------------------------------------------
      // Process every file
      // --------------------------------------------------------

      let processed = 0;

      for (const item of entries) {
        processed++;

        showStatus(
          "Converting " +
            processed +
            " of " +
            entries.length +
            ": " +
            item.filename,
          "info"
        );

        if (item.type === "pdf") {
          const pdfBytes =
            await item.entry.async(
              "uint8array"
            );

          await addPdfPages(
            outputPdf,
            pdfBytes,
            item.filename
          );
        }

        else if (
          item.type === "jpeg" ||
          item.type === "png"
        ) {
          const blob =
            await item.entry.async(
              "blob"
            );

          await addImagePage(
            outputPdf,
            blob
          );
        }
      }

      // --------------------------------------------------------
      // Save final PDF
      // --------------------------------------------------------

      showStatus(
        "Creating final PDF...",
        "info"
      );

      const finalBytes =
        await outputPdf.save({
          useObjectStreams: true
        });

      const finalBlob =
        new Blob(
          [finalBytes],
          {
            type: "application/pdf"
          }
        );

      const url =
        URL.createObjectURL(
          finalBlob
        );

      const downloadName =
        selectedZip.name.replace(
          /\.zip$/i,
          ""
        ) +
        "-converted.pdf";

      // --------------------------------------------------------
      // Download
      // --------------------------------------------------------

      const link =
        document.createElement("a");

      link.href = url;
      link.download = downloadName;

      document.body.appendChild(link);

      link.click();

      link.remove();

      // Keep URL alive briefly for Android
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);

      showStatus(
        "Conversion complete! Your PDF has been downloaded.",
        "success"
      );

      if (convertBtn) {
        convertBtn.textContent =
          "Convert ZIP to PDF";
      }

    } catch (error) {
      console.error(
        "ZIP to PDF conversion failed:",
        error
      );

      let message =
        error && error.message
          ? error.message
          : "Unknown conversion error.";

      showStatus(
        "Conversion failed: " +
          message +
          " Try a smaller ZIP or check that the PDFs/images are not corrupted.",
        "error"
      );

      if (convertBtn) {
        convertBtn.textContent =
          "Convert ZIP to PDF";
      }
    } finally {
      if (convertBtn) {
        convertBtn.disabled = false;
        convertBtn.style.opacity = "1";
      }
    }
  }

  // ------------------------------------------------------------
  // Convert button
  // ------------------------------------------------------------

  if (convertBtn) {
    convertBtn.addEventListener(
      "click",
      convertZipToPdf
    );
  }

  console.log(
    "ZIP to PDF Converter Version 2 loaded successfully."
  );
})();
