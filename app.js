let session = null;
let originalImage = null;
let resultURL = null;


const MODELS = {

    quality: {
        onnx:
        "https://github.com/256-kb/upscaler/releases/download/Ai/real_esrgan_x4plus_quality.onnx",

        data:
        "https://github.com/256-kb/upscaler/releases/download/Ai/real_esrgan_x4plus_quality.data"
    },


    speed: {
        onnx:
        "https://github.com/256-kb/upscaler/releases/download/Ai/real_esrgan_x4plus_speed.onnx",

        data:
        "https://github.com/256-kb/upscaler/releases/download/Ai/real_esrgan_x4plus_speed.data"
    }

};



const imageInput = document.getElementById("imageInput");
const originalPreview = document.getElementById("originalPreview");
const resultPreview = document.getElementById("resultPreview");

const originalInfo = document.getElementById("originalInfo");
const resultInfo = document.getElementById("resultInfo");

const modelSelect = document.getElementById("modelSelect");
const scaleSelect = document.getElementById("scaleSelect");

const runButton = document.getElementById("runButton");
const saveButton = document.getElementById("saveButton");

const progressBar = document.getElementById("progressBar");
const status = document.getElementById("status");

const themeButton = document.getElementById("themeButton");





// Mode sombre

themeButton.onclick = () => {

    document.body.classList.toggle("dark");

};







// Import image

imageInput.onchange = () => {


    const file = imageInput.files[0];

    if(!file) return;


    const url = URL.createObjectURL(file);


    originalPreview.src = url;


    originalImage = new Image();

    originalImage.src = url;



    originalImage.onload = () => {

        originalInfo.textContent =
        `Résolution : ${originalImage.width} × ${originalImage.height}px`;

    };

};







// Chargement modèle

async function loadModel(type){


    const model = MODELS[type];


    status.textContent =
    "Chargement du modèle...";


    progressBar.value = 10;



    session = await ort.InferenceSession.create(

        model.onnx,

        {

            executionProviders:[

                "webgpu",

                "wasm"

            ],


            externalData:[

                {

                    path:model.data

                }

            ]

        }

    );



    progressBar.value = 40;


    console.log("Modèle chargé");


    return session;

}








// Lancement

runButton.onclick = async()=>{


    if(!originalImage){

        alert("Choisis une image.");

        return;

    }



    try {


        const type =
        modelSelect.value;



        await loadModel(type);



        status.textContent =
        "Préparation de l'image...";


        progressBar.value = 60;



        /*
        TODO :
        - convertir image en tensor
        - envoyer dans RealESRGAN
        - récupérer sortie ONNX
        - recréer PNG
        */



        status.textContent =
        "Modèle chargé. Moteur image à finaliser.";

        progressBar.value = 100;



    }


    catch(error){


        console.error(error);


        status.textContent =
        "Erreur de chargement du modèle.";


        alert(error);

    }


};









// Sauvegarde

saveButton.onclick = ()=>{


    if(!resultURL){

        alert("Aucune image disponible.");

        return;

    }



    const link =
    document.createElement("a");


    link.href = resultURL;


    link.download =
    "upscaled.png";


    link.click();


};