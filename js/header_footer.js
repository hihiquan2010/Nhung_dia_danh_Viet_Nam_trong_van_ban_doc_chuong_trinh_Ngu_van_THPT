import { buildPageMap } from "./data.js";

function renderHeader(assetBasePath) {
  const headerContainer = document.getElementById("header");

  if (headerContainer) {
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
            |
            <a href="${assetBasePath}/html/game.html">
              <i class="fa-solid fa-gamepad"></i>
              <span class="icon-text">Trò chơi</span>
            </a>
          </span>
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
    window._Hasync.push(["Histats.start", "1,5053294,4,383,112,48,00011110"]);
    window._Hasync.push(["Histats.fasi", "1"]);
    window._Hasync.push(["Histats.track_hits", ""]);

    if (!document.getElementById("histats-script")) {
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

function attachSearch(pageFileByPlaceName) {
  const searchInput = document.getElementById("search");
  const searchButton = document.getElementById("submit");
  const suggestionsContainer = document.getElementById("bangdexuat");

  if (searchInput && searchButton && suggestionsContainer) {
    const placeNames = Object.keys(pageFileByPlaceName);

    searchInput.addEventListener("input", (event) => {
      const searchTerm = event.currentTarget.value.toLowerCase().trim();
      suggestionsContainer.innerHTML = "";
      if (!searchTerm) return;

      const matchingPlaceNames = placeNames.filter((placeName) =>
        placeName.toLowerCase().includes(searchTerm)
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

    document.addEventListener("click", (event) => {
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
        (placeName) => placeName.toLowerCase() === searchTerm.toLowerCase()
      );
      const pageFileName = matchingPlaceName
        ? pageFileByPlaceName[matchingPlaceName]
        : null;

      if (pageFileName) {
        window.location.href = `./html/${pageFileName}`;
      } else {
        alert(
          "Vui lòng kiểm tra lại tên địa danh hoặc tham khảo ở 3 nút bấm có chữ lớp 10, lớp 11, lớp 12 trong trang."
        );
        console.log("Không thấy đường dẫn liên quan!");
      }
    }

    searchButton.addEventListener("click", handlePlaceSearch);

    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        handlePlaceSearch();
      }
    });
  }
}

function initHeaderFooter() {
  const pageFileByPlaceName = buildPageMap();
  const assetBasePath = "./";

  renderHeader(assetBasePath);
  renderFooter();
  attachSearch(pageFileByPlaceName);
}

document.addEventListener("DOMContentLoaded", initHeaderFooter);
