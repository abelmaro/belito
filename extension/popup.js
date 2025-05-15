const uploadBtn = document.getElementById('uploadBtn');
const generateBtn = document.getElementById('generateBtn');
const output = document.getElementById('output');

let cvUploadedSuccessfully = false;

const instructionBlock = `
Actúa como un asistente experto en redacción de correos profesionales para búsqueda de empleo. Tu tarea es generar un correo electrónico completo y personalizado para el envío de un CV, basándote en la información del CV del candidato y la descripción del puesto que te proporcionaré.

INSTRUCCIONES DE FORMATO

Formato de salida: Utiliza Markdown para estructurar el correo. Emplea:

Negritas: **texto**

Itálicas: _texto_

Listas con -

Encabezados con #

Enlaces con [texto](url)

Reemplazá todos los marcadores [EN_MAYÚSCULAS_Y_CORCHETES] con información extraída del CV y la descripción del puesto. Si algún dato no está disponible, dejá el marcador intacto y avisá al usuario para que lo complete manualmente.

No incluyas explicaciones ni texto adicional fuera del contenido del correo. Solo generá el contenido en Markdown.

ESTRUCTURA DEL CORREO

ASUNTO DEL CORREO:
Solicitud para [NOMBRE_DEL_PUESTO] - [TU_NOMBRE]

ENCABEZADO:
[TU_NOMBRE] - Aplicación para [NOMBRE_DEL_PUESTO] en [NOMBRE_DE_LA_EMPRESA]

SALUDO:
Estimado/a [NOMBRE_DEL_RECLUTADOR],
(Si no hay nombre, usá: Estimado equipo de contratación de [NOMBRE_DE_LA_EMPRESA], o Estimado/a Gerente de Contratación,)

INTRODUCCIÓN:
Me dirijo a usted con gran interés en la posición de [NOMBRE_DEL_PUESTO] en [NOMBRE_DE_LA_EMPRESA].
Descubrí esta oportunidad a través de LinkedIn.

CUERPO:
Destacá 2 o 3 habilidades o logros del CV alineados con los requisitos del puesto. Siempre que puedas, cuantificá los resultados. Ejemplo:

Dominio del idioma alemán (nivel C1), certificado por [CERTIFICACIÓN], lo cual es esencial para evaluar anuncios en ese idioma.

Experiencia en trabajo remoto y manejo de herramientas online (ej.: REST APIs, Google Maps API), aplicables al análisis de anuncios.

Capacidad para inferir la intención del usuario a partir de pocas palabras clave, útil para mejorar la relevancia de anuncios.

CIERRE:
Adjunto a este correo encontrará mi CV para su consideración.
Agradecería mucho la oportunidad de conversar con usted sobre cómo mis habilidades y experiencia se alinean con las necesidades de [NOMBRE_DE_LA_EMPRESA].
Estoy disponible para una entrevista en su conveniencia.

DESPEDIDA:
Cordialmente,
o
Atentamente,

FIRMA:
[TU_NOMBRE_COMPLETO]
[TU_TELEFONO] • [TU_CORREO_ELECTRONICO] • [LINKEDIN] • [GITHUB]

NOTAS:

Si el CV no incluye algun dato, dejá un aviso por cada dato faltante como:
⚠️ La vacante requiere dominio [REQUERIMIENTO]. Este dato no se encuentra en el CV. Por favor, completá el campo correspondiente si aplica.
`;

