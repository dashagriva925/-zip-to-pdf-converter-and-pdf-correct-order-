// ZIP to PDF Converter - app.js

const zipInput = document.getElementById("zipInput");
const convertBtn = document.getElementById("convertBtn");
const fileInfo = document.getElementById("fileInfo");
const status = document.getElementById("status");
const downloadBtn = document.getElementById("downloadBtn");

// Make sure the Convert button is visible
if (convertBtn) {
    convertBtn.style.display = "block";
    convertBtn.style.visibility = "visible";
    convertBtn.style.opacity = "1";
    convertBtn.style.marginTop = "20px";
    convertBtn.style.padding = "14px 25px";
    convertBtn.style.cursor = "pointer";
}

// When ZIP file is selected
zipInput.addEventListener("change", function () {

    const file = zipInput.files[0];

    if (!file) {
        convertBtn.disabled = true;
        fileInfo.textContent = "";
        return;
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
        fileInfo.textContent = "Please select a ZIP file.";
        convertBtn.disabled = true;
        return;
    }

    const sizeMB = (file.size / 1024 / 1024).toFixed(2);

    fileInfo.innerHTML =
        "<strong>Selected:</strong> " +
        file.name +
        "<br>" +
        "<strong>Size:</strong> " +
        sizeMB +
        " MB";

    // Enable button
    convertBtn.disabled = false;

    convertBtn.style.display = "block";
    convertBtn.style.visibility = "visible";

    status.textContent = "";
    downloadBtn.style.display = "none";
});


// Convert button
convertBtn.addEventListener("click", async function () {

    const zipFile = zipInput.files[0];

    if (!zipFile) {
        status.textContent = "Please select a ZIP file first.";
        return;
    }

    convertBtn.disabled = true;

    status.textContent = "Reading ZIP file...";

    try {

        const zip = await JSZip.loadAsync(zipFile);

        // Get all files
        let files = Object.values(zip.files);

        // Ignore folders
        files = files.filter(file => !file.dir);

        // Supported files
        files = files.filter(file => {

            const name = file.name.toLowerCase();

            return (
                name.endsWith(".pdf") ||
                name.endsWith(".jpg") ||
                name.endsWith(".jpeg") ||
                name.endsWith(".png")
            );
        });

        if (files.length === 0) {
            throw new Error(
                "No PDF, JPG, JPEG or PNG files were found inside the ZIP."
            );
        }

        // Sort files by filename
        files.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, {
                numeric: true,
                sensitivity: "base"
            })
        );

        status.textContent =
            "Found " + files.length + " file(s). Creating PDF...";

        // Create final PDF
        const finalPdf = await PDFLib.PDFDocument.create();

        let processed = 0;

        for (const file of files) {

            const fileName = file.name.toLowerCase();

            try {

                // --------------------------------
                // PDF
                // --------------------------------

                if (fileName.endsWith(".pdf")) {

                    const pdfBytes = await file.async("uint8array");

                    const sourcePdf =
                        await PDFLib.PDFDocument.load(pdfBytes);

                    const pageIndexes =
                        sourcePdf.getPageIndices();

                    const copiedPages =
                        await finalPdf.copyPages(
                            sourcePdf,
                            pageIndexes
                        );

                    copiedPages.forEach(page => {
                        finalPdf.addPage(page);
                    });
                }


                // --------------------------------
                // JPG / JPEG
                // --------------------------------

                else if (
                    fileName.endsWith(".jpg") ||
                    fileName.endsWith(".jpeg")
                ) {

                    const imageBytes =
                        await file.async("uint8array");

                    const image =
                        await finalPdf.embedJpg(imageBytes);

                    await addImagePage(
                        finalPdf,
                        image
                    );
                }


                // --------------------------------
                // PNG
                // --------------------------------

                else if (fileName.endsWith(".png")) {

                    const imageBytes =
                        await file.async("uint8array");

                    const image =
                        await finalPdf.embedPng(imageBytes);

                    await addImagePage(
                        finalPdf,
                        image
                    );
                }

            } catch (fileError) {

                console.error(
                    "Error processing:",
                    file.name,
                    fileError
                );

                throw new Error(
                    "Could not process: " + file.name
                );
            }

            processed++;

            status.textContent =
                "Processing " +
                processed +
                " of " +
                files.length +
                "...";
        }


        // Check if PDF has pages
        if (finalPdf.getPageCount() === 0) {
            throw new Error(
                "No pages could be created from the ZIP."
            );
        }


        // Save PDF
        status.textContent = "Finalizing PDF...";

        const pdfBytes =
            await finalPdf.save();


        // Create download URL
        const blob = new Blob(
            [pdfBytes],
            {
                type: "application/pdf"
            }
        );

        const url =
            URL.createObjectURL(blob);


        // Filename
        const originalName =
            zipFile.name.replace(/\.zip$/i, "");

        const outputName =
            originalName + "_converted.pdf";


        // Download button
        downloadBtn.href = url;
        downloadBtn.download = outputName;
        downloadBtn.textContent =
            "Download PDF";

        downloadBtn.style.display = "inline-block";
        downloadBtn.style.visibility = "visible";

        status.textContent =
            "✅ Conversion complete! " +
            finalPdf.getPageCount() +
            " page(s) created.";


        // Re-enable conversion
        convertBtn.disabled = false;


    } catch (error) {

        console.error(error);

        status.textContent =
            "❌ Error: " +
            error.message;

        convertBtn.disabled = false;
        convertBtn.style.display = "block";
    }
});


// ========================================
// Add image to an A4 PDF page
// ========================================

async function addImagePage(pdf, image) {

    // A4 size in PDF points
    const pageWidth = 595.28;
    const pageHeight = 841.89;

    const margin = 30;

    const maxWidth =
        pageWidth - margin * 2;

    const maxHeight =
        pageHeight - margin * 2;


    const imageWidth =
        image.width;

    const imageHeight =
        image.height;


    // Calculate scale
    const scale =
        Math.min(
            maxWidth / imageWidth,
            maxHeight / imageHeight
        );


    const drawWidth =
        imageWidth * scale;

    const drawHeight =
        imageHeight * scale;


    // Center image
    const x =
        (pageWidth - drawWidth) / 2;

    const y =
        (pageHeight - drawHeight) / 2;


    // Create A4 page
    const page =
        pdf.addPage([
            pageWidth,
            pageHeight
        ]);


    // Draw image
    page.drawImage(
        image,
        {
            x: x,
            y: y,
            width: drawWidth,
            height: drawHeight
        }
    );
                                      }
