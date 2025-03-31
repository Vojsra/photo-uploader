document.addEventListener("DOMContentLoaded", function () {
  // Nastavení URL Azure Function - změňte podle vaší konfigurace
  const API_URL = "https://bena-photo.azurewebsites.net/api";
  // const API_URL = "http://localhost:7134/api";

  // Reference na HTML elementy
  const videoElement = document.getElementById("video");
  const startScanButton = document.getElementById("startScanButton");
  const qrResult = document.getElementById("qrResult");
  const qrValue = document.getElementById("qrValue");
  const qrError = document.getElementById("qrError");
  const uploadSection = document.getElementById("uploadSection");
  const photoInput = document.getElementById("photoInput");
  const captureButton = document.getElementById("captureButton");
  const photoPreview = document.getElementById("photoPreview");
  const uploadButton = document.getElementById("uploadButton");
  const uploadStatus = document.getElementById("uploadStatus");
  const photoListSection = document.getElementById("photoListSection");
  const refreshPhotosButton = document.getElementById("refreshPhotosButton");
  const photoList = document.getElementById("photoList");

  let html5QrCode;
  let sessionId = null;
  let selectedFiles = [];

  // Obsluha tlačítka pro skenování QR kódu
  startScanButton.addEventListener("click", startQrScanner);

  // Obsluha změny vybraných souborů
  photoInput.addEventListener("change", handleFileSelection);

  // Obsluha tlačítka pro pořízení fotografie
  captureButton.addEventListener("click", capturePhoto);

  // Obsluha tlačítka pro nahrání fotografií
  uploadButton.addEventListener("click", uploadPhotos);

  // Obsluha tlačítka pro obnovení seznamu fotografií
  refreshPhotosButton.addEventListener("click", loadPhotos);

  /**
   * Spustí skener QR kódů
   */
  function startQrScanner() {
    // Vytvoření instance QR skeneru
    html5QrCode = new Html5Qrcode("qrReader");

    // Konfigurace pro kameru
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    // Spuštění kamery a skenování QR kódů
    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        onQrCodeSuccess,
        onQrCodeError
      )
      .catch((err) => {
        qrError.classList.remove("hidden");
        console.error("Error starting QR scanner:", err);
      });
  }

  /**
   * Zpracování úspěšného naskenování QR kódu
   */
  function onQrCodeSuccess(decodedText) {
    // Zastavení skeneru po úspěšném naskenování
    html5QrCode
      .stop()
      .then(() => {
        console.log("QR Code scanner stopped.");
      })
      .catch((err) => {
        console.error("Error stopping QR scanner:", err);
      });

    // Zobrazení výsledku skenování
    sessionId = decodedText;
    qrValue.textContent = decodedText;
    qrResult.classList.remove("hidden");

    // Aktivace sekce pro nahrávání fotografií
    uploadSection.classList.remove("hidden");
    photoListSection.classList.remove("hidden");

    // Načtení existujících fotografií
    loadPhotos();
  }

  /**
   * Zpracování chyby při skenování QR kódu
   */
  function onQrCodeError(errorMessage) {
    console.error("QR Code scanning error:", errorMessage);
  }

  /**
   * Zpracování vybraných souborů
   */
  function handleFileSelection(event) {
    selectedFiles = Array.from(event.target.files);

    if (selectedFiles.length > 0) {
      // Zobrazení náhledu prvního souboru
      const file = selectedFiles[0];
      const reader = new FileReader();

      reader.onload = function (e) {
        photoPreview.src = e.target.result;
        photoPreview.classList.remove("hidden");
        uploadButton.classList.remove("hidden");
      };

      reader.readAsDataURL(file);
    }
  }

  /**
   * Pořízení fotografie pomocí kamery
   */
  function capturePhoto() {
    photoInput.click();
  }

  /**
   * Nahrání vybraných fotografií na server
   */
  function uploadPhotos() {
    if (selectedFiles.length === 0) {
      uploadStatus.textContent = "Vyberte alespoň jednu fotografii.";
      uploadStatus.className = "error";
      return;
    }

    // Vytvoření FormData objektu pro nahrání souborů
    const formData = new FormData();

    // Přidání QR kódu jako metadata
    formData.append("sessionId", sessionId);

    // Přidání všech vybraných souborů
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    // Indikace probíhajícího nahrávání
    uploadStatus.textContent = "Nahrávání...";
    uploadStatus.className = "";

    // Odeslání dat na server
    fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Chyba při nahrávání souborů");
        }
        return response.json();
      })
      .then((data) => {
        uploadStatus.textContent = "Fotografie byly úspěšně nahrány!";
        uploadStatus.className = "success";

        // Vyčištění formuláře
        photoInput.value = "";
        photoPreview.classList.add("hidden");
        uploadButton.classList.add("hidden");
        selectedFiles = [];

        // Obnovení seznamu fotografií
        loadPhotos();
      })
      .catch((error) => {
        uploadStatus.textContent = `Chyba: ${error.message}`;
        uploadStatus.className = "error";
        console.error("Upload error:", error);
      });
  }

  /**
   * Načtení seznamu fotografií ze serveru
   */
  function loadPhotos() {
    if (!sessionId) return;

    photoList.innerHTML = "Načítání...";

    fetch(`${API_URL}/photos`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Chyba při načítání fotografií");
        }
        return response.json();
      })
      .then((data) => {
        photoList.innerHTML = "";

        if (data.length === 0) {
          photoList.innerHTML = "Žádné nahrané fotografie.";
          return;
        }

        // Zobrazení náhledů fotografií
        data.forEach((url) => {
          const img = document.createElement("img");
          img.src = url;
          img.alt = "Nahraná fotografie";
          img.onclick = () => window.open(url, "_blank");
          photoList.appendChild(img);
        });
      })
      .catch((error) => {
        photoList.innerHTML = `Chyba při načítání fotografií: ${error.message}`;
        console.error("Error loading photos:", error);
      });
  }
});
