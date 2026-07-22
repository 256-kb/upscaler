// ==========================================
// AI UPSCALER WORKER V3
// RealESRGAN + TILES LIVE PREVIEW
// ==========================================


importScripts(
"https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"
);


// ==========================================
// ONNX CONFIG
// ==========================================

ort.env.wasm.wasmPaths =
"https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

ort.env.graphOptimizationLevel = "all";

ort.env.wasm.numThreads =
navigator.hardwareConcurrency || 4;



// ==========================================
// MODELS
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


const TILE_SIZE = 512;



// ==========================================
// COMMUNICATION
// ==========================================


function sendLog(text){

postMessage({

type:"log",

text:text

});

}



function sendProgress(value,text){

postMessage({

type:"progress",

value:value,

text:text

});

sendLog(text);

}
// ==========================================
// CHARGEMENT MODELE
// ==========================================


async function loadModel(modelName){


    if(
        session &&
        currentModel === modelName
    ){

        return;

    }



    const model =
    MODELS[modelName];



    if(!model){

        throw new Error(
            "Modèle inconnu"
        );

    }



    sendProgress(
        5,
        "Chargement du modèle IA..."
    );



    session =
    await ort.InferenceSession.create(

        model.url,

        {

            executionProviders:[
                "wasm"
            ],

            graphOptimizationLevel:"all"

        }

    );



    currentModel =
    modelName;



    sendProgress(
        20,
        "Modèle prêt : " + model.name
    );


}



// ==========================================
// IMAGE DATA -> TENSOR
// ==========================================


function imageToTensor(imageData){


    const pixels =
    imageData.data;


    const width =
    imageData.width;


    const height =
    imageData.height;


    const size =
    width * height;



    const tensorData =
    new Float32Array(
        size * 3
    );



    for(
        let i = 0;
        i < size;
        i++
    ){

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

        [
            1,
            3,
            height,
            width
        ]

    );


}




// ==========================================
// EXTRAIRE UNE TUILE
// ==========================================


