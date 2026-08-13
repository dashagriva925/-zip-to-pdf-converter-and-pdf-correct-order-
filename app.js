const zipInput = document.getElementById("zipInput");
const convertBtn = document.getElementById("convertBtn");
const fileInfo = document.getElementById("fileInfo");
const status = document.getElementById("status");
const downloadBtn = document.getElementById("downloadBtn");

let selectedZip = null;

zipInput.addEventListener("change", function () {
    selectedZip = zipInput.files[0];

    if (!selectedZip) {
        convertBtn.disabled = true;
        fileInfo.textContent = "";
        return;
    }

    fileInfo.innerHTML =
        "<b>Selected:</b> " +
        selectedZip.name +
        "<br><b>Size:</b> " +
        formatBytes(selectedZip.size);

    convertBtn.disabled = false;
    status.textContent = "";
    downloadBtn.style.display = "none";
});

convertBtn.addEventListener("click", async function () {

    if (!selectedZip) {
        status.textContent = "Please select a ZIP file first.";
        return;
    }

    convertBtn.disabled = true;
    downloadBtn.style.display = "none";

    try {

        status.textContent = "Reading ZIP file...";

        const zip = await JSZip.loadAsync(selectedZip);

        const files = [];

        zip.forEach((relativePath, entry) => {

            if (!entry.dir) {

                const lower = relativePath.toLowerCase();

                if (
                    lower.endsWith(".pdf") ||
                    lower.endsWith(".jpg") ||
                    lower.endsWith(".jpeg") ||
                    lower.endsWith(".png")
                ) {
                    files.push({
                        name: relativePath,
                        entry: entry
                    });
                }
            }
        });

        if (files.length === 0) {
            throw new Error(
                "No PDF, JPG, JPEG or PNG files were found inside the ZIP."
            );
        }

        // Sort files naturally by filename
        files.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, {
                numeric: true,
                sensitivity: "base"
            })
        );

        status.textContent =
            "Found " + files.length + " files. Creating PDF...";

        const outputPdf = await PDFLib.PDFDocument.create();

        let processed = 0;

        for (const file of files) {

            processed++;

            status.textContent =
                "Processing " +
                processed +
                " / " +
                files.length +
                ": " +
                file.name;

            const lower = file.name.toLowerCase();

            try {

                const bytes = await file.entry.async("uint8array");

                if (lower.endsWith(".pdf")) {

                    await addPdfToDocument(
                        outputPdf,
                        bytes
                    );

                } else {

                    await addImageToDocument(
                        outputPdf,
                        bytes,
                        lower
                    );
                }

            } catch (error) {

                console.error(
                    "Could not process:",
                    file.name,
                    error
                );

                throw new Error(
                    "Could not process:\n" +
                    file.name +
                    "\n\n" +
                    getErrorMessage(error)
                );
            }
        }

        status.textContent = "Creating final PDF...";

        const pdfBytes = await outputPdf.save({
            useObjectStreams: true
        });

        const blob = new Blob(
            [pdfBytes],
            { type: "application/pdf" }
        );

        const url = URL.createObjectURL(blob);

        downloadBtn.href = url;
        downloadBtn.download =
            removeExtension(selectedZip.name) +
            ".pdf";

        downloadBtn.textContent =
            "Download PDF";

        downloadBtn.style.display = "block";

        status.textContent =
            "✅ Conversion completed successfully!";

    } catch (error) {

        console.error(error);

        status.innerHTML =
            "❌ Error: " +
            escapeHtml(getErrorMessage(error))
                .replace(/\n/g, "<br>");

    } finally {

        convertBtn.disabled = false;
    }
});


/*
    Add PDF pages to the output PDF
*/
async function addPdfToDocument(outputPdf, bytes) {

    const sourcePdf =
        await PDFLib.PDFDocument.load(bytes, {
            ignoreEncryption: true
        });

    const pages =
        await outputPdf.copyPages(
            sourcePdf,
            sourcePdf.getPageIndices()
        );

    for (const page of pages) {
        outputPdf.addPage(page);
    }
}


/*
    Add JPG/JPEG/PNG as an A4 page
*/
async function addImageToDocument(
    outputPdf,
    bytes,
    filename
) {

    /*
        Instead of directly using pdf-lib's JPEG parser,
        decode the image in the browser first.

        This handles JPEG files that pdf-lib may reject.
    */

    const blob = new Blob(
        [bytes],
        { type: getImageMimeType(filename) }
    );

    const imageBitmap =
        await createImageBitmap(blob);

    const originalWidth =
        imageBitmap.width;

    const originalHeight =
        imageBitmap.height;

    /*
        A4 size in PDF points
        595.28 x 841.89
    */

    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;

    const MARGIN = 20;

    const availableWidth =
        A4_WIDTH - MARGIN * 2;

    const availableHeight =
        A4_HEIGHT - MARGIN * 2;

    const scale = Math.min(
        availableWidth / originalWidth,
        availableHeight / originalHeight
    );

    const finalWidth =
        originalWidth * scale;

    const finalHeight =
        originalHeight * scale;

    /*
        Draw the image on a canvas.

        This converts JPEG → PNG in the browser.
    */

    const canvas =
        document.createElement("canvas");

    canvas.width = originalWidth;
    canvas.height = originalHeight;

    const ctx =
        canvas.getContext("2d", {
            alpha: false
        });

    ctx.drawImage(
        imageBitmap,
        0,
        0
    );

    imageBitmap.close();

    const pngBlob =
        await new Promise((resolve, reject) => {

            canvas.toBlob(
                blob => {

                    if (blob) {
                        resolve(blob);
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

    const pngBytes =
        new Uint8Array(
            await pngBlob.arrayBuffer()
        );

    const image =
        await outputPdf.embedPng(pngBytes);

    /*
        Create A4 page
    */

    const page =
        outputPdf.addPage([
            A4_WIDTH,
            A4_HEIGHT
        ]);

    /*
        Center image on A4 page
    */

    const x =
        (A4_WIDTH - finalWidth) / 2;

    const y =
        (A4_HEIGHT - finalHeight) / 2;

    page.drawImage(image, {
        x: x,
        y: y,
        width: finalWidth,
        height: finalHeight
    });
}


/*
    Detect image type
*/
function getImageMimeType(filename) {

    const lower =
        filename.toLowerCase();

    if (lower.endsWith(".png")) {
        return "image/png";
    }

    return "image/jpeg";
}


/*
    Format file size
*/
function formatBytes(bytes) {

    if (bytes === 0) {
        return "0 Bytes";
    }

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
            (bytes /
                Math.pow(1024, i)
            ).toFixed(2)
        ) +
        " " +
        units[i]
    );
}


/*
    Remove file extension
*/
function removeExtension(filename) {

    return filename.replace(
        /\.[^/.]+$/,
        ""
    );
}


/*
    Get readable error
*/
function getErrorMessage(error) {

    if (!error) {
        return "Unknown error";
    }

    if (error.message) {
        return error.message;
    }

    return String(error);
}


/*
    Prevent HTML injection in error messages
*/
function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
        }
