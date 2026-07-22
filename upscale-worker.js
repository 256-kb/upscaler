// ==========================================
// AI UPSCALER WORKER V2
// RealESRGAN + Découpage en tuiles
// ==========================================

importScripts(
"https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"
);

// ==========================================
// CONFIG ONNX
// ==========================================

ort.env.wasm.wasmPaths =
"https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

ort.env.graphOptimizationLevel = "all";

ort.env.wasm.numThreads =
navigator.hardwareConcurrency || 4;

// ==========================================
// MODELES
// ==========================================

const MODELS = {

    speed:{

        name:"RealESR-General x4v3",

        url:
"https://huggingface.co/Intermery/Reales/resolve/main/realesr-general-x4v3.onnx"

    },

    quality:{

        name:"RealESRGAN x4plus",

        url:
"https://huggingface.co/Intermery/Reales/resolve/main/realesrgan-x4plus.onnx"

    }

};

// ==========================================
// VARIABLES
// ==========================================

let session = null;

let currentModel = null;

// Taille d'une tuile
// (512 fonctionne très bien sur téléphone)

const TILE_SIZE = 512;

// ==========================================
// OUTILS
// ==========================================

function log(text){

    postMessage({

        type:"log",

        text:text

    });

}

function progress(value,text){

    postMessage({

        type:"progress",

        value:value,

        text:text

    });

    log(text);

}

function error(err){

    postMessage({

        type:"error",

        message:err.message || err

    });

}

// ==========================================
// CHARGEMENT MODELE
// ==========================================

async function loadModel(modelName){

    if(session && currentModel===modelName){

        log("Le modèle est déjà chargé.");

        return;

    }

    const model = MODELS[modelName];

    progress(5,"Initialisation...");

    progress(10,"Téléchargement du modèle...");

    session =
    await ort.InferenceSession.create(

        model.url,

        {

            executionProviders:["wasm"],

            graphOptimizationLevel:"all"

        }

    );

    currentModel=modelName;

    progress(20,"Modèle prêt.");

}