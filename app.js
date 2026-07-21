let session = null;
let sourceImage = null;
let resultURL = null;


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



// MODE SOMBRE

themeButton.onclick = () => {

    document.body.classList.toggle("dark");

};





// CHARGEMENT IMAGE


imageInput.onchange = () => {


    const file = imageInput.files[0];


    if(!file) return;


    const url = URL.createObjectURL(file);


    originalPreview.src = url;


    sourceImage = new Image();


    sourceImage.src = url;



    sourceImage.onload = () => {


        originalInfo.textContent =
        `${sourceImage.width} × ${sourceImage.height} pixels`;

    };


};






// CHARGEMENT MODELE


async function loadModel(){


    let folder = modelSelect.value;


    let modelPath;


    if(folder === "quality"){

        modelPath =
        "models/quality/real_esrgan_x4plus.onnx";

    }

    else {

        modelPath =
        "models/speed/real_esrgan_x4plus.onnx";

    }



    status.textContent = "Chargement du modèle...";

    progressBar.value = 10;



    session = await ort.InferenceSession.create(

        modelPath,

        {

            executionProviders:[
                "webgpu",
                "wasm"
            ]

        }

    );


    progressBar.value = 30;


    return session;


}






// LANCEMENT UPSCALE


runButton.onclick = async()=>{


    if(!sourceImage){

        alert("Ajoute une image.");

        return;

    }



    try{


        await loadModel();


        status.textContent =
        "Préparation de l'image...";


        progressBar.value = 50;



        /*
        
        ICI :
        - image vers tensor
        - inference ONNX
        - reconstruction PNG
        
        */


        status.textContent =
        "Moteur RealESRGAN à connecter";


        progressBar.value = 100;



    }


    catch(error){


        console.error(error);


        status.textContent =
        "Erreur de chargement";


        alert(
        "Impossible de charger le modèle."
        );


    }


};







// SAUVEGARDE


saveButton.onclick = ()=>{


    if(!resultURL){

        alert("Aucune image générée.");

        return;

    }


    const a = document.createElement("a");


    a.href = resultURL;


    a.download =
    "upscaled.png";


    a.click();


};