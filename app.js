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
  const selectFromGalleryButton = document.getElementById("selectFromGalleryButton");
  const photoPreview = document.getElementById("photoPreview");
  const uploadButton = document.getElementById("uploadButton");
  const uploadStatus = document.getElementById("uploadStatus");
  const refreshPhotosButton = document.getElementById("refreshPhotosButton");
  const photoList = document.getElementById("photoList");
  const photoGallery = document.getElementById("photoGallery");
  const closeGallery = document.getElementById("closeGallery");
  const prevPhoto = document.getElementById("prevPhoto");
  const nextPhoto = document.getElementById("nextPhoto");
  const fullImage = document.getElementById("fullImage");
  const imageCounter = document.getElementById("imageCounter");

  let selectedFiles = [];
  let currentPhotoIndex = 0;
  let galleryPhotos = [];
  
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
  
  // Ovládání galerie
  closeGallery.addEventListener("click", hideGallery);
  prevPhoto.addEventListener("click", showPreviousPhoto);
  nextPhoto.addEventListener("click", showNextPhoto);
  
  // Detekcе swipe gesta pro mobilní zařízení
  let touchStartX = 0;
  let touchEndX = 0;
  
  fullImage.addEventListener("touchstart", function(e) {
    touchStartX = e.changedTouches[0].screenX;
  });
  
  fullImage.addEventListener("touchend", function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });
  
  function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
      // Swipe vlevo - další fotka
      showNextPhoto();
    }
    if (touchEndX > touchStartX + swipeThreshold) {
      // Swipe vpravo - předchozí fotka
      showPreviousPhoto();
    }
  }

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
   * Vytvoří miniaturní verzi URL pro rychlejší načítání
   * @param {String} originalUrl - Původní URL obrázku
   * @returns {String} - URL pro miniaturu
   */
  function createThumbnailUrl(originalUrl) {
    // Tady můžete implementovat konkrétnější logiku podle vašeho serveru
    // Například přidáním query parametru ?width=200 nebo /thumbnail/ před název souboru
    
    // Pro Azure Blob Storage můžete použít SAS token s transformacemi
    // Příklad: originalUrl + "?width=200&height=200&format=jpg&quality=80"
    
    // Pro jednoduchost v tomto příkladu přidáme parametr thumb=1
    return originalUrl + "?thumb=1";
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
        galleryPhotos = data; // Uložíme seznam fotografií pro galerii

        if (data.length === 0) {
          photoList.innerHTML =
            '<div class="text-center"><i class="fas fa-info-circle"></i> Žádné nahrané fotografie.</div>';
          return;
        }

        // Zobrazení náhledů fotografií
        data.forEach((url, index) => {
          const photoItem = document.createElement("div");
          photoItem.className = "photo-item";

          const img = document.createElement("img");
          // Použijeme URL pro miniatury místo originálního obrázku
          img.src = createThumbnailUrl(url);
          img.alt = "Nahraná fotografie";
          img.loading = "lazy"; // Lazy loading pro lepší výkon
          img.dataset.index = index; // Uložíme index pro galerii
          img.dataset.fullUrl = url; // Uložíme originální URL pro galerii

          // Otevřeme galerii po kliknutí na miniaturu
          img.onclick = () => openGallery(index);

          photoItem.appendChild(img);
          photoList.appendChild(photoItem);
        });
      })
      .catch((error) => {
        photoList.innerHTML = `<div class="error"><i class="fas fa-exclamation-triangle"></i> Chyba při načítání fotografií: ${error.message}</div>`;
        console.error("Error loading photos:", error);
      });
  }
  
  /**
   * Otevře galerii a zobrazí zvolenou fotografii
   * @param {Number} index - Index fotografie k zobrazení
   */
  function openGallery(index) {
    if (!galleryPhotos || galleryPhotos.length === 0) return;
    
    currentPhotoIndex = index;
    photoGallery.classList.remove("hidden");
    document.body.classList.add("no-scroll");
    
    // Nastavíme třídu pro animaci
    photoGallery.classList.add("gallery-active");
    
    // Zobrazíme vybranou fotografii
    showCurrentPhoto();
    
    // Nastavíme klávesové ovládání
    document.addEventListener("keydown", handleGalleryKeyPress);
  }
  
  /**
   * Skryje galerii
   */
  function hideGallery() {
    photoGallery.classList.remove("gallery-active");
    setTimeout(() => {
      photoGallery.classList.add("hidden");
      document.body.classList.remove("no-scroll");
    }, 300);
    
    // Odstraníme klávesové ovládání
    document.removeEventListener("keydown", handleGalleryKeyPress);
  }
  
  /**
   * Obsluha klávesových zkratek v galerii
   * @param {KeyboardEvent} e - Událost klávesy
   */
  function handleGalleryKeyPress(e) {
    if (e.key === "ArrowLeft") {
      showPreviousPhoto();
    } else if (e.key === "ArrowRight") {
      showNextPhoto();
    } else if (e.key === "Escape") {
      hideGallery();
    }
  }
  
  /**
   * Zobrazí aktuální fotografii v galerii
   */
  function showCurrentPhoto() {
    if (!galleryPhotos || galleryPhotos.length === 0) return;
    
    // Zobrazíme indikátor načítání
    fullImage.classList.add("loading-image");
    
    // Předem načteme plnou verzi obrázku
    const img = new Image();
    img.onload = function() {
      fullImage.src = galleryPhotos[currentPhotoIndex];
      fullImage.classList.remove("loading-image");
    };
    img.src = galleryPhotos[currentPhotoIndex];
    
    // Aktualizujeme počítadlo
    imageCounter.textContent = `${currentPhotoIndex + 1} / ${galleryPhotos.length}`;
    
    // Aktualizujeme tlačítka pro navigaci
    prevPhoto.classList.toggle("disabled", currentPhotoIndex === 0);
    nextPhoto.classList.toggle("disabled", currentPhotoIndex === galleryPhotos.length - 1);
  }
  
  /**
   * Zobrazí předchozí fotografii v galerii
   */
  function showPreviousPhoto() {
    if (currentPhotoIndex > 0) {
      currentPhotoIndex--;
      showCurrentPhoto();
    }
  }
  
  /**
   * Zobrazí následující fotografii v galerii
   */
  function showNextPhoto() {
    if (currentPhotoIndex < galleryPhotos.length - 1) {
      currentPhotoIndex++;
      showCurrentPhoto();
    }
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