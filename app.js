document.addEventListener("DOMContentLoaded", function () {
  // Nastavení URL Azure Function - změňte podle vaší konfigurace
  // const API_URL = "http://localhost:7134/api";
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

  // Reference na elementy GALERIE
  const photoGallery = document.getElementById("photoGallery");
  const closeGallery = document.getElementById("closeGallery");
  const prevPhoto = document.getElementById("prevPhoto");
  const nextPhoto = document.getElementById("nextPhoto");
  const fullImage = document.getElementById("fullImage");
  const imageCounter = document.getElementById("imageCounter");
  const galleryLoader = document.querySelector(".gallery-loader"); // Reference na loader

  let selectedFiles = [];
  let currentPhotoIndex = 0;
  let galleryPhotos = []; // Pole s URL plných obrázků

  // Obsluha tlačítek pro vybrání zdroje fotografií
  if (takePictureButton)
    takePictureButton.addEventListener("click", () => cameraInput.click());
  if (selectFromGalleryButton)
    selectFromGalleryButton.addEventListener("click", () =>
      galleryInput.click()
    );

  // Obsluha události při výběru fotek z fotoaparátu
  if (cameraInput)
    cameraInput.addEventListener("change", (event) =>
      handleFileSelection(event, false)
    );

  // Obsluha události při výběru fotek z galerie
  if (galleryInput)
    galleryInput.addEventListener("change", (event) =>
      handleFileSelection(event, true)
    );

  // Obsluha tlačítka pro nahrání fotografií
  if (uploadButton) uploadButton.addEventListener("click", uploadPhotos);

  // Obsluha tlačítka pro obnovení seznamu fotografií
  if (refreshPhotosButton)
    refreshPhotosButton.addEventListener("click", loadPhotos);

  // Ovládání galerie
  if (closeGallery) closeGallery.addEventListener("click", hideGallery);
  if (prevPhoto) prevPhoto.addEventListener("click", showPreviousPhoto);
  if (nextPhoto) nextPhoto.addEventListener("click", showNextPhoto);

  // Detekcе swipe gesta pro mobilní zařízení v galerii
  let touchStartX = 0;
  let touchEndX = 0;

  if (photoGallery) {
    // Přidáme listenery jen pokud galerie existuje
    photoGallery.addEventListener(
      "touchstart",
      function (e) {
        // Sledujeme dotyk pouze na kontejneru obrázku, ne na tlačítkách
        if (e.target === fullImage || e.target === fullImage.parentElement) {
          touchStartX = e.changedTouches[0].screenX;
        }
      },
      { passive: true }
    ); // passive: true pro lepší výkon scrollování

    photoGallery.addEventListener("touchend", function (e) {
      if (e.target === fullImage || e.target === fullImage.parentElement) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
      }
    });
  }

  function handleSwipe() {
    const swipeThreshold = 50; // Minimální vzdálenost pro swipe
    if (touchEndX < touchStartX - swipeThreshold) {
      // Swipe vlevo - další fotka
      showNextPhoto();
    }
    if (touchEndX > touchStartX + swipeThreshold) {
      // Swipe vpravo - předchozí fotka
      showPreviousPhoto();
    }
    // Reset hodnot pro další swipe
    touchStartX = 0;
    touchEndX = 0;
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

    selectedFiles = Array.from(files); // Vždy vezmeme všechny vybrané soubory

    // Zobrazení náhledu prvního souboru
    const file = selectedFiles[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      photoPreview.src = e.target.result;
      photoPreview.classList.remove("hidden");
      uploadButton.classList.remove("hidden");

      // Aktualizujeme text tlačítka podle počtu souborů
      if (selectedFiles.length > 1) {
        uploadButton.innerHTML = `<i class="fas fa-upload"></i> Nahrát fotografie (${selectedFiles.length})`;
      } else {
        uploadButton.innerHTML = `<i class="fas fa-upload"></i> Nahrát fotografii`;
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

    const formData = new FormData();
    formData.append("sessionId", sessionId); // Přidání ID relace
    selectedFiles.forEach((file) => {
      formData.append("files", file); // Použijeme 'files' pro backend
    });

    showMessage('<i class="fas fa-spinner fa-spin"></i> Nahrávání...', "");
    uploadButton.disabled = true; // Deaktivujeme tlačítko během nahrávání

    fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          // Pokusíme se získat chybovou zprávu z těla odpovědi
          return response.text().then((text) => {
            throw new Error(
              `Chyba serveru: ${response.status} ${response.statusText}. ${
                text || ""
              }`
            );
          });
        }
        return response.json();
      })
      .then((data) => {
        showMessage(
          '<i class="fas fa-check-circle"></i> Fotografie byly úspěšně nahrány!',
          "success"
        );
        // Vyčištění formuláře a náhledu
        cameraInput.value = "";
        galleryInput.value = "";
        photoPreview.src = ""; // Vyčistíme i src
        photoPreview.classList.add("hidden");
        uploadButton.classList.add("hidden");
        uploadButton.innerHTML = '<i class="fas fa-upload"></i> Nahrát'; // Reset textu
        selectedFiles = [];

        animateSuccess(); // Spustíme animaci

        setTimeout(loadPhotos, 1500); // Obnovíme seznam fotek po chvíli
      })
      .catch((error) => {
        showMessage(
          `<i class="fas fa-exclamation-triangle"></i> Chyba: ${error.message}`,
          "error"
        );
        console.error("Upload error:", error);
      })
      .finally(() => {
        uploadButton.disabled = false; // Znovu aktivujeme tlačítko
      });
  }

  /**
   * Animace pro úspěšné nahrání (beze změny)
   */
  function animateSuccess() {
    // Vytvoření animace balónků nebo konfety
    const numBalloons = 5; // Počet skupin balónků
    for (let i = 0; i < numBalloons; i++) {
      let delay = i * 200; // Rozložíme start animací
      setTimeout(() => {
        const balloonContainer = document.createElement("div");
        balloonContainer.className = "balloons";
        // Náhodná pozice, ale ne úplně u kraje
        balloonContainer.style.left = Math.random() * 70 + 15 + "%";
        // Přidáme samotné balónky
        balloonContainer.innerHTML =
          '<div class="balloon"></div><div class="balloon"></div><div class="balloon"></div>';
        document.body.appendChild(balloonContainer);

        // Odstraníme element po skončení animace (6s + malá rezerva)
        setTimeout(() => {
          if (document.body.contains(balloonContainer)) {
            document.body.removeChild(balloonContainer);
          }
        }, 6500);
      }, delay);
    }
  }

  /**
   * Zobrazení zprávy pro uživatele (beze změny)
   */
  function showMessage(message, type) {
    uploadStatus.innerHTML = message;
    // Reset tříd a přidání nové
    uploadStatus.className = "";
    if (type) {
      uploadStatus.classList.add(type);
    }
  }

  /**
   * Vytvoří URL pro miniaturu.
   * !! Ujistěte se, že váš backend (Azure Function) umí zpracovat
   * parametr `thumb=1` nebo upravte tuto funkci podle vaší logiky
   * pro generování miniatur (např. jiný query parametr, jiná cesta).
   * @param {String} originalUrl - Původní URL obrázku
   * @returns {String} - URL pro miniaturu
   */
  function createThumbnailUrl(originalUrl) {
    // Jednoduchý příklad: přidání query parametru ?thumb=1
    // Můžete potřebovat složitější logiku v závislosti na backendu
    try {
      const url = new URL(originalUrl);
      url.searchParams.set("thumb", "1"); // Přidá nebo přepíše ?thumb=1
      // Můžete přidat i další parametry, pokud je backend podporuje
      // url.searchParams.set('width', '150');
      // url.searchParams.set('height', '150');
      return url.toString();
    } catch (e) {
      console.error("Nevalidní URL pro vytvoření miniatury:", originalUrl);
      return originalUrl; // V nouzi vrátíme originál
    }
  }

  /**
   * Načtení seznamu fotografií ze serveru
   */
  // Načtení seznamu fotografií ze serveru - upravená verze
  function loadPhotos() {
    if (!photoList) return;

    photoList.innerHTML =
      '<div class="loading"><i class="fas fa-spinner fa-spin"></i>Načítání fotografií...</div>';
    photoList.style.display = "block";

    fetch(`${API_URL}/photos`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Chyba ${response.status} při načítání fotografií`);
        }
        return response.json();
      })
      .then((data) => {
        photoList.innerHTML = "";
        photoList.style.display = "grid";

        // Upraveno pro práci s PhotoInfo objekty
        galleryPhotos = data.map((item) => item.fullUrl); // Ukládáme jen plné URL pro galerii

        if (!Array.isArray(data) || data.length === 0) {
          photoList.style.display = "block";
          photoList.innerHTML =
            '<div class="text-center"><i class="fas fa-info-circle"></i> Žádné nahrané fotografie.</div>';
          return;
        }

        // Zobrazení náhledů fotografií - použijeme přímo ThumbnailUrl
        data.forEach((photoInfo, index) => {
          const photoItem = document.createElement("div");
          photoItem.className = "photo-item";

          const img = document.createElement("img");
          img.src = photoInfo.thumbnailUrl; // Použijeme ThumbnailUrl z objektu
          img.alt = `Nahraná fotografie ${index + 1}`;
          img.loading = "lazy";
          img.dataset.index = index;
          img.dataset.fullUrl = photoInfo.fullUrl; // Uložíme originální URL

          img.onclick = () => openGallery(index);

          img.onerror = () => {
            console.warn(`Miniatura se nepodařila načíst: ${img.src}`);
            photoItem.innerHTML = '<i class="fas fa-image-broken"></i>';
            photoItem.style.display = "flex";
            photoItem.style.justifyContent = "center";
            photoItem.style.alignItems = "center";
            photoItem.style.backgroundColor = "#eee";
          };

          photoItem.appendChild(img);
          photoList.appendChild(photoItem);
        });
      })
      .catch((error) => {
        photoList.style.display = "block";
        photoList.innerHTML = `<div class="error" style="text-align: center;"><i class="fas fa-exclamation-triangle"></i> Chyba při načítání fotografií: ${error.message}</div>`;
        console.error("Error loading photos:", error);
      });
  }

  /**
   * Otevře galerii a zobrazí zvolenou fotografii
   * @param {Number} index - Index fotografie k zobrazení
   */
  function openGallery(index) {
    if (!galleryPhotos || galleryPhotos.length === 0 || !photoGallery) return;

    currentPhotoIndex = index;
    photoGallery.classList.remove("hidden");
    // Krátké zpoždění před přidáním třídy pro animaci
    setTimeout(() => {
      photoGallery.classList.add("gallery-active");
    }, 10); // Malé zpoždění pro správné spuštění CSS transition
    document.body.classList.add("no-scroll"); // Zabrání skrolování stránky pod galerií

    showCurrentPhoto(); // Zobrazíme vybranou fotografii

    // Nastavíme klávesové ovládání POUZE když je galerie otevřená
    document.addEventListener("keydown", handleGalleryKeyPress);
  }

  /**
   * Skryje galerii
   */
  function hideGallery() {
    if (!photoGallery) return;

    photoGallery.classList.remove("gallery-active"); // Spustí transition pro zavření
    document.body.classList.remove("no-scroll"); // Povolí skrolování

    // Skryjeme element až po dokončení animace (čas musí odpovídat CSS transition)
    setTimeout(() => {
      photoGallery.classList.add("hidden");
      fullImage.src = ""; // Vyčistíme src, aby se nezobrazoval starý obrázek při příštím otevření
    }, 300); // 300ms je délka opacity transition v CSS

    // Odstraníme klávesové ovládání
    document.removeEventListener("keydown", handleGalleryKeyPress);
  }

  /**
   * Obsluha klávesových zkratek v galerii (beze změny)
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
   * Zobrazí aktuální fotografii v galerii (načte plnou verzi)
   */
  function showCurrentPhoto() {
    if (
      !galleryPhotos ||
      galleryPhotos.length === 0 ||
      !fullImage ||
      !galleryLoader
    )
      return;

    const fullImageUrl = galleryPhotos[currentPhotoIndex];

    fullImage.classList.add("loading-image"); // Přidá třídu pro zobrazení loaderu a případně snížení opacity
    galleryLoader.style.display = "block"; // Ukážeme loader
    fullImage.src = ""; // Vyprázdníme src pro jistotu

    // Vytvoříme nový Image objekt pro přednačtení
    const img = new Image();

    img.onload = function () {
      // Jakmile se plný obrázek načte:
      fullImage.src = fullImageUrl; // Nastavíme src na skutečném <img> elementu
      fullImage.classList.remove("loading-image"); // Odebereme třídu načítání
      galleryLoader.style.display = "none"; // Skryjeme loader
    };

    img.onerror = function () {
      // Pokud se plný obrázek nepodaří načíst:
      console.error("Nepodařilo se načíst plný obrázek:", fullImageUrl);
      fullImage.classList.remove("loading-image");
      galleryLoader.style.display = "none";
      // Můžete zobrazit chybovou zprávu nebo placeholder
      fullImage.alt = "Obrázek nelze načíst";
      // fullImage.src = 'path/to/error-placeholder.png'; // Cesta k placeholderu
    };

    // Nastavíme src na pomocném Image objektu, čímž spustíme načítání
    img.src = fullImageUrl;

    // Aktualizujeme počítadlo
    if (imageCounter) {
      imageCounter.textContent = `${currentPhotoIndex + 1} / ${
        galleryPhotos.length
      }`;
    }

    // Aktualizujeme stav navigačních tlačítek
    if (prevPhoto)
      prevPhoto.classList.toggle("disabled", currentPhotoIndex === 0);
    if (nextPhoto)
      nextPhoto.classList.toggle(
        "disabled",
        currentPhotoIndex === galleryPhotos.length - 1
      );
  }

  /**
   * Zobrazí předchozí fotografii v galerii (beze změny)
   */
  function showPreviousPhoto() {
    if (currentPhotoIndex > 0) {
      currentPhotoIndex--;
      showCurrentPhoto();
    }
  }

  /**
   * Zobrazí následující fotografii v galerii (beze změny)
   */
  function showNextPhoto() {
    if (currentPhotoIndex < galleryPhotos.length - 1) {
      currentPhotoIndex++;
      showCurrentPhoto();
    }
  }

  // Přizpůsobení pro mobilní zařízení (kontrola a přidání třídy)
  function checkMobile() {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    document.querySelectorAll(".btn").forEach((btn) => {
      // Přidá nebo odebere třídu podle toho, zda jsme na mobilu
      btn.classList.toggle("btn-mobile", isMobile);
    });
    // Můžete zde přidat další logiku specifickou pro mobily
  }

  // Kontrola typu zařízení při načtení a změně velikosti okna
  checkMobile();
  window.addEventListener("resize", checkMobile);
});