document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("uploadBtn");
  const fileInput = document.getElementById("cvFile");
  const cvStatus = document.getElementById("cvStatus");

  let cvUploadedSuccessfully = false;

  const hasCV = localStorage.getItem("autoproposal_cv_hash");
  if (hasCV) {
    cvUploadedSuccessfully = true;
    cvStatus.style.display = "block";
    fileInput.style.display = "none";
    uploadBtn.textContent = "Upload another resume";
  } else {
    fileInput.style.display = "block";
    uploadBtn.textContent = "Upload resume";
  }

  uploadBtn.onclick = async () => {
    if (!cvUploadedSuccessfully) {
      const file = fileInput.files[0];
      if (!file) return alert("Select resume (.txt)");

      uploadBtn.textContent = "Uploading...";
      uploadBtn.disabled = true;

      try {
        const text = await file.text();
        const newHash = await hashText(text);
        const previousHash = localStorage.getItem("autoproposal_cv_hash");

        if (newHash !== previousHash) {
          await fetch("http://localhost:8000/reset", { method: "POST" });

          const formData = new FormData();
          formData.append("file", new File([text], "cv.txt", { type: "text/plain" }));

          const res = await fetch("http://localhost:8000/upload", {
            method: "POST",
            body: formData
          });

          const json = await res.json();
          if (res.ok && json.status === "ok") {
            localStorage.setItem("autoproposal_cv_hash", newHash);
            alert(`Resume "${file.name}" successfully stored.`);
            cvUploadedSuccessfully = true;
            cvStatus.style.display = "block";
            fileInput.style.display = "none";
            uploadBtn.textContent = "Upload another resume";
          } else {
            alert(`Error uploading resume: ${json?.message || "unexpected response"}`);
            cvUploadedSuccessfully = false;
            cvStatus.style.display = "none";
            fileInput.style.display = "block";
            uploadBtn.textContent = "Upload resume";
          }
        } else {
          alert("This resume is already uploaded.");
        }
      } catch (err) {
        alert(`Error connecting to API: ${err.message}`);
        cvUploadedSuccessfully = false;
        cvStatus.style.display = "none";
        fileInput.style.display = "block";
        uploadBtn.textContent = "Upload resume";
      } finally {
        uploadBtn.disabled = false;
        fileInput.value = "";
      }
    } else {
      cvUploadedSuccessfully = false;
      fileInput.style.display = "block";
      uploadBtn.textContent = "Upload resume";
      cvStatus.style.display = "none";
      localStorage.removeItem("autoproposal_cv_hash");
    }
  };

  generateBtn.onclick = () => {
    if (!cvUploadedSuccessfully) {
      alert('Please upload your resume before generating the proposal.');
      return;
    }

    output.value = '';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0 || !tabs[0].id) {
        alert('Could not get the active tab.');
        return;
      }
      const activeTab = tabs[0];

      if (!activeTab.url || !activeTab.url.startsWith("https://www.linkedin.com/jobs/")) {
        alert('Please make sure you are on a job description page on LinkedIn.');
        return;
      }

      generateBtn.textContent = 'Generating...';
      generateBtn.disabled = true;
      output.value = "Obtaining job description...";

      chrome.tabs.sendMessage(activeTab.id, { action: 'getJobDescription' }, async (response) => {
        if (chrome.runtime.lastError) {
          output.value = '';
          alert(`Could not contact the LinkedIn page.\nError: ${chrome.runtime.lastError.message}`);
          generateBtn.textContent = 'Generate proposal';
          generateBtn.disabled = false;
          return;
        }

        if (!response || !response.jobText || response.jobText.length < 50) {
          output.value = '';
          alert("The job description could not be read. Make sure you're on a valid page.");
          generateBtn.textContent = 'Generate proposal';
          generateBtn.disabled = false;
          return;
        }

        const jobTextFromPage = response.jobText;
        output.value = "Generating a proposal with the LLM...";

        const formData = new FormData();
        formData.append("prompt", `${instructionBlock}\n\n${jobTextFromPage}`);

        try {
          const res = await fetch("http://localhost:8000/ask", {
            method: "POST",
            body: formData
          });

          if (!res.ok) {
            let errorText = `Server error: ${res.status}`;
            try {
              const errorData = await res.json();
              errorText = errorData.message || errorData.error || errorText;
            } catch (e) {
              const plainTextError = await res.text();
              if (plainTextError) errorText = plainTextError;
            }
            output.value = "";
            alert('Error generating proposal: ' + errorText);
          } else {
            const markdown = await res.text();
            output.innerHTML = marked.parse(markdown);
          }

        } catch (err) {
          output.value = "";
          alert('Connection error when generating proposal: ' + err.message);
        } finally {
          generateBtn.textContent = 'Generate proposal';
          generateBtn.disabled = false;
        }
      });
    });
  };

  async function hashText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
});
