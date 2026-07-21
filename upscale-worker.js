// ================================
// UPSCALE WORKER IA
// ONNX Runtime Web
// ================================


// Chargement ONNX dans le worker

importScripts(
"https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"
);



ort.env.wasm.wasmPaths =
"https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

ort.env.graphOptimizationLevel = "all";




// ================================
// MODELES
// ================================

const MODELS = {

    speed: {
        name: "RealESR-General x4v3",
        url:
        "https://huggingface.co/Intermery/Reales/resolve/main/realesr-general-x4v3.onnx"
    },


    quality: {
        name: "RealESRGAN x4plus",
        url:
        "https://huggingface.co/Intermery/Reales/resolve/main/realesrgan-x4plus.onnx"
    }

};



let session = null;
let currentModel = null;



// ================================
// MESSAGES VERS APP.JS
// ================================


function progress(value,text){

    postMessage({

        type:"progress",
        value:value,
        text:text

    });

}




function sendError(error){

    postMessage({

        type:"error",
        message:error.message

    });

}



// ================================
// CHARGEMENT MODELE
// ================================


async function loadModel(modelName){


    if(
        session &&
        currentModel === modelName
    ){

        return;

    }



    const model =
    MODELS[modelName];



    progress(
        10,
        "Préparation du modèle..."
    );



    session =
    await ort.InferenceSession.create(

        model.url,

        {

            executionProviders:[
                "wasm"
            ],

            graphOptimizationLevel:
            "all"

        }

    );



    currentModel =
    modelName;



    progress(
        25,
        "Modèle chargé"
    );


}
// ================================
// IMAGE -> TENSOR
// ================================


function imageToTensor(bitmap){


    const canvas =
    new OffscreenCanvas(
        bitmap.width,
        bitmap.height
    );


    const ctx =
    canvas.getContext("2d");


    ctx.drawImage(
        bitmap,
        0,
        0
    );



    const imageData =
    ctx.getImageData(
        0,
        0,
        bitmap.width,
        bitmap.height
    );



    const pixels =
    imageData.data;


    const width =
    bitmap.width;


    const height =
    bitmap.height;



    const size =
    width * height;



    const data =
    new Float32Array(
        size * 3
    );



    for(
        let i = 0;
        i < size;
        i++
    ){

        data[i] =
        pixels[i*4] / 255;


        data[size+i] =
        pixels[i*4+1] / 255;


        data[size*2+i] =
        pixels[i*4+2] / 255;

    }



    return new ort.Tensor(

        "float32",

        data,

        [
            1,
            3,
            height,
            width
        ]

    );

}





// ================================
// TENSOR -> IMAGE
// ================================


async function tensorToBlob(tensor){


    const data =
    tensor.data;


    const width =
    tensor.dims[3];


    const height =
    tensor.dims[2];



    const canvas =
    new OffscreenCanvas(
        width,
        height
    );


    const ctx =
    canvas.getContext("2d");



    const imageData =
    ctx.createImageData(
        width,
        height
    );



    const pixels =
    imageData.data;



    const size =
    width * height;



    for(
        let i=0;
        i<size;
        i++
    ){

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



    ctx.putImageData(
        imageData,
        0,
        0
    );



    const blob =
    await canvas.convertToBlob({

        type:"image/png"

    });



    return blob;

}





// ================================
// UPSCALE
// ================================


async function upscale(bitmap){


    progress(
        35,
        "Conversion image..."
    );



    const tensor =
    imageToTensor(
        bitmap
    );



    const feeds = {};

    feeds[
        session.inputNames[0]
    ] =
    tensor;



    progress(
        60,
        "IA en cours..."
    );



    const result =
    await session.run(
        feeds
    );



    progress(
        85,
        "Reconstruction..."
    );



    const output =
    result[
        session.outputNames[0]
    ];



    return await tensorToBlob(
        output
    );


}





// ================================
// RECEPTION APP.JS
// ================================


self.onmessage =
async function(event){


    try{


        const data =
        event.data;



        if(
            data.type === "start"
        ){



            await loadModel(
                data.model
            );



            const blob =
            await upscale(
                data.image
            );



            postMessage({

                type:"done",

                image:blob

            });



            progress(
                100,
                "Terminé"
            );


        }


    }


    catch(error){


        sendError(
            error
        );


    }


};