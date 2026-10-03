import { menuData } from "../js/data.js";

const assetBasePath = "../";

function getFileNameFromUrl(pageUrl) {
  return pageUrl.split("/").pop();
}

function getPageUrl(pageFileName) {
  const currentPagePath = window.location.pathname.replace(/\\/g, "/");
  return currentPagePath.includes("/html/")
    ? `./${pageFileName}`
    : `./html/${pageFileName}`;
}

function createMenuMarkup() {
  let menuMarkup = '<div class="menu-container"><ul class="menu" id="menuList">';

  menuData.forEach((gradeEntry) => {
    menuMarkup += `
      <li>
        <a tabindex="0" id="${gradeEntry.id}">${gradeEntry.grade}</a>
        <ul class="tacPham" id="${gradeEntry.kId}">
    `;

    gradeEntry.works.forEach((literaryWork) => {
      const workLinkMarkup = literaryWork.link
        ? `<a href="${literaryWork.link}" target="_blank" class="require-double-click">${literaryWork.name}</a>`
        : `<a>${literaryWork.name}</a>`;

      menuMarkup += `
        <li tabindex="0">
          ${workLinkMarkup}
          <ul class="diaDanh">
      `;

      literaryWork.places.forEach((place) => {
        const pageFileName = getFileNameFromUrl(place.url);
        menuMarkup += `<li><a href="${getPageUrl(pageFileName)}" target="_self">${place.name}</a></li>`;
      });

      menuMarkup += `
          </ul>
        </li>
      `;
    });

    menuMarkup += `
        </ul>
      </li>
    `;
  });

  return `${menuMarkup}</ul></div>`;
}

function setupMenuInteractions(menuContainer) {
  menuContainer.addEventListener("click", (event) => {
    const workMapLink = event.target.closest("a.require-double-click");

    if (!workMapLink || workMapLink.dataset.clickedOnce) return;

    event.preventDefault();
    workMapLink.dataset.clickedOnce = "true";
    workMapLink.dataset.originalText = workMapLink.innerHTML;
    workMapLink.innerHTML = `${workMapLink.dataset.originalText} <span style="font-size: 0.85em;">(Xác nhận xem bản đồ trực quan ?)</span>`;
    workMapLink.style.color = "red";

    setTimeout(() => {
      workMapLink.dataset.clickedOnce = "";
      workMapLink.innerHTML = workMapLink.dataset.originalText;
      workMapLink.style.color = "";
    }, 3000);
  });

  menuContainer.querySelectorAll(".tacPham .diaDanh a").forEach((placeLink) => {
    if (localStorage.getItem(placeLink.href) === "visited") {
      placeLink.insertAdjacentHTML(
        "beforeend",
        " <span style='color: green; font-size: 0.8em;'>(Đã xem)</span>",
      );
    }

    placeLink.addEventListener("click", () => {
      localStorage.setItem(placeLink.href, "visited");
    });
  });
}

function renderHeader() {
  const headerContainer = document.getElementById("header");

  if (!headerContainer) return;

  headerContainer.innerHTML = `
    <span class="widgetbar">
      <div class="widgets">
        <img src="${assetBasePath}webico/android-icon-36x36.png" alt="web_icon" style="border-radius: 10px;">
        <span class="icon">
          <a href="${assetBasePath}index.html">
            <i class="fa-solid fa-house" style="color: rgb(76, 60, 60)"></i>
            <span class="icon-text">Trang chủ</span>
          </a>
          |
          <a href="">
            <i class="fa-solid fa-rotate" style="color: rgb(31, 37, 42)"></i>
            <span class="icon-text">Làm mới</span>
          </a>
        </span>
        <div id="menu"></div>
      </div>

      <span class="search-group">
        <span class="searchbar">
          <input type="text" id="search" class="inp" placeholder="Tìm kiếm địa danh ..." />
          <div id="bangdexuat" class="danhsachdx"></div>
        </span>
        <button id="submit" class="btn">
          <i class="fa-solid fa-magnifying-glass"></i>
        </button>
      </span>
    </span>
  `;
}

function renderMenu() {
  const menuContainer = document.getElementById("menu");

  if (!menuContainer) return;

  menuContainer.innerHTML = createMenuMarkup();
  setupMenuInteractions(menuContainer);
}

function renderFooter() {
  const footerContainer = document.getElementById("footer");

  if (footerContainer) {
    footerContainer.innerHTML = `
      <span class="icon">
        <a href="#" style="display: block; color: #9c4128; text-decoration: none">
          <i class="fa-solid fa-up-long"></i>
          <b>Quay về đầu trang</b>
        </a>
      </span>

      <div class="infoGroup">
        <b>
          <p id="dv">
            <!-- Histats.com  (div with counter) -->
            <div id="histats_counter"></div>
        
            <!-- Histats.com  START  (aync)-->
            <noscript>
              <a href="/" target="_blank">
                <img src="//sstatic1.histats.com/0.gif?5053294&101" alt="" border="0">
                </a>
              </noscript>
              <!-- Histats.com  END  -->
              <i class="fa-solid fa-school"></i> Đơn vị: Trường THPT Bình Chánh
          </p>
        </b>
        <p>
          <i class="fa-solid fa-user-group"></i> Nhóm thực hiện: Phạm Gia Uy 11A3 và Trần Thanh Duy 12A16
        </p>
      </div>
    `;

    /* Histats.com START (async) */
    window._Hasync = window._Hasync || [];
    window._Hasync.push(['Histats.start', '1,5053294,4,383,112,48,00011110']);
    window._Hasync.push(['Histats.fasi', '1']);
    window._Hasync.push(['Histats.track_hits', '']);

    if (!document.getElementById('histats-script')) {
      const histatsScript = document.createElement("script");
      histatsScript.id = "histats-script";
      histatsScript.type = "text/javascript";
      histatsScript.async = true;
      histatsScript.src = "//s10.histats.com/js15_as.js";
      (document.head || document.body).appendChild(histatsScript);
    }
    /* Histats.com END */
  }
}

function createPageMap() {
  return menuData.reduce((pageFileByPlaceName, gradeEntry) => {
    gradeEntry.works.forEach((literaryWork) => {
      literaryWork.places.forEach((place) => {
        pageFileByPlaceName[place.name] = getFileNameFromUrl(place.url);
      });
    });
    return pageFileByPlaceName;
  }, {});
}

function setupSearch() {
  const searchInput = document.getElementById("search");
  const searchButton = document.getElementById("submit");
  const suggestionsContainer = document.getElementById("bangdexuat");

  if (!searchInput || !searchButton || !suggestionsContainer) return;

  const pageFileByPlaceName = createPageMap();
  const placeNames = Object.keys(pageFileByPlaceName);

  searchInput.addEventListener("input", (event) => {
    const searchTerm = event.currentTarget.value.toLowerCase().trim();
    suggestionsContainer.innerHTML = "";

    if (!searchTerm) return;

    const matchingPlaceNames = placeNames.filter((placeName) =>
      placeName.toLowerCase().includes(searchTerm),
    );

    matchingPlaceNames.forEach((placeName) => {
      const suggestion = document.createElement("div");
      suggestion.classList.add("nddx");
      suggestion.textContent = placeName;
      suggestion.addEventListener("click", () => {
        searchInput.value = placeName;
        suggestionsContainer.innerHTML = "";
      });
      suggestionsContainer.appendChild(suggestion);
    });
  });

  document.addEventListener("click", function (event) {
    if (
      !searchInput.contains(event.target) &&
      !suggestionsContainer.contains(event.target)
    ) {
      suggestionsContainer.innerHTML = "";
    }
  });

  function handlePlaceSearch() {
    const searchTerm = searchInput.value.trim();

    if (!searchTerm) {
      alert("Hãy nhập tên địa danh!");
      return;
    }

    const matchingPlaceName = placeNames.find(
      (placeName) => placeName.toLowerCase() === searchTerm.toLowerCase(),
    );

    const pageFileName = matchingPlaceName
      ? pageFileByPlaceName[matchingPlaceName]
      : null;

    if (pageFileName) {
      suggestionsContainer.innerHTML = "";
      window.location.href = getPageUrl(pageFileName);
      return;
    }

    alert(
      "Vui lòng kiểm tra lại tên địa danh hoặc tham khảo ở 3 nút bấm có chữ lớp 10, lớp 11, lớp 12 trong trang.",
    );
  }
  searchButton.addEventListener("click", handlePlaceSearch);

  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      handlePlaceSearch();
    }
  });
}

function getAllPlaces() {
  return menuData.flatMap((gradeEntry) =>
    gradeEntry.works.flatMap((literaryWork) =>
      literaryWork.places.map((place) => {
        const pageFileName = getFileNameFromUrl(place.url);

        return {
          name: place.name,
          pageFileName,
          url: getPageUrl(pageFileName),
          workName: literaryWork.name,
          grade: gradeEntry.grade,
        };
      }),
    ),
  );
}

function getCurrentPlace(places) {
  const currentPagePath = window.location.pathname.toLowerCase();

  return places.find((place) =>
    currentPagePath.endsWith(place.pageFileName.toLowerCase()),
  );
}

function getRandomItem(candidates) {
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function shuffleArray(items) {
  return items.slice().sort(() => Math.random() - 0.5);
}

function getRecommendedPlaces(recommendationCount = 3) {
  const allPlaces = getAllPlaces();
  const currentPlace = getCurrentPlace(allPlaces);

  if (!currentPlace) {
    return shuffleArray(allPlaces).slice(0, recommendationCount);
  }

  const placesFromSameWork = allPlaces.filter(
    (place) =>
      place.workName === currentPlace.workName &&
      place.url !== currentPlace.url,
  );
  const placesFromOtherWorks = allPlaces.filter(
    (place) => place.workName !== currentPlace.workName,
  );
  const recommendations = [];
  const selectedPlaceUrls = new Set([currentPlace.url]);

  for (let index = 0; index < recommendationCount; index += 1) {
    const selectionChance = Math.random();
    const availableFromSameWork = placesFromSameWork.filter(
      (place) => !selectedPlaceUrls.has(place.url),
    );
    const availableFromOtherWorks = placesFromOtherWorks.filter(
      (place) => !selectedPlaceUrls.has(place.url),
    );

    let recommendedPlace = null;

    if (selectionChance < 0.6 && availableFromSameWork.length > 0) {
      recommendedPlace = getRandomItem(availableFromSameWork);
      recommendedPlace.isSameWork = true;
    } else if (availableFromOtherWorks.length > 0) {
      recommendedPlace = getRandomItem(availableFromOtherWorks);
      recommendedPlace.isSameWork = false;
    } else if (availableFromSameWork.length > 0) {
      recommendedPlace = getRandomItem(availableFromSameWork);
      recommendedPlace.isSameWork = true;
    }

    if (recommendedPlace) {
      selectedPlaceUrls.add(recommendedPlace.url);
      recommendations.push(recommendedPlace);
    }
  }

  return recommendations;
}

function renderRecommendations() {
  const recommendedPlaces = getRecommendedPlaces(3);

  if (recommendedPlaces.length === 0) return "";

  const recommendationCardsMarkup = recommendedPlaces
    .map(
      (placeRecommendation) => `
        <div class="recommend-card" onclick="window.location.href='${placeRecommendation.url}'">
          <div class="recommend-badge ${placeRecommendation.isSameWork ? "same-work" : "other-work"}">
            ${placeRecommendation.isSameWork ? "Cùng tác phẩm" : "Gợi ý khám phá"}
          </div>
          <h4 class="recommend-title">${placeRecommendation.name}</h4>
          <p class="recommend-meta">📖 ${placeRecommendation.workName} • <span class="recommend-grade">${placeRecommendation.grade}</span></p>
          <a href="${placeRecommendation.url}" class="recommend-btn">Khám phá ngay ➔</a>
        </div>
      `,
    )
    .join("");

  return `
    <section class="recommendations-container">
      <div class="recommendations-header">
        <h3 class="recommendations-heading">📍 Địa danh đề xuất cho bạn</h3>
        <p class="recommendations-sub">Các địa danh văn học có thể bạn quan tâm</p>
      </div>
      <div class="recommendations-grid">
        ${recommendationCardsMarkup}
      </div>
    </section>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderMenu();
  renderFooter();
  setupSearch();

  const recommendationsMarkup = renderRecommendations();
  const footerElement = document.getElementById("footer");

  if (recommendationsMarkup) {
    if (footerElement) {
      footerElement.insertAdjacentHTML("beforebegin", recommendationsMarkup);
    } else {
      document.body.insertAdjacentHTML("beforeend", recommendationsMarkup);
    }
  }
});
