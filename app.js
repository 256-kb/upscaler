ort.env.wasm.wasmPaths =
"https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";


let session = null;
let originalImage = null;



const MODELS = {

    quality:
    "https://github.com/256-kb/upscaler/releases/download/Ai/real_esrgan_x4plus_quality.onnx",

    speed:
    "https://github.com/256-kb/upscaler/releases/download/Ai/real_esrgan_x4plus_speed.onnx"

};



const imageInput = document.getElementById("imageInput");
const originalPreview = document.getElementById("originalPreview");
const originalInfo = document.getElementById("originalInfo");

const modelSelect = document.getElementById("modelSelect");
const runButton = document.getElementById("runButton");

const progressBar = document.getElementById("progressBar");
const status = document.getElementById("status");

const themeButton = document.getElementById("themeButton");





themeButton.onclick = () => {

    document.body.classList.toggle("dark");

};






imageInput.onchange = () => {


    const file = imageInput.files[0];


    if (!file) return;


    const url = URL.createObjectURL(file);


    originalPreview.src = url;


    originalImage = new Image();


    originalImage.src = url;



    originalImage.onload = () => {


        originalInfo.textContent =
        `${originalImage.width} × ${originalImage.height}px`;


    };


};








async function loadModel(type){


    const url = MODELS[type];


    status.textContent =
    "Chargement du modèle...";


    progressBar.value = 20;



    session = await ort.InferenceSession.create(

        url,

        {

            executionProviders:[

                "wasm"

            ]

        }

    );



    progressBar.value = 100;


    status.textContent =
    "Modèle chargé avec succès";


    return session;

}







runButton.onclick = async()=>{


    if(!originalImage){

        alert("Ajoute une image");

        return;

    }



    try{


        await loadModel(
            modelSelect.value
        );


        alert(
        "Le modèle fonctionne !"
        );


    }


    catch(error){


        console.error(error);


        status.textContent =
        "Erreur de chargement";


        alert(
        "Erreur : " + error.message
        );


    }


};