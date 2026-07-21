// ================================
// AI UPSCALER - APP.JS
// Interface principale
// ================================


// ================================
// ELEMENTS HTML
// ================================

const compareBefore =
document.getElementById("compareBefore");

const compareAfter =
document.getElementById("compareAfter");

const compareSlider =
document.getElementById("compareSlider");

const consoleBox =
document.getElementById("console");

const consoleButton =
document.getElementById("consoleButton");

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

const themeButton =
document.getElementById("themeButton");



// ================================
// VARIABLES
// ================================

let startTime = 0;

let originalBitmap = null;

let resultBlob = null;

let worker = null;

let isProcessing = false;



// ================================
// CREATION WORKER
// ================================


worker = new Worker(
"upscale-worker.js"
);



worker.onmessage = function(e){

console.log("MESSAGE WORKER :", e.data);

    const data =
    e.data;



    if(data.type === "progress"){


        progressBar.value =
        data.value;


        statusText.textContent =
        data.text;


    }




    if(data.type === "done"){


        resultBlob =
        data.image;

const resultURL =
URL.createObjectURL(resultBlob);

compareAfter.src =
resultURL;

const endTime = performance.now();

const time =
((endTime - startTime) / 1000)
.toFixed(2);


addLog(
"Temps total : " + time + " secondes"
);

addLog(
"Upscale terminé ✓"
);



        const url =
        URL.createObjectURL(
            resultBlob
        );



        resultPreview.src =
        url;



        const img =
        new Image();


        img.onload = ()=>{


            resultInfo.textContent =
            `${img.width} × ${img.height}px`;

        };


        img.src =
        url;



        progressBar.value =
        100;


        statusText.textContent =
        "Upscale terminé";



        isProcessing = false;

        runButton.disabled = false;


    }





    if(data.type === "error"){


        console.error(
            data.message
        );


        statusText.textContent =
        "Erreur : " + data.message;


        isProcessing = false;

        runButton.disabled = false;


    }


        if(data.type==="log"){

        addLog(data.text);

}

};
// ================================
// CHARGEMENT IMAGE
// ================================


imageInput.addEventListener(
"change",
async function(e){


    const file =
    e.target.files[0];


    if(!file)
        return;



    originalBitmap =
    await createImageBitmap(
        file
    );



    originalPreview.src =
    URL.createObjectURL(file);

    compareBefore.src =
    URL.createObjectURL(file);


    originalInfo.textContent =
    `${originalBitmap.width} × ${originalBitmap.height}px`;



    resultPreview.src = "";

    resultInfo.textContent = "";

    resultBlob = null;


    statusText.textContent =
    "Image chargée";


    progressBar.value = 0;


});





// ================================
// LANCEMENT UPSCALE
// ================================


runButton.addEventListener(
"click",
()=>{


    if(isProcessing)
        return;



    if(!originalBitmap){


        alert(
            "Choisis une image avant."
        );


        return;

    }



    isProcessing = true;


    runButton.disabled = true;



    progressBar.value = 5;


    statusText.textContent =
    "Démarrage IA...";

    startTime = performance.now();


addLog("Démarrage de l'upscale...");
addLog(
"Modèle : " + modelSelect.value
);

addLog(
"Facteur : x" + scaleSelect.value
);

addLog(
"Résolution : " +
originalBitmap.width +
"x" +
originalBitmap.height
);

addLog(
"Pixels : " +
(
originalBitmap.width *
originalBitmap.height /
1000000
).toFixed(2)
+
" MP"
);


    worker.postMessage(

        {

            type:"start",

            model:
            modelSelect.value,

            image: originalBitmap,
            scale: Number(scaleSelect.value)

        },


    );


});






// ================================
// SAUVEGARDE PNG
// ================================


saveButton.addEventListener(
"click",
()=>{


    if(!resultBlob){


        alert(
            "Aucune image à enregistrer."
        );


        return;

    }



    const url =
    URL.createObjectURL(
        resultBlob
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


});






// ================================
// THEME
// ================================


if(themeButton){


themeButton.onclick =
()=>{


    document.body.classList.toggle(
        "dark"
    );


};


}






// ================================
// DRAG & DROP
// ================================


document.body.addEventListener(
"dragover",
(e)=>{


    e.preventDefault();


});




document.body.addEventListener(
"drop",
async(e)=>{


    e.preventDefault();



    const file =
    e.dataTransfer.files[0];



    if(
        !file ||
        !file.type.startsWith("image/")
    )
        return;




    originalBitmap =
    await createImageBitmap(
        file
    );



    originalPreview.src =
    URL.createObjectURL(
        file
    );



    originalInfo.textContent =
    `${originalBitmap.width} × ${originalBitmap.height}px`;



    statusText.textContent =
    "Image chargée";


});
// ================================
// RESIZE RESULTAT
// ================================


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
    document.createElement(
        "canvas"
    );


    canvas.width =
    width;


    canvas.height =
    height;



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



    return new Promise(
        resolve => {


            canvas.toBlob(
                resolve,
                "image/png",
                1
            );


        }
    );


}





// ================================
// GESTION SCALE x2 / x8
// ================================


// Note : à utiliser si tu veux garder
// les options x2 et x8


async function applyScale(blob){


    const scale =
    Number(
        scaleSelect.value
    );



    if(scale === 4)
        return blob;



    const img =
    await createImageBitmap(
        blob
    );



    const originalWidth =
    originalBitmap.width;


    const originalHeight =
    originalBitmap.height;



    return await resizeBlob(

        blob,

        originalWidth * scale,

        originalHeight * scale

    );


}





// ================================
// MEMOIRE
// ================================


function clearMemory(){


    originalBitmap = null;


    resultBlob = null;



    if(worker){

        worker.terminate();

    }


}





window.addEventListener(
"beforeunload",
()=>{


    clearMemory();


});







// ================================
// ERREURS GLOBALES
// ================================


window.addEventListener(
"error",
(e)=>{


    console.error(
        "Erreur globale :",
        e.error
    );


});



window.addEventListener(
"unhandledrejection",
(e)=>{


    console.error(
        "Erreur promise :",
        e.reason
    );


});






// ================================
// INITIALISATION
// ================================


progressBar.value = 0;


statusText.textContent =
"Prêt - IA chargée à la demande";



console.log(
"AI Upscaler prêt"
);



consoleButton.onclick = ()=>{

    if(consoleBox.style.display === "none"){

        consoleBox.style.display="block";

        consoleButton.textContent =
        "Masquer les détails ▲";

    }

    else{

        consoleBox.style.display="none";

        consoleButton.textContent =
        "Afficher les détails ▼";

    }

};



function addLog(text){

    consoleBox.innerHTML +=
    "> " + text + "<br>";

    consoleBox.scrollTop =
    consoleBox.scrollHeight;

}

if(compareSlider && compareAfter){

    compareSlider.addEventListener("input", ()=>{

        const value = compareSlider.value;

        compareAfter.style.clipPath =
        `inset(0 ${100 - value}% 0 0)`;

    });

}