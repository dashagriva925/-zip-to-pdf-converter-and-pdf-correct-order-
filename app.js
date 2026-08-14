const $ = (id) => document.getElementById(id);

// ===============================
// GLOBAL VARIABLES
// ===============================
let zipFile = null;
let pdfFile = null;
let pdfBytes = null;

let pageData = [];
let autoOrder = [];
let manualOrder = [];

let mode = "auto";
let currentDownloadUrl = null;

// ===============================
// ELEMENTS
// ===============================
const zipInput = $("zipInput");
const zipInfo = $("zipInfo");
const zipConvert = $("zipConvert");
const zipStatus = $("zipStatus");
const zipDownload = $("zipDownload");

const pdfInput = $("pdfInput");
const pdfInfo = $("pdfInfo");
const analyzeBtn = $("analyzeBtn");
const organizerStatus = $("organizerStatus");

const autoPanel = $("autoPanel");
const manualPanel = $("manualPanel");

const autoList = $("autoList");
const manualList = $("manualList");

const recreateAuto = $("recreateAuto");
const recreateManual = $("recreateManual");

const organizerDownload = $("organizerDownload");

// ===============================
// HELPERS
// ===============================
function showMessage(element, text, type = "") {
    element.textContent = text;
    element.className = "status " + type;
}

function fileSize(bytes) {
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function getExtension(filename) {
    const index = filename.lastIndexOf(".");

    if (index === -1) {
        return "";
    }

    return filename.substring(index + 1).toLowerCase();
}

function escapeHTML(text) {
    return text.replace(/[&<>"']/g, function (character) {
        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return characters[character];
    });
}

// ===============================
// TAB SWITCHING
// ===============================
document.querySelectorAll(".tab").forEach((button) => {

    button.addEventListener("click", () => {

        document.querySelectorAll(".tab").forEach((tab) => {
            tab.classList.remove("active");
        });

        document.querySelectorAll(".page").forEach((page) => {
            page.classList.remove("active");
        });

        button.classList.add("active");

        const page = $(button.dataset.page);

        if (page) {
            page.classList.add("active");
        }
    });

});

// ===============================
// MODE SWITCHING
// ===============================
document.querySelectorAll(".mode").forEach((button) => {

    button.addEventListener("click", () => {

        document.querySelectorAll(".mode").forEach((modeButton) => {
            modeButton.classList.remove("active");
        });

        button.classList.add("active");

        mode = button.dataset.mode;

        if (pageData.length > 0) {

            if (mode === "auto") {
                autoPanel.classList.remove("hidden");
                manualPanel.classList.add("hidden");
            } else {
                autoPanel.classList.add("hidden");
                manualPanel.classList.remove("hidden");
            }
        }
    });

});

// ============================================================
// ZIP → PDF
// ============================================================

zipInput.addEventListener("change", () => {

    zipFile = zipInput.files[0];

    zipDownload.classList.add("hidden");

    if (!zipFile) {
        zipInfo.textContent = "No ZIP selected.";
        zipConvert.disabled = true;
        return;
    }

    if (!zipFile.name.toLowerCase().endsWith(".zip")) {

        zipFile = null;

        zipInfo.textContent = "Please select a ZIP file.";

        zipConvert.disabled = true;

        showMessage(
            zipStatus,
            "Only .zip files are supported.",
            "err"
        );

        return;
    }

    // Current
