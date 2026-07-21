// =================================
// AI UPSCALER - UPSCALE WORKER
// RealESRGAN ONNX Runtime
// =================================


// Chargement ONNX Runtime dans le worker

importScripts(
"https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"
);



// Configuration ONNX

ort.env.wasm.wasmPaths =
"https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

ort.env.graphOptimizationLevel = "all";




// =================================
// MODELES
// =================================


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




// =================================
// VARIABLES
// =================================


let session = null;

let currentModel = null;




// =================================
// COMMUNICATION APP.JS
// =================================


function sendProgress(
    value,
    text
){

    postMessage({

type:"progress",

value:value,

text:text

});


postMessage({

type:"log",

text:text

});

}





function sendError(error){

    postMessage({

        type:"error",

        message:
        error.message || error

    });

}






// =================================
// CHARGEMENT MODELE
// =================================


async function loadModel(
    modelName
){


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



    sendProgress(
        25,
        "Modèle chargé : " + model.name
    );


}
// =================================
// IMAGE -> TENSOR
// =================================


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
        pixels[i * 4] / 255;


        tensorData[size + i] =
        pixels[i * 4 + 1] / 255;


        tensorData[size * 2 + i] =
        pixels[i * 4 + 2] / 255;

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







// =================================
// IA UPSCALE X4
// =================================


async function runAI(
    bitmap
){



    sendProgress(
        35,
        "Préparation image..."
    );



    const inputTensor =
    imageToTensor(
        bitmap
    );



    const feeds = {};



    feeds[
        session.inputNames[0]
    ] =
    inputTensor;



    sendProgress(
        60,
        "IA en cours..."
    );



    const results =
    await session.run(
        feeds
    );



    sendProgress(
        85,
        "Reconstruction..."
    );



    const output =
    results[
        session.outputNames[0]
    ];



    return output;


}






// =================================
// TENSOR -> IMAGE
// =================================


async function tensorToBlob(
    tensor
){



    const width =
    tensor.dims[3];


    const height =
    tensor.dims[2];



    const data =
    tensor.data;



    const canvas =
    new OffscreenCanvas(
        width,
        height
    );



    const ctx =
    canvas.getContext(
        "2d"
    );



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
        let i = 0;
        i < size;
        i++
    ){


        pixels[i * 4] =
        Math.max(
            0,
            Math.min(
                255,
                data[i] * 255
            )
        );


        pixels[i * 4 + 1] =
        Math.max(
            0,
            Math.min(
                255,
                data[size + i] * 255
            )
        );


        pixels[i * 4 + 2] =
        Math.max(
            0,
            Math.min(
                255,
                data[size * 2 + i] * 255
            )
        );


        pixels[i * 4 + 3] =
        255;


    }



    ctx.putImageData(
        imageData,
        0,
        0
    );



    return await canvas.convertToBlob({

        type:"image/png"

    });


}
// =================================
// RESIZE POUR x2 / x8
// =================================


async function resizeBlob(
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



    return await canvas.convertToBlob({

        type:"image/png"

    });


}





// =================================
// MESSAGE APP.JS
// =================================


self.onmessage =
async function(e){


    try{


        const data =
        e.data;



        if(
            data.type !== "start"
        )
            return;




        await loadModel(
            data.model
        );




        // IA x4 native

        const tensor =
        await runAI(
            data.image
        );



        let result =
        await tensorToBlob(
            tensor
        );



        const scale =
        Number(
            data.scale
        );




        // Adaptation x2 / x8


        if(
            scale === 2
        ){


            sendProgress(
                90,
                "Conversion x2..."
            );


            result =
            await resizeBlob(

                result,

                data.image.width * 2,

                data.image.height * 2

            );


        }





        if(
            scale === 8
        ){


            sendProgress(
                90,
                "Conversion x8..."
            );


            result =
            await resizeBlob(

                result,

                data.image.width * 8,

                data.image.height * 8

            );


        }





        sendProgress(
            100,
            "Terminé"
        );



        postMessage({

            type:"done",

            image:result

        });



    }


    catch(error){


        console.error(
            error
        );


        sendError(
            error
        );


    }


};