function extractTile(
    bitmap,
    x,
    y,
    size
){


    const width =
    Math.min(
        size,
        bitmap.width - x
    );


    const height =
    Math.min(
        size,
        bitmap.height - y
    );



    const canvas =
    new OffscreenCanvas(
        width,
        height
    );



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
// IA SUR UNE TUILE
// ==========================================


async function runTile(
    imageData
){


    const tensor =
    imageToTensor(
        imageData
    );



    const feeds = {};



    feeds[
        session.inputNames[0]
    ] =
    tensor;



    const results =
    await session.run(
        feeds
    );



    return results[
        session.outputNames[0]
    ];


}




// ==========================================
// TENSOR -> IMAGE DATA
// ==========================================


function tensorToImageData(
    tensor
){


    const width =
    tensor.dims[3];


    const height =
    tensor.dims[2];


    const data =
    tensor.data;



    const image =
    new ImageData(
        width,
        height
    );



    const pixels =
    image.data;



    const size =
    width * height;



    for(
        let i = 0;
        i < size;
        i++
    ){


        pixels[i*4] =
        Math.max(
            0,
            Math.min(
                255,
                data[i] * 255
            )
        );


        pixels[i*4+1] =
        Math.max(
            0,
            Math.min(
                255,
                data[size+i] * 255
            )
        );


        pixels[i*4+2] =
        Math.max(
            0,
            Math.min(
                255,
                data[size*2+i] * 255
            )
        );


        pixels[i*4+3] =
        255;


    }



    return image;


}




// ==========================================
// CREATION CANVAS RESULTAT
// ==========================================


function createOutputCanvas(
    bitmap
){


    return new OffscreenCanvas(

        bitmap.width * 4,

        bitmap.height * 4

    );


}



// ==========================================
// ENVOI APERCU LIVE VERS APP.JS
// ==========================================


async function sendPreview(
    canvas
){


    const blob =
    await canvas.convertToBlob({

        type:"image/png"

    });



    postMessage({

        type:"preview",

        image:blob

    });


}
// ==========================================
// UPSCALE PAR TUILES LIVE
// ==========================================


async function upscaleTilesLive(
    bitmap
){


    const canvas =
    createOutputCanvas(
        bitmap
    );


    const ctx =
    canvas.getContext(
        "2d"
    );



    const tilesX =
    Math.ceil(
        bitmap.width / TILE_SIZE
    );


    const tilesY =
    Math.ceil(
        bitmap.height / TILE_SIZE
    );



    const total =
    tilesX * tilesY;


    let current = 0;



    sendLog(
        "Nombre de tuiles : " + total
    );



    for(
        let y = 0;
        y < tilesY;
        y++
    ){


        for(
            let x = 0;
            x < tilesX;
            x++
        ){


            const posX =
            x * TILE_SIZE;


            const posY =
            y * TILE_SIZE;



            sendProgress(

                25 +
                Math.round(
                    current / total * 60
                ),

                "Traitement tuile " +
                (current + 1) +
                "/" +
                total

            );



            // Extraction

            const tile =
            extractTile(

                bitmap,

                posX,

                posY,

                TILE_SIZE

            );



            // IA

            const output =
            await runTile(
                tile
            );



            // Conversion image

            const image =
            tensorToImageData(
                output
            );



            const tileCanvas =
            new OffscreenCanvas(

                image.width,

                image.height

            );



            tileCanvas
            .getContext("2d")
            .putImageData(

                image,

                0,

                0

            );



            // Collage dans l'image finale

            ctx.drawImage(

                tileCanvas,

                posX * 4,

                posY * 4

            );



            current++;



            // Envoi aperçu après chaque tuile

            await sendPreview(
                canvas
            );



            // Laisse le navigateur respirer

            await new Promise(
                r => setTimeout(r,0)
            );


        }

    }



    return canvas;


}
// ==========================================
// CANVAS -> BLOB PNG
// ==========================================


async function canvasToBlob(
    canvas
){

    return await canvas.convertToBlob({

        type:"image/png",

        quality:1

    });

}




// ==========================================
// RESIZE FINAL
// ==========================================


async function resizeCanvas(
    blob,
    width,
    height
){


    const bitmap =
    await createImageBitmap(
        blob
    );



    const canvas =
    new OffscreenCanvas(

        width,

        height

    );



    const ctx =
    canvas.getContext(
        "2d"
    );



    ctx.imageSmoothingEnabled =
    true;



    ctx.drawImage(

        bitmap,

        0,

        0,

        width,

        height

    );



    return await canvasToBlob(
        canvas
    );


}





// ==========================================
// TRAITEMENT COMPLET
// ==========================================


async function processImage(
    bitmap,
    scale
){


    sendProgress(
        25,
        "Début du traitement par tuiles..."
    );



    const canvas =
    await upscaleTilesLive(
        bitmap
    );



    let result =
    await canvasToBlob(
        canvas
    );



    // x2

    if(scale === 2){


        sendProgress(
            90,
            "Conversion finale x2..."
        );



        result =
        await resizeCanvas(

            result,

            bitmap.width * 2,

            bitmap.height * 2

        );


    }



    // x8

    if(scale === 8){


        sendProgress(
            90,
            "Conversion finale x8..."
        );



        result =
        await resizeCanvas(

            result,

            bitmap.width * 8,

            bitmap.height * 8

        );


    }



    sendProgress(
        100,
        "Upscale terminé ✓"
    );



    return result;


}
// ==========================================
// COMMUNICATION APP.JS
// ==========================================


self.onmessage = async function(e){


    try{


        const data =
        e.data;



        if(data.type !== "start")
            return;



        sendProgress(
            2,
            "Préparation..."
        );



        await loadModel(
            data.model
        );



        sendLog(
            "Modèle utilisé : " +
            MODELS[data.model].name
        );



        sendLog(
            "Image : " +
            data.image.width +
            "x" +
            data.image.height
        );



        const result =
        await processImage(

            data.image,

            Number(
                data.scale
            )

        );



        postMessage({

            type:"done",

            image:result

        });



        sendLog(
            "Image finale envoyée."
        );


    }


    catch(err){


        console.error(err);


        postMessage({

            type:"error",

            message:
            err.message || err

        });


    }


};




// ==========================================
// INFO WORKER
// ==========================================


sendLog(
"Worker V3 chargé."
);


sendLog(
"Tuiles actives : " +
TILE_SIZE +
"x" +
TILE_SIZE
);