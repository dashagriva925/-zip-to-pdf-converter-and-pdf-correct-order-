// ZIP TO PDF CONVERTER - VERSION 2
// Supports PDF, JPG, JPEG and PNG inside ZIP files
// Processes files locally in the browser

const JSZIP_URL =
  "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";

const PDFLIB_URL =
  "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";

let selectedZip = null;


// ======================================================
// LOAD LIBRARIES
// ======================================================

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src = src;

    script.onload = resolve;

    script.onerror = () =>
      reject(new Error("Could not load required library."));

    document.head.appendChild(script);
  });
}


async function loadLibraries() {
  if (!window.JSZip) {
    await loadScript(JSZIP_URL);
  }

  if (!window.PDFLib) {
    await loadScript(PDFLIB_URL);
  }
}


// ======================================================
// FIND ELEMENTS
// ======================================================

const fileInput =
  document.querySelector("#zipInput") ||
  document.querySelector('input[type="file"]');

const convertButton =
  document.querySelector("#convertBtn") ||
  [...document.querySelectorAll("button")].find((button) =>
    button.textContent
      .toLowerCase()
      .includes("convert")
  );


// ======================================================
// FILE SELECTION
// ======================================================

if (fileInput) {
  fileInput.addEventListener("change", function () {

    const file = this.files && this.files[0];

    if (!file) return;

    selectedZip = file;

    clearResult();

    showSelectedFile(file);
  });
}


// ======================================================
// CONVERT BUTTON
// ======================================================

if (convertButton) {

  convertButton.addEventListener("click", async function () {

    if (!selectedZip) {
      showMessage(
        "Please select a ZIP file first.",
        true
      );

      return;
    }

    if (selectedZip.size > 500 * 1024 * 1024) {

      showMessage(
        "File is larger than the 500 MB limit.",
        true
      );

      return;
    }

    await convertZip(selectedZip);

  });
}


// ======================================================
// MAIN ZIP CONVERSION
// ======================================================

async function convertZip(zipFile) {

  try {

    setLoading(true);

    showMessage(
      "Loading converter..."
    );

    await loadLibraries();

    showMessage(
      "Opening ZIP file..."
    );

    const zip =
      await window.JSZip.loadAsync(zipFile);

    const entries = [];

    zip.forEach((path, entry) => {

      if (!entry.dir) {

        const lower =
          path.toLowerCase();

        if (
          lower.endsWith(".pdf") ||
          lower.endsWith(".jpg") ||
          lower.endsWith(".jpeg") ||
          lower.endsWith(".png")
        ) {

          entries.push({
            path: path,
            entry: entry
          });

        }

      }

    });


    if (entries.length === 0) {

      throw new Error(
        "No PDF, JPG, JPEG or PNG files were found inside the ZIP."
      );

    }


    // Sort files naturally
    entries.sort((a, b) =>
      a.path.localeCompare(
        b.path,
        undefined,
        {
          numeric: true,
          sensitivity: "base"
        }
      )
    );


    showMessage(
      `Found ${entries.length} supported file(s).`
    );


    const finalPdf =
      await window.PDFLib.PDFDocument.create();


    let count = 0;


    for (const item of entries) {

      count++;


      showMessage(
        `Converting ${count} of ${entries.length}: ${item.path}`
      );


      const data =
        await item.entry.async("uint8array");


      const lower =
        item.path.toLowerCase();


      if (lower.endsWith(".pdf")) {

        await addPDF(
          data,
          finalPdf
        );

      } else {

        await addImage(
          data,
          item.path,
          finalPdf
        );

      }


      // Give the phone browser a little time
      await new Promise(resolve =>
        setTimeout(resolve, 10)
      );

    }


    if (finalPdf.getPageCount() === 0) {

      throw new Error(
        "No pages were created."
      );

    }


    showMessage(
      "Creating final PDF..."
    );


    const pdfBytes =
      await finalPdf.save();


    const blob =
      new Blob(
        [pdfBytes],
        {
          type: "application/pdf"
        }
      );


    const url =
      URL.createObjectURL(blob);


    createDownloadButton(
      url,
      "converted.pdf"
    );


    showMessage(
      `Conversion complete! ${finalPdf.getPageCount()} page(s) created.`
    );


  } catch (error) {

    console.error(error);


    showMessage(
      "Conversion failed: " +
      (error.message || "Unknown error"),
      true
    );


  } finally {

    setLoading(false);

  }

}


