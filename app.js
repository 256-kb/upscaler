// ================================
// UPSCALER IA - APP.JS
// PARTIE 1/8
// ================================


// Chargement ONNX Runtime Web

ort.env.wasm.wasmPaths =
"https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";


// Active les optimisations

ort.env.graphOptimizationLevel = "all";


// ================================
// MODELES
// ================================

const MODELS = {

    speed: {
        name: "RealESR-General x4v3",
        url:
        "https://github.com/256-kb/upscaler/releases/download/Ai/realesr-general-x4v3.onnx"
    },


    quality: {
        name: "RealESRGAN x4plus",
        url:
        "https://github.com/256-kb/upscaler/releases/download/Ai/realesrgan-x4plus.onnx"
    }

};



// ================================
// VARIABLES GLOBALES
// ================================


let session = null;

let currentModel = null;

let originalImage = null;

let originalBitmap = null;

let upscaledImage = null;

let isProcessing = false;



// ================================
// ELEMENTS HTML
// ================================


const imageInput =
document.getElementById("imageInput");


const originalPreview =
document.getElementById("originalPreview");


const resultPreview =
document.getElementById("resultPreview");


const runButton =
document.getElementById("runButton");


const saveButton =
document.getElementById("saveButton");


const modelSelect =
document.getElementById("modelSelect");


const scaleSelect =
document.getElementById("scaleSelect");


const progressBar =
document.getElementById("progressBar");


const statusText =
document.getElementById("status");



const originalInfo =
document.getElementById("originalInfo");


const resultInfo =
document.getElementById("resultInfo");



// ================================
// THEME
// ================================


const themeButton =
document.getElementById("themeButton");


if(themeButton){

    themeButton.onclick = () => {

        document.body.classList.toggle("dark");

    };

}





// ================================
// CHARGEMENT IMAGE
// ================================


imageInput.addEventListener(
"change",
async function(event){


    const file =
    event.target.files[0];


    if(!file)
        return;



    originalImage =
    await createImageBitmap(file);



    originalBitmap =
    originalImage;



    originalPreview.src =
    URL.createObjectURL(file);



    originalInfo.textContent =
    `${originalImage.width} × ${originalImage.height}px`;



    resultPreview.src = "";



    resultInfo.textContent =
    "";



    statusText.textContent =
    "Image chargée";


});