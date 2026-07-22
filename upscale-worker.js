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
// ==========================================
// IMAGE -> TENSOR
// ==========================================

function imageToTensor(imageData){

    const pixels = imageData.data;

    const width = imageData.width;

    const height = imageData.height;

    const size = width * height;

    const tensorData =
    new Float32Array(size * 3);

    for(let i=0;i<size;i++){

        tensorData[i] =
        pixels[i*4] / 255;

        tensorData[size+i] =
        pixels[i*4+1] / 255;

        tensorData[size*2+i] =
        pixels[i*4+2] / 255;

    }

    return new ort.Tensor(

        "float32",

        tensorData,

        [1,3,height,width]

    );

}

// ==========================================
// EXTRACTION D'UNE TUILE
// ==========================================

function getTile(bitmap,x,y,size){

    const width =
    Math.min(size, bitmap.width-x);

    const height =
    Math.min(size, bitmap.height-y);

    const canvas =
    new OffscreenCanvas(width,height);

    const ctx =
    canvas.getContext("2d");

    ctx.drawImage(

        bitmap,

        x,
        y,
        width,
        height,

        0,
        0,
        width,
        height

    );

    return ctx.getImageData(

        0,
        0,
        width,
        height

    );

}

// ==========================================
// CREATION CANVAS FINAL
// ==========================================

function createResultCanvas(bitmap){

    return new OffscreenCanvas(

        bitmap.width * 4,

        bitmap.height * 4

    );

}
// ==========================================
// IA SUR UNE TUILE
// ==========================================

async function runTile(imageData){

    const tensor =
    imageToTensor(imageData);

    const feeds = {};

    feeds[
        session.inputNames[0]
    ] = tensor;

    const results =
    await session.run(feeds);

    return results[
        session.outputNames[0]
    ];

}

// ==========================================
// UPSCALE PAR TUILES
// ==========================================

async function upscaleTiles(bitmap){

    const canvas =
    createResultCanvas(bitmap);

    const ctx =
    canvas.getContext("2d");

    const tilesX =
    Math.ceil(bitmap.width / TILE_SIZE);

    const tilesY =
    Math.ceil(bitmap.height / TILE_SIZE);

    const total =
    tilesX * tilesY;

    let current = 0;

    log(
        "Découpage en " +
        total +
        " tuiles"
    );

    for(let ty=0;ty<tilesY;ty++){

        for(let tx=0;tx<tilesX;tx++){

            const x =
            tx * TILE_SIZE;

            const y =
            ty * TILE_SIZE;

            log(
                "Tuile " +
                (current+1) +
                "/" +
                total
            );

            const tile =
            getTile(
                bitmap,
                x,
                y,
                TILE_SIZE
            );

            const output =
            await runTile(tile);

            const outWidth =
            output.dims[3];

            const outHeight =
            output.dims[2];

            const img =
            ctx.createImageData(
                outWidth,
                outHeight
            );

            const pixels =
            img.data;

            const data =
            output.data;

            const size =
            outWidth * outHeight;

            for(let i=0;i<size;i++){

                pixels[i*4] =
                Math.max(
                    0,
                    Math.min(
                        255,
                        data[i]*255
                    )
                );

                pixels[i*4+1] =
                Math.max(
                    0,
                    Math.min(
                        255,
                        data[size+i]*255
                    )
                );

                pixels[i*4+2] =
                Math.max(
                    0,
                    Math.min(
                        255,
                        data[size*2+i]*255
                    )
                );

                pixels[i*4+3] =
                255;

            }

            const tileCanvas =
            new OffscreenCanvas(
                outWidth,
                outHeight
            );

            tileCanvas
            .getContext("2d")
            .putImageData(
                img,
                0,
                0
            );

            ctx.drawImage(

                tileCanvas,

                x*4,

                y*4

            );

            current++;

            progress(

                20 +
                Math.round(
                    current /
                    total *
                    70
                ),

                "Tuile " +
                current +
                "/" +
                total

            );

            // Libère un peu la mémoire
            await new Promise(r=>setTimeout(r,0));

        }

    }

    return canvas;

}