// ======================================================
// ADD PDF
// ======================================================

async function addPDF(
  data,
  finalPdf
) {

  try {

    const sourcePdf =
      await window.PDFLib.PDFDocument.load(
        data
      );


    const pages =
      await finalPdf.copyPages(
        sourcePdf,
        sourcePdf.getPageIndices()
      );


    pages.forEach(page => {

      finalPdf.addPage(page);

    });


  } catch (error) {

    throw new Error(
      "A PDF inside the ZIP could not be opened. It may be corrupted or password-protected."
    );

  }

}


// ======================================================
// ADD IMAGE
// ======================================================

async function addImage(
  data,
  fileName,
  finalPdf
) {

  const blob =
    new Blob([data]);


  let imageElement;


  try {

    imageElement =
      await loadImage(blob);

  } catch (error) {

    throw new Error(
      `Could not read image: ${fileName}`
    );

  }


  const width =
    imageElement.naturalWidth;

  const height =
    imageElement.naturalHeight;


  if (!width || !height) {

    throw new Error(
      `Invalid image: ${fileName}`
    );

  }


  // A4 page in PDF points
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;

  const margin = 20;

  const availableWidth =
    A4_WIDTH - margin * 2;

  const availableHeight =
    A4_HEIGHT - margin * 2;


  const scale =
    Math.min(
      availableWidth / width,
      availableHeight / height
    );


  const drawWidth =
    width * scale;

  const drawHeight =
    height * scale;


  const x =
    (A4_WIDTH - drawWidth) / 2;

  const y =
    (A4_HEIGHT - drawHeight) / 2;


  const page =
    finalPdf.addPage([
      A4_WIDTH,
      A4_HEIGHT
    ]);


  // Create canvas
  const canvas =
    document.createElement("canvas");


  canvas.width = width;
  canvas.height = height;


  const context =
    canvas.getContext("2d");


  if (!context) {

    throw new Error(
      `Could not process image: ${fileName}`
    );

  }


  // White background
  context.fillStyle =
    "#ffffff";

  context.fillRect(
    0,
    0,
    width,
    height
  );


  // Draw image
  context.drawImage(
    imageElement,
    0,
    0,
    width,
    height
  );


  // Convert to JPEG
  const jpegBlob =
    await canvasToJPEG(canvas);


  const jpegBytes =
    new Uint8Array(
      await jpegBlob.arrayBuffer()
    );


  /*
    IMPORTANT:

    We convert the original image through
    the browser canvas first.

    This prevents the old:
    "SOI not found in JPEG"
    error.
  */

  const embeddedImage =
    await finalPdf.embedJpg(
      jpegBytes
    );


  page.drawImage(
    embeddedImage,
    {
      x: x,
      y: y,
      width: drawWidth,
      height: drawHeight
    }
  );


  // Release memory
  canvas.width = 1;
  canvas.height = 1;

}


// ======================================================
// LOAD IMAGE SAFELY
// ======================================================

function loadImage(blob) {

  return new Promise(
    (resolve, reject) => {

      const url =
        URL.createObjectURL(blob);


      const image =
        new Image();


      image.onload = () => {

        URL.revokeObjectURL(url);

        resolve(image);

      };


      image.onerror = () => {

        URL.revokeObjectURL(url);

        reject(
          new Error(
            "Image decoding failed."
          )
        );

      };


      image.src = url;

    }
  );

}


// ======================================================
// CANVAS TO JPEG
// ======================================================

