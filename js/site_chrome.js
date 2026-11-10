import { buildPageMap, menuData } from "./data.js";

export function refreshSiteChromeStylesheet() {
  const stylesheet = Array.from(
    document.querySelectorAll('link[rel="stylesheet"]'),
  ).find((link) => new URL(link.href).pathname.endsWith("/css/style.css"));
  if (!stylesheet) return;

  const stylesheetUrl = new URL(stylesheet.href);
  stylesheetUrl.searchParams.set("v", "footer-redesign-20261111");
  stylesheet.href = stylesheetUrl.href;
}

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
  const footerTagName = footerContainer.tagName === "FOOTER" ? "div" : "footer";

  footerContainer.innerHTML = `
    <${footerTagName} class="site-footer">
      <div class="site-footer-inner">
        <div class="site-footer-heading">
          <span class="site-footer-mark" aria-hidden="true">
            <i class="fa-solid fa-book-open"></i>
          </span>
          <div>
            <p class="site-footer-name">Dấu Chân Văn Học</p>
            <p class="site-footer-tagline">Theo dấu những miền đất trong trang văn.</p>
          </div>
        </div>
        <div class="site-footer-content">
        <div class="site-footer-info">
          <div class="site-footer-detail">
            <span class="site-footer-detail-icon" aria-hidden="true">
              <i class="fa-solid fa-school"></i>
            </span>
            <p>
              <span class="site-footer-label">Đơn vị</span>
              <strong>Trường THPT Bình Chánh</strong>
            </p>
          </div>
          <div class="site-footer-detail">
            <span class="site-footer-detail-icon" aria-hidden="true">
              <i class="fa-solid fa-user-group"></i>
            </span>
            <p>
              <span class="site-footer-label">Nhóm thực hiện</span>
              <strong>Phạm Gia Uy 11A3 và Trần Thanh Duy 12A16</strong>
            </p>
          </div>
        </div>
        ${
          includeStats
            ? `<section class="site-footer-stats" aria-label="Thống kê lượt truy cập">
                <span class="site-footer-label">Lượt truy cập</span>
                <div id="histats_counter" aria-label="Bộ đếm lượt truy cập"></div>
              </section>`
            : ""
        }
        </div>
        <div class="site-footer-bottom">
          <span class="site-footer-note">Cảm ơn bạn đã cùng khám phá.</span>
          <a class="site-back-to-top" href="#top">
            <span>Quay về đầu trang</span>
            <i class="fa-solid fa-arrow-up" aria-hidden="true"></i>
          </a>
        </div>
      </div>
    </${footerTagName}>
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
