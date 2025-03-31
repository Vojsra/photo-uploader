document.addEventListener("DOMContentLoaded", function () {
  // Nastavení URL Azure Function - změňte podle vaší konfigurace
  const API_URL = "https://bena-photo.azurewebsites.net/api";

  // Pro identifikaci relace použijeme ID v URL nebo vygenerujeme náhodné
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("id") || generateRandomId();

  // Reference na HTML elementy
  const cameraInput = document.getElementById("cameraInput");
  const galleryInput = document.getElementById("galleryInput");
  const takePictureButton = document.getElementById("takePictureButton");
  const selectFromGalleryButton = document.getElementById(
    "selectFromGalleryButton"
  );
  const photoPreview = document.getElementById("photoPreview");
  const uploadButton = document.getElementById("uploadButton");
  const uploadStatus = document.getElementById("uploadStatus");
  const refreshPhotosButton = document.getElementById("refreshPhotosButton");
  const photoList = document.getElementById("photoList");

  let selectedFiles = [];

  // Obsluha tlačítek pro vybrání zdroje fotografií
  takePictureButton.addEventListener("click", function () {
    cameraInput.click();
  });

  selectFromGalleryButton.addEventListener("click", function () {
    galleryInput.click();
  });

  // Obsluha události při výběru fotek z fotoaparátu
  cameraInput.addEventListener("change", function (event) {
    handleFileSelection(event, false);
  });

  // Obsluha události při výběru fotek z galerie
  galleryInput.addEventListener("change", function (event) {
    handleFileSelection(event, true);
  });

  // Obsluha tlačítka pro nahrání fotografií
  uploadButton.addEventListener("click", uploadPhotos);

  // Obsluha tlačítka pro obnovení seznamu fotografií
  refreshPhotosButton.addEventListener("click", loadPhotos);

  // Při načtení stránky načteme existující fotografie
  loadPhotos();

  /**
   * Vygeneruje náhodné ID pro relaci
   */
  function generateRandomId() {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Zpracování vybraných souborů
   * @param {Event} event - Událost změny vstupu
   * @param {Boolean} isMultiple - Indikuje, zda lze vybrat více souborů
   */
  function handleFileSelection(event, isMultiple) {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    // Pokud vybíráme z galerie, může být více souborů, jinak jen jeden
    if (isMultiple) {
      selectedFiles = Array.from(files);
    } else {
      selectedFiles = [files[0]];
    }

    // Zobrazení náhledu prvního souboru
    const file = selectedFiles[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      photoPreview.src = e.target.result;
      photoPreview.classList.remove("hidden");
      uploadButton.classList.remove("hidden");

      // Pokud bylo vybráno více souborů, ukážeme počet
      if (selectedFiles.length > 1) {
        uploadButton.innerHTML = `<i class="fas fa-upload"></i> Nahrát fotografie (${selectedFiles.length})`;
      } else {
        uploadButton.innerHTML =
          '<i class="fas fa-upload"></i> Nahrát fotografii';
      }
    };

    reader.readAsDataURL(file);
  }

  /**
   * Nahrání vybraných fotografií na server
   */
  function uploadPhotos() {
    if (selectedFiles.length === 0) {
      showMessage("Vyberte alespoň jednu fotografii.", "error");
      return;
    }

    // Vytvoření FormData objektu pro nahrání souborů
    const formData = new FormData();

    // Přidání ID relace jako metadata
    formData.append("sessionId", sessionId);

    // Přidání všech vybraných souborů
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    // Indikace probíhajícího nahrávání
    showMessage('<i class="fas fa-spinner fa-spin"></i> Nahrávání...', "");

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
        showMessage(
          '<i class="fas fa-check-circle"></i> Fotografie byly úspěšně nahrány!',
          "success"
        );

        // Vyčištění formuláře
        cameraInput.value = "";
        galleryInput.value = "";
        photoPreview.classList.add("hidden");
        uploadButton.classList.add("hidden");
        selectedFiles = [];

        // Animace pro zpětnou vazbu
        animateSuccess();

        // Obnovení seznamu fotografií
        setTimeout(loadPhotos, 1000);
      })
      .catch((error) => {
        showMessage(
          `<i class="fas fa-exclamation-triangle"></i> Chyba: ${error.message}`,
          "error"
        );
        console.error("Upload error:", error);
      });
  }

  /**
   * Animace pro úspěšné nahrání
   */
  function animateSuccess() {
    // Vytvoření animace balónků nebo konfety
    for (let i = 0; i < 5; i++) {
      let delay = i * 150;
      setTimeout(() => {
        const balloon = document.createElement("div");
        balloon.className = "balloons";
        balloon.style.left = Math.random() * 80 + 10 + "%";
        balloon.innerHTML =
          '<div class="balloon"></div><div class="balloon"></div><div class="balloon"></div>';
        document.body.appendChild(balloon);

        // Odstraníme element po animaci
        setTimeout(() => {
          document.body.removeChild(balloon);
        }, 6000);
      }, delay);
    }
  }

  /**
   * Zobrazení zprávy pro uživatele
   * @param {String} message - Text zprávy
   * @param {String} type - Typ zprávy (error, success, '')
   */
  function showMessage(message, type) {
    uploadStatus.innerHTML = message;
    uploadStatus.className = type;
  }

  /**
   * Načtení seznamu fotografií ze serveru
   */
  function loadPhotos() {
    photoList.innerHTML =
      '<div class="loading"><i class="fas fa-spinner"></i>Načítání fotografií...</div>';

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
          photoList.innerHTML =
            '<div class="text-center"><i class="fas fa-info-circle"></i> Žádné nahrané fotografie.</div>';
          return;
        }

        // Zobrazení náhledů fotografií
        data.forEach((url) => {
          const photoItem = document.createElement("div");
          photoItem.className = "photo-item";

          const img = document.createElement("img");
          img.src = url;
          img.alt = "Nahraná fotografie";
          img.loading = "lazy"; // Lazy loading pro lepší výkon

          img.onclick = () => window.open(url, "_blank");

          photoItem.appendChild(img);
          photoList.appendChild(photoItem);
        });
      })
      .catch((error) => {
        photoList.innerHTML = `<div class="error"><i class="fas fa-exclamation-triangle"></i> Chyba při načítání fotografií: ${error.message}</div>`;
        console.error("Error loading photos:", error);
      });
  }

  // Přizpůsobení pro mobilní zařízení
  function checkMobile() {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    if (isMobile) {
      // Na mobilních zařízeních přidáme další optimalizace
      document.querySelectorAll(".btn").forEach((btn) => {
        btn.classList.add("btn-mobile");
      });
    }
  }

  // Kontrola typu zařízení při načtení a resize
  checkMobile();
  window.addEventListener("resize", checkMobile);
});