function canvasToJPEG(canvas) {

  return new Promise(
    (resolve, reject) => {

      canvas.toBlob(
        function(blob) {

          if (!blob) {

            reject(
              new Error(
                "Could not convert image."
              )
            );

            return;
          }


          resolve(blob);

        },
        "image/jpeg",
        0.92
      );

    }
  );

}


// ======================================================
// SELECTED FILE
// ======================================================

function showSelectedFile(file) {

  let box =
    document.querySelector(
      "#selectedFile"
    );


  if (!box) {

    box =
      document.createElement("div");

    box.id =
      "selectedFile";

    box.style.marginTop =
      "15px";

    box.style.padding =
      "14px";

    box.style.borderRadius =
      "12px";

    box.style.background =
      "#f1f5f9";

    box.style.fontWeight =
      "600";


    if (fileInput) {

      fileInput.parentElement
        .appendChild(box);

    }

  }


  box.textContent =
    `${file.name} — ${formatBytes(file.size)}`;

}


// ======================================================
// DOWNLOAD BUTTON
// ======================================================

function createDownloadButton(
  url,
  fileName
) {

  const old =
    document.querySelector(
      "#downloadPdfButton"
    );


  if (old) {

    old.remove();

  }


  const button =
    document.createElement("a");


  button.id =
    "downloadPdfButton";


  button.href =
    url;


  button.download =
    fileName;


  button.textContent =
    "⬇ Download PDF";


  button.style.display =
    "block";


  button.style.width =
    "100%";


  button.style.boxSizing =
    "border-box";


  button.style.marginTop =
    "16px";


  button.style.padding =
    "16px";


  button.style.borderRadius =
    "12px";


  button.style.background =
    "#128276";


  button.style.color =
    "#ffffff";


  button.style.textAlign =
    "center";


  button.style.textDecoration =
    "none";


  button.style.fontSize =
    "18px";


  button.style.fontWeight =
    "700";


  if (convertButton) {

    convertButton.parentElement
      .appendChild(button);

  } else {

    document.body.appendChild(button);

  }

}


// ======================================================
// MESSAGE
// ======================================================

function showMessage(
  text,
  error = false
) {

  let box =
    document.querySelector(
      "#conversionMessage"
    );


  if (!box) {

    box =
      document.createElement("div");

    box.id =
      "conversionMessage";


    box.style.marginTop =
      "15px";


    box.style.padding =
      "15px";


    box.style.borderRadius =
      "12px";


    box.style.fontWeight =
      "600";


    if (convertButton) {

      convertButton.parentElement
        .appendChild(box);

    } else {

      document.body.appendChild(box);

    }

  }


  box.textContent =
    text;


  if (error) {

    box.style.background =
      "#fee2e2";

    box.style.color =
      "#991b1b";

  } else {

    box.style.background =
      "#dcfce7";

    box.style.color =
      "#166534";

  }

}


// ======================================================
// CLEAR RESULT
// ======================================================

function clearResult() {

  const message =
    document.querySelector(
      "#conversionMessage"
    );


  if (message) {

    message.remove();

  }


  const download =
    document.querySelector(
      "#downloadPdfButton"
    );


  if (download) {

    download.remove();

  }

}


// ======================================================
// LOADING
// ======================================================

function setLoading(
  loading
) {

  if (!convertButton) return;


  if (loading) {

    convertButton.disabled =
      true;

    convertButton.dataset.oldText =
      convertButton.textContent;

    convertButton.textContent =
      "⏳ Converting...";

    convertButton.style.opacity =
      "0.7";


  } else {

    convertButton.disabled =
      false;

    convertButton.textContent =
      convertButton.dataset.oldText ||
      "Convert ZIP to PDF";

    convertButton.style.opacity =
      "1";

  }

}


// ======================================================
// FILE SIZE
// ======================================================

function formatBytes(bytes) {

  if (bytes === 0)
    return "0 Bytes";


  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB"
  ];


  const i =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );


  return (
    parseFloat(
      (
        bytes /
        Math.pow(1024, i)
      ).toFixed(2)
    ) +
    " " +
    units[i]
  );

}
