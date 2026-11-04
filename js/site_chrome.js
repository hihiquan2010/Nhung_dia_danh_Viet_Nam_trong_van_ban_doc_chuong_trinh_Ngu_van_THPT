import { buildPageMap, menuData } from "./data.js";

export function renderSiteHeader(
  assetBasePath,
  { includeMenu = false } = {},
) {
  const headerContainer = document.getElementById("header");
  if (!headerContainer) return;

  headerContainer.innerHTML = `
    <div id="top" class="widgetbar site-header">
      <div class="widgets">
        <a class="site-brand" href="${assetBasePath}index.html" aria-label="Dấu Chân Văn Học - Trang chủ">
          <img src="${assetBasePath}webico/android-icon-36x36.png" alt="" />
        </a>
        <nav class="site-nav" aria-label="Điều hướng chính">
          <a href="${assetBasePath}index.html">
            <i class="fa-solid fa-house" aria-hidden="true"></i>
            <span class="icon-text">Trang chủ</span>
          </a>
          <a href="">
            <i class="fa-solid fa-rotate" aria-hidden="true"></i>
            <span class="icon-text">Làm mới</span>
          </a>
          <a href="${assetBasePath}html/game.html">
            <i class="fa-solid fa-gamepad" aria-hidden="true"></i>
            <span class="icon-text">Trò chơi</span>
          </a>
          <a href="${assetBasePath}community.html">
            <i class="fa-solid fa-comments" aria-hidden="true"></i>
            <span class="icon-text">Cộng đồng</span>
          </a>
        </nav>
        ${includeMenu ? '<div id="menu"></div>' : ""}
      </div>
      <div class="search-group">
        <span class="searchbar">
          <input type="search" id="search" class="inp" placeholder="Tìm kiếm địa danh ..." aria-label="Tìm kiếm địa danh" autocomplete="off" />
          <div id="bangdexuat" class="danhsachdx"></div>
        </span>
        <button id="submit" class="btn" type="button" aria-label="Tìm kiếm">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `;
}

export function renderSiteFooter({ includeStats = false } = {}) {
  const footerContainer = document.getElementById("footer");
  if (!footerContainer) return;

  footerContainer.innerHTML = `
    <div class="site-footer">
      <a class="site-back-to-top" href="#top">
        <i class="fa-solid fa-up-long" aria-hidden="true"></i>
        <b>Quay về đầu trang</b>
      </a>
      <div class="infoGroup">
        <div class="site-footer-info">
          <p>
            <i class="fa-solid fa-school" aria-hidden="true"></i>
            <b>Đơn vị: Trường THPT Bình Chánh</b>
          </p>
          <p>
            <i class="fa-solid fa-user-group" aria-hidden="true"></i>
            Nhóm thực hiện: Phạm Gia Uy 11A3 và Trần Thanh Duy 12A16
          </p>
        </div>
        ${includeStats ? '<div id="histats_counter" aria-label="Lượt truy cập"></div>' : ""}
      </div>
    </div>
  `;
}

export function attachSiteSearch(assetBasePath) {
  const searchInput = document.getElementById("search");
  const searchButton = document.getElementById("submit");
  const suggestionsContainer = document.getElementById("bangdexuat");
  if (!searchInput || !searchButton || !suggestionsContainer) return;

  const pageFileBySearchTerm = { ...buildPageMap() };
  menuData.forEach((gradeEntry) => {
    gradeEntry.works.forEach((literaryWork) => {
      if (literaryWork.link?.startsWith("./html/")) {
        pageFileBySearchTerm[literaryWork.name] =
          literaryWork.link.split("/").pop();
      }
    });
  });
  const searchTerms = Object.keys(pageFileBySearchTerm);

  searchInput.addEventListener("input", (event) => {
    const searchTerm = event.currentTarget.value.toLowerCase().trim();
    suggestionsContainer.replaceChildren();
    if (!searchTerm) return;

    searchTerms
      .filter((name) => name.toLowerCase().includes(searchTerm))
      .forEach((name) => {
        const suggestion = document.createElement("div");
        suggestion.className = "nddx";
        suggestion.textContent = name;
        suggestion.addEventListener("click", () => {
          searchInput.value = name;
          suggestionsContainer.replaceChildren();
        });
        suggestionsContainer.appendChild(suggestion);
      });
  });

  document.addEventListener("click", (event) => {
    if (
      !searchInput.contains(event.target) &&
      !suggestionsContainer.contains(event.target)
    ) {
      suggestionsContainer.replaceChildren();
    }
  });

  function handleSearch() {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
      alert("Hãy nhập tên địa danh!");
      return;
    }

    const matchingName = searchTerms.find(
      (name) => name.toLowerCase() === searchTerm.toLowerCase(),
    );
    const pageFileName = matchingName
      ? pageFileBySearchTerm[matchingName]
      : null;

    if (!pageFileName) {
      alert(
        "Vui lòng kiểm tra lại tên địa danh hoặc tham khảo ở 3 nút bấm có chữ lớp 10, lớp 11, lớp 12 trong trang.",
      );
      return;
    }

    window.location.href = `${assetBasePath}html/${pageFileName}`;
  }

  searchButton.addEventListener("click", handleSearch);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      handleSearch();
    }
  });
}
