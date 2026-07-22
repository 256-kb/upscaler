// =================================
// AI UPSCALER - APP.JS
// VERSION COMPLETE
// PARTIE 1/5
// =================================


// =================================
// ELEMENTS HTML
// =================================


// Comparateur (NE PAS MODIFIER)
const compareBox =
document.getElementById("compareBox");

const compareBefore =
document.getElementById("compareBefore");

const compareAfter =
document.getElementById("compareAfter");

const compareSlider =
document.getElementById("compareSlider");


// Interface

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




// =================================
// VARIABLES
// =================================


let originalBitmap = null;

let resultBlob = null;

let worker = null;

let isProcessing = false;

let startTime = 0;





// =================================
// CREATION WORKER
// =================================


worker = new Worker(
    "upscale-worker.js"
);



worker.onmessage = (e)=>{


    const data = e.data;


    console.log(
        "WORKER MESSAGE :",
        data
    );



    if(data.type === "progress"){


        progressBar.value =
        data.value;


        statusText.textContent =
        data.text;


    }



    if(data.type === "log"){


        addLog(
            data.text
        );


    }



    if(data.type === "error"){


        addLog(
            "ERREUR : " + data.message
        );


        statusText.textContent =
        "Erreur : " + data.message;


        isProcessing = false;

        runButton.disabled = false;


    }



};
// =================================
// CHARGEMENT IMAGE
// =================================


async function loadImage(file){

    if(
        !file ||
        !file.type.startsWith("image/")
    )
        return;



    addLog(
        "Chargement de l'image..."
    );


    originalBitmap =
    await createImageBitmap(
        file
    );


    const url =
    URL.createObjectURL(
        file
    );


    originalPreview.src =
    url;


    // Comparateur gardé intact

    compareBefore.src =
    url;



    originalInfo.textContent =
    `${originalBitmap.width} × ${originalBitmap.height}px`;



    resultPreview.src = "";

    resultInfo.textContent = "";

    resultBlob = null;



    progressBar.value = 0;


    statusText.textContent =
    "Image chargée";


    addLog(
        "Image chargée ✓"
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

}




imageInput.addEventListener(
"change",
async(e)=>{


    const file =
    e.target.files[0];


    await loadImage(file);


});




// =================================
// DRAG & DROP
// =================================


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



    await loadImage(file);



});




// =================================
// MEMOIRE
// =================================


function clearMemory(){


    addLog(
        "Nettoyage mémoire..."
    );


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
// =================================
// LANCEMENT UPSCALE
// =================================


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



    startTime =
    performance.now();



    addLog(
        "===================="
    );


    addLog(
        "Démarrage upscale"
    );


    addLog(
        "Modèle : " +
        modelSelect.value
    );


    addLog(
        "Facteur : x" +
        scaleSelect.value
    );


    addLog(
        "Résolution entrée : " +
        originalBitmap.width +
        "x" +
        originalBitmap.height
    );



    addLog(
        "Préparation des tuiles..."
    );



    worker.postMessage(

        {

            type:"start",


            model:
            modelSelect.value,


            image:
            originalBitmap,


            scale:
            Number(
                scaleSelect.value
            ),


            tileSize:
            500

        },

        [
            originalBitmap
        ]

    );


});





// =================================
// RECEPTION RESULTAT FINAL
// =================================


worker.addEventListener(
"message",
(e)=>{


    const data =
    e.data;



    if(data.type === "done"){


        resultBlob =
        data.image;



        const url =
        URL.createObjectURL(
            resultBlob
        );



        resultPreview.src =
        url;



        compareAfter.src =
        url;



        const img =
        new Image();



        img.onload = ()=>{


            resultInfo.textContent =
            `${img.width} × ${img.height}px`;


        };



        img.src =
        url;



        const time =
        (
            (
                performance.now()
                -
                startTime
            )
            /
            1000
        ).toFixed(2);



        addLog(
            "Temps total : " +
            time +
            " secondes"
        );


        addLog(
            "Upscale terminé ✓"
        );


        progressBar.value =
        100;


        statusText.textContent =
        "Upscale terminé";



        isProcessing = false;


        runButton.disabled =
        false;


    }



});
// =================================
// SAUVEGARDE PNG
// =================================


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
    "AI_upscaled_image.png";



    document.body.appendChild(
        link
    );


    link.click();



    document.body.removeChild(
        link
    );



    setTimeout(
        ()=>{

            URL.revokeObjectURL(
                url
            );

        },

        1000
    );



    addLog(
        "Image sauvegardée ✓"
    );


});





// =================================
// THEME CLAIR / SOMBRE
// =================================


if(themeButton){


themeButton.onclick = ()=>{


    document.body.classList.toggle(
        "dark"
    );


    addLog(
        "Changement de thème"
    );


};


}





// =================================
// CONSOLE DETAIL
// =================================


consoleButton.onclick = ()=>{


    if(
        consoleBox.style.display
        ===
        "none"
    ){


        consoleBox.style.display =
        "block";


        consoleButton.textContent =
        "Masquer les détails ▲";


    }

    else{


        consoleBox.style.display =
        "none";


        consoleButton.textContent =
        "Afficher les détails ▼";


    }


};






// =================================
// SYSTEME DE LOGS
// =================================


function addLog(text){


    if(!consoleBox)
        return;



    const line =
    document.createElement(
        "div"
    );



    line.textContent =
    "> " + text;



    consoleBox.appendChild(
        line
    );



    consoleBox.scrollTop =
    consoleBox.scrollHeight;


}
// =================================
// INITIALISATION
// =================================


progressBar.value = 0;


statusText.textContent =
"Prêt - IA chargée à la demande";


addLog(
"AI Upscaler prêt ✓"
);





// =================================
// ERREURS GLOBALES
// =================================


window.addEventListener(
"error",
(e)=>{


    console.error(
        "Erreur globale :",
        e.error
    );


    addLog(
        "Erreur JS : " +
        e.message
    );


});





window.addEventListener(
"unhandledrejection",
(e)=>{


    console.error(
        "Promise rejetée :",
        e.reason
    );


    addLog(
        "Erreur promise : " +
        e.reason
    );


});






// =================================
// COMPARATEUR AVANT / APRES
// NE PAS MODIFIER
// =================================


if(
    compareSlider &&
    compareAfter
){


    compareSlider.addEventListener(
    "input",
    ()=>{


        const value =
        compareSlider.value;



        const afterContainer =
        document.getElementById(
            "afterContainer"
        );



        const compareLine =
        document.getElementById(
            "compareLine"
        );



        if(afterContainer){


            afterContainer.style.width =
            value + "%";


        }



        if(compareLine){


            compareLine.style.left =
            value + "%";


        }



    });


}