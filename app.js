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
        "https://huggingface.co/Intermery/Reales/resolve/main/realesr-general-x4v3.onnx"
    },


    quality: {
        name: "RealESRGAN x4plus",
        url:
        "https://huggingface.co/Intermery/Reales/resolve/main/realesrgan-x4plus.onnx"
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
// ================================
// PARTIE 2/8
// CHARGEMENT MODELE ONNX
// ================================



async function loadModel(){



    const selected =
    modelSelect.value;



    const model =
    MODELS[selected];



    statusText.textContent =
    "Préparation du modèle : " + model.name;



    progressBar.value = 10;



    try{


        // Si le modèle est déjà chargé
        // on ne recharge pas

        if(
            session &&
            currentModel === selected
        ){

            statusText.textContent =
            "Modèle déjà chargé";

            progressBar.value = 100;

            return session;

        }





        let providers = [];



        // Test WebGPU

        if(
            "gpu" in navigator
        ){

            providers.push(
                "webgpu"
            );

        }



        // Toujours garder WASM en secours

        providers.push(
            "wasm"
        );




        progressBar.value = 30;



        statusText.textContent =
        "Téléchargement du modèle...";





        session =
        await ort.InferenceSession.create(

            model.url,

            {

                executionProviders:
                providers,


                graphOptimizationLevel:
                "all"

            }

        );





        currentModel =
        selected;



        progressBar.value = 100;



        statusText.textContent =
        "Modèle chargé : " + model.name;



        console.log(
            "Entrées :",
            session.inputNames
        );


        console.log(
            "Sorties :",
            session.outputNames
        );



        return session;



    }


    catch(error){


        console.error(
            "Erreur modèle :",
            error
        );



        statusText.textContent =
        "Erreur de chargement du modèle";



        progressBar.value = 0;



        throw error;


    }


}






// ================================
// BOUTON PREPARATION
// ================================


modelSelect.addEventListener(
"change",
async()=>{


    try{

        await loadModel();

    }

    catch(e){

        console.log(e);

    }


});
// ================================
// PARTIE 3/8
// IMAGE -> TENSOR
// ================================



function imageToTensor(bitmap){


    const canvas =
    document.createElement("canvas");


    const ctx =
    canvas.getContext(
        "2d",
        {
            willReadFrequently:true
        }
    );



    canvas.width =
    bitmap.width;


    canvas.height =
    bitmap.height;



    ctx.drawImage(
        bitmap,
        0,
        0
    );



    const imageData =
    ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );



    const pixels =
    imageData.data;



    const width =
    canvas.width;


    const height =
    canvas.height;



    /*
        ONNX veut :

        [1,3,H,W]

        donc :
        RRRR...
        GGGG...
        BBBB...
    */



    const tensorData =
    new Float32Array(
        1 *
        3 *
        width *
        height
    );



    let channelSize =
    width * height;



    for(
        let y = 0;
        y < height;
        y++
    ){


        for(
            let x = 0;
            x < width;
            x++
        ){


            const index =
            (y * width + x) * 4;



            const position =
            y * width + x;



            // Rouge

            tensorData[position] =
            pixels[index] / 255;



            // Vert

            tensorData[
                channelSize + position
            ] =
            pixels[index + 1] / 255;



            // Bleu

            tensorData[
                channelSize * 2 + position
            ] =
            pixels[index + 2] / 255;


        }

    }




    const tensor =
    new ort.Tensor(

        "float32",

        tensorData,

        [
            1,
            3,
            height,
            width
        ]

    );



    return tensor;

}
// ================================
// PARTIE 4/8
// INFERENCE MODELE
// ================================



async function upscaleImage(bitmap){


    if(!session){

    await loadModel();

}

if(!session){

    throw new Error("Le modèle n'a pas été chargé");

}



    statusText.textContent =
    "Préparation de l'image...";


    progressBar.value = 40;



    const inputTensor =
    imageToTensor(bitmap);



    statusText.textContent =
    "IA en cours de traitement...";


    progressBar.value = 60;




    const feeds = {};

feeds[session.inputNames[0]] = inputTensor;





    const results =
    await session.run(
        feeds
    );





    const output =
    results[
        session.outputNames[0]
    ];





    progressBar.value = 80;



    statusText.textContent =
    "Reconstruction de l'image...";



    return tensorToImage(
        output
    );

}
// ================================
// PARTIE 5/8
// LANCEMENT UPSCALE
// ================================



