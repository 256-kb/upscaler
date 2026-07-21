ort.env.wasm.wasmPaths =
"https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";



let session = null;
let originalImage = null;



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


    if(!file) return;


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


    const model = MODELS[type];


    status.textContent =
    "Téléchargement du modèle...";


    progressBar.value = 20;



    try {


        session = await ort.InferenceSession.create(

            model.onnx,

            {

                executionProviders:[

                    "webgpu",

                    "wasm"

                ],


                externalData:[

                    {

                        path: model.data

                    }

                ]

            }

        );


        progressBar.value = 100;


        status.textContent =
        "Modèle chargé";


        console.log(session);



        return session;


    }


    catch(error){


        console.error(error);


        status.textContent =
        "Erreur chargement modèle";


        throw error;


    }

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
        "Le modèle est chargé correctement."
        );



    }


    catch(e){


        alert(
        "Erreur : " + e.message
        );


    }



};