runButton.addEventListener(
"click",
async()=>{


    if(isProcessing)
        return;



    if(!originalBitmap){

        alert(
            "Choisis une image avant."
        );

        return;

    }



    try{


        isProcessing = true;


        runButton.disabled = true;



        progressBar.value = 5;



        statusText.textContent =
        "Chargement du modèle...";



        await loadModel();





        let resultCanvas =
await upscaleWithTiles(
    originalBitmap
);



        progressBar.value = 90;




        const scale =
        Number(
            scaleSelect.value
        );




        // RealESRGAN fait toujours x4
        // donc adaptation pour x2/x8


        if(scale === 2){


            resultCanvas =
            resizeCanvas(

                resultCanvas,

                originalBitmap.width * 2,

                originalBitmap.height * 2

            );


        }




        if(scale === 8){


            resultCanvas =
            resizeCanvas(

                resultCanvas,

                originalBitmap.width * 8,

                originalBitmap.height * 8

            );


        }





        upscaledImage =
        resultCanvas;




        resultPreview.src =
        resultCanvas.toDataURL(
            "image/png"
        );



        resultInfo.textContent =
        `${resultCanvas.width} × ${resultCanvas.height}px`;




        progressBar.value = 100;



        statusText.textContent =
        "Upscale terminé";



    }


    catch(error){


        console.error(
            error
        );


        statusText.textContent =
        "Erreur pendant l'upscale";


        alert(
            error.message
        );


    }


    finally{


        isProcessing = false;


        runButton.disabled = false;


    }



});







// ================================
// REDIMENSIONNEMENT
// ================================



function resizeCanvas(
    canvas,
    width,
    height
){


    const newCanvas =
    document.createElement(
        "canvas"
    );



    newCanvas.width =
    width;


    newCanvas.height =
    height;



    const ctx =
    newCanvas.getContext(
        "2d"
    );



    ctx.imageSmoothingEnabled =
    true;



    ctx.drawImage(

        canvas,

        0,
        0,

        width,
        height

    );



    return newCanvas;


}
// ================================
// PARTIE 6/8
// SAUVEGARDE + MEMOIRE
// ================================



// ================================
// TELECHARGEMENT IMAGE
// ================================


saveButton.addEventListener(
"click",
()=>{


    if(!upscaledImage){


        alert(
            "Aucune image à enregistrer."
        );


        return;

    }



    upscaledImage.toBlob(

        function(blob){


            const url =
            URL.createObjectURL(
                blob
            );



            const link =
            document.createElement(
                "a"
            );



            link.href =
            url;



            link.download =
            "upscaled_image.png";



            document.body.appendChild(
                link
            );



            link.click();



            document.body.removeChild(
                link
            );



            setTimeout(
                ()=>URL.revokeObjectURL(url),
                1000
            );


        },


        "image/png",

        1

    );


});






// ================================
// VERIFICATION TAILLE IMAGE
// ================================



function checkImageSize(bitmap){


    const megapixels =
    (
        bitmap.width *
        bitmap.height
    )
    /
    1000000;



    // Au-dessus de 16 MP
    // risque de crash mobile


    if(
        megapixels > 16
    ){


        return false;


    }


    return true;


}






// ================================
// NETTOYAGE MEMOIRE
// ================================



function clearMemory(){


    session = null;


    currentModel = null;


    upscaledImage = null;


    originalImage = null;


    originalBitmap = null;



    if(
        window.gc
    ){

        window.gc();

    }


}






// Nettoyage quand on quitte

window.addEventListener(
"beforeunload",
()=>{


    clearMemory();


});
// ================================
// PARTIE 7/8
// TILE PROCESSING
// ================================



const TILE_SIZE = 512;

const TILE_PADDING = 16;





async function upscaleWithTiles(bitmap){



    const width =
    bitmap.width;


    const height =
    bitmap.height;



    // Petite image :
    // traitement normal


    if(
        width <= TILE_SIZE &&
        height <= TILE_SIZE
    ){


        return await upscaleImage(
            bitmap
        );


    }






    statusText.textContent =
    "Découpage de l'image...";





    const finalCanvas =
    document.createElement(
        "canvas"
    );



    finalCanvas.width =
    width * 4;


    finalCanvas.height =
    height * 4;



    const finalCtx =
    finalCanvas.getContext(
        "2d"
    );





    const tilesX =
    Math.ceil(
        width / TILE_SIZE
    );



    const tilesY =
    Math.ceil(
        height / TILE_SIZE
    );



    let currentTile = 0;



    const totalTiles =
    tilesX * tilesY;





    for(
        let y = 0;
        y < height;
        y += TILE_SIZE
    ){


        for(
            let x = 0;
            x < width;
            x += TILE_SIZE
        ){



            currentTile++;



            statusText.textContent =
            `Traitement ${currentTile}/${totalTiles}`;



            progressBar.value =
            (
                currentTile /
                totalTiles
            )
            *
            90;






            const tileCanvas =
            document.createElement(
                "canvas"
            );



            tileCanvas.width =
            Math.min(
                TILE_SIZE,
                width - x
            );



            tileCanvas.height =
            Math.min(
                TILE_SIZE,
                height - y
            );



            const tileCtx =
            tileCanvas.getContext(
                "2d"
            );



            tileCtx.drawImage(

                bitmap,

                x,
                y,

                tileCanvas.width,
                tileCanvas.height,

                0,
                0,

                tileCanvas.width,
                tileCanvas.height

            );





            const tileBitmap =
            await createImageBitmap(
                tileCanvas
            );



            const result =
            await upscaleImage(
                tileBitmap
            );





            finalCtx.drawImage(

                result,

                x * 4,
                y * 4

            );



        }


    }




    return finalCanvas;


}







// Remplace l'ancien appel
// par celui-ci dans le bouton :
//
// await upscaleWithTiles(originalBitmap)
// ================================
// PARTIE 8/8
// FINALISATION APPLICATION
// ================================



// ================================
// DETECTION GPU
// ================================


async function detectHardware(){


    if(
        "gpu" in navigator
    ){

        console.log(
            "WebGPU disponible"
        );


        return "webgpu";

    }


    console.log(
        "Utilisation WASM"
    );


    return "wasm";

}




// ================================
// INITIALISATION
// ================================


window.addEventListener(
"load",
async()=>{


    const backend =
    await detectHardware();



    statusText.textContent =
    "Prêt - " + backend;



});






// ================================
// DRAG & DROP
// ================================



const dropZone =
document.body;



dropZone.addEventListener(
"dragover",
(e)=>{


    e.preventDefault();


});





dropZone.addEventListener(
"drop",
async(e)=>{


    e.preventDefault();



    const file =
    e.dataTransfer.files[0];



    if(
        !file ||
        !file.type.startsWith("image/")
    ){

        return;

    }



    const bitmap =
    await createImageBitmap(
        file
    );



    originalBitmap =
    bitmap;



    originalPreview.src =
    URL.createObjectURL(
        file
    );



    originalInfo.textContent =
    `${bitmap.width} × ${bitmap.height}px`;



    statusText.textContent =
    "Image chargée";


});






// ================================
// LIMITES MOBILE
// ================================



function mobileMemoryCheck(){



    const memory =
    navigator.deviceMemory || 4;



    if(
        memory <= 4
    ){


        console.log(
            "Mode économie mémoire"
        );


        return true;


    }


    return false;


}





// ================================
// ERREURS GLOBALES
// ================================



window.addEventListener(
"error",
(event)=>{


    console.error(
        "Erreur globale :",
        event.error
    );


});





window.addEventListener(
"unhandledrejection",
(event)=>{


    console.error(
        "Promesse rejetée :",
        event.reason
    );


});






// ================================
// RESET APPLICATION
// ================================



function resetApp(){


    session = null;

    currentModel = null;

    originalImage = null;

    originalBitmap = null;

    upscaledImage = null;



    if(originalPreview)
        originalPreview.src = "";



    if(resultPreview)
        resultPreview.src = "";



    statusText.textContent =
    "Application réinitialisée";


    progressBar.value = 0;


}