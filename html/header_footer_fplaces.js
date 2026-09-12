import { menuData } from "../js/data.js";

const rootPath = "../";
const basePath = "./";

function getFileNameFromUrl(url) {
  return url.split("/").pop();
}

function getPageUrl(fileName) {
  const currentPath = window.location.pathname.replace(/\\/g, "/");
  return currentPath.includes("/html/")
    ? `./${fileName}`
    : `./html/${fileName}`;
}

function createMenuMarkup() {
  let menuHtml = '<div class="menu-container"><ul class="menu" id="menuList">';

  menuData.forEach((gradeItem) => {
    menuHtml += `
      <li>
        <a tabindex="0" id="${gradeItem.id}">${gradeItem.grade}</a>
        <ul class="tacPham" id="${gradeItem.kId}">
    `;

    gradeItem.works.forEach((work) => {
      const workLink = work.link
        ? `<a href="${work.link}" target="_blank" class="require-double-click">${work.name}</a>`
        : `<a>${work.name}</a>`;

      menuHtml += `
        <li tabindex="0">
          ${workLink}
          <ul class="diaDanh">
      `;

      work.places.forEach((place) => {
        const fileName = getFileNameFromUrl(place.url);
        menuHtml += `<li><a href="${getPageUrl(fileName)}" target="_self">${place.name}</a></li>`;
      });

      menuHtml += `
          </ul>
        </li>
      `;
    });

    menuHtml += `
        </ul>
      </li>
    `;
  });

  return `${menuHtml}</ul></div>`;
}

function setupMenuInteractions(menuContainer) {
  menuContainer.addEventListener("click", (event) => {
    const targetLink = event.target.closest("a.require-double-click");

    if (!targetLink || targetLink.dataset.clickedOnce) return;

    event.preventDefault();
    targetLink.dataset.clickedOnce = "true";
    targetLink.dataset.originalText = targetLink.innerHTML;
    targetLink.innerHTML = `${targetLink.dataset.originalText} <span style="font-size: 0.85em;">(Xác nhận xem bản đồ trực quan ?)</span>`;
    targetLink.style.color = "red";

    setTimeout(() => {
      targetLink.dataset.clickedOnce = "";
      targetLink.innerHTML = targetLink.dataset.originalText;
      targetLink.style.color = "";
    }, 3000);
  });

  menuContainer.querySelectorAll(".tacPham .diaDanh a").forEach((link) => {
    if (localStorage.getItem(link.href) === "visited") {
      link.insertAdjacentHTML(
        "beforeend",
        " <span style='color: green; font-size: 0.8em;'>(Đã xem)</span>",
      );
    }

    link.addEventListener("click", () => {
      localStorage.setItem(link.href, "visited");
    });
  });
}

function renderHeader() {
  const headerContainer = document.getElementById("header");

  if (!headerContainer) return;

  headerContainer.innerHTML = `
    <span class="widgetbar">
      <div class="widgets">
        <img src="${rootPath}webico/android-icon-36x36.png" alt="web_icon" style="border-radius: 10px;">
        <span class="icon">
          <a href="${rootPath}index.html">
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
  const footer = document.getElementById("footer");

  if (!footer) return;

  footer.innerHTML = `
    <span class="icon">
      <a href="#" style="display: block; color: #9c4128; text-decoration: none">
        <i class="fa-solid fa-up-long"></i>
        <b>Quay về đầu trang</b>
      </a>
    </span>

    <div class="infoGroup">
      <b><p id="dv"><i class="fa-solid fa-school"></i> Đơn vị: Trường THPT Bình Chánh</p></b>
      <p><i class="fa-solid fa-user-group"></i> Nhóm thực hiện: Phạm Gia Uy 11A3 và Trần Thanh Duy 12A16</p>
    </div>
  `;
}

function createPageMap() {
  return menuData.reduce((map, gradeItem) => {
    gradeItem.works.forEach((work) => {
      work.places.forEach((place) => {
        map[place.name] = getFileNameFromUrl(place.url);
      });
    });
    return map;
  }, {});
}

function setupSearch() {
  const input = document.getElementById("search");
  const btn = document.getElementById("submit");
  const bangdx = document.getElementById("bangdexuat");

  if (!input || !btn || !bangdx) return;

  const pageMap = createPageMap();
  const dataList = Object.keys(pageMap);

  input.addEventListener("input", function () {
    const keyword = this.value.toLowerCase().trim();
    bangdx.innerHTML = "";

    if (!keyword) return;

    const matches = dataList.filter((name) =>
      name.toLowerCase().includes(keyword),
    );

    matches.forEach((match) => {
      const suggestion = document.createElement("div");
      suggestion.classList.add("nddx");
      suggestion.textContent = match;
      suggestion.addEventListener("click", () => {
        input.value = match;
        bangdx.innerHTML = "";
      });
      bangdx.appendChild(suggestion);
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target !== input && !event.target.closest(".nddx")) {
      bangdx.innerHTML = "";
    }
  });

  btn.addEventListener("click", function () {
    const keyword = input.value.trim();

    if (!keyword) {
      alert("Hãy nhập tên địa danh!");
      return;
    }

    const fileName = pageMap[keyword];

    if (fileName) {
      window.location.href = getPageUrl(fileName);
      return;
    }

    alert(
      "Vui lòng kiểm tra lại tên địa danh hoặc tham khảo ở 3 nút bấm có chữ lớp 10, lớp 11, lớp 12 trong trang.",
    );
  });
}

function getAllPlaces() {
  return menuData.flatMap((gradeItem) =>
    gradeItem.works.flatMap((work) =>
      work.places.map((place) => {
        const fileName = getFileNameFromUrl(place.url);

        return {
          name: place.name,
          fileName,
          url: getPageUrl(fileName),
          workName: work.name,
          grade: gradeItem.grade,
        };
      }),
    ),
  );
}

function getCurrentPlace(allPlaces) {
  const currentPath = window.location.pathname.toLowerCase();

  return allPlaces.find((place) =>
    currentPath.endsWith(place.fileName.toLowerCase()),
  );
}

function getRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffleArray(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function getRecommendedPlaces(count = 3) {
  const allPlaces = getAllPlaces();
  const currentPlace = getCurrentPlace(allPlaces);

  if (!currentPlace) {
    return shuffleArray(allPlaces).slice(0, count);
  }

  const sameWorkPlaces = allPlaces.filter(
    (place) =>
      place.workName === currentPlace.workName &&
      place.url !== currentPlace.url,
  );
  const otherWorkPlaces = allPlaces.filter(
    (place) => place.workName !== currentPlace.workName,
  );
  const recommendations = [];
  const usedUrls = new Set([currentPlace.url]);

  for (let i = 0; i < count; i += 1) {
    const randomValue = Math.random();
    const availableSame = sameWorkPlaces.filter(
      (place) => !usedUrls.has(place.url),
    );
    const availableOther = otherWorkPlaces.filter(
      (place) => !usedUrls.has(place.url),
    );

    let selected = null;

    if (randomValue < 0.6 && availableSame.length > 0) {
      selected = getRandomItem(availableSame);
      selected.isSameWork = true;
    } else if (availableOther.length > 0) {
      selected = getRandomItem(availableOther);
      selected.isSameWork = false;
    } else if (availableSame.length > 0) {
      selected = getRandomItem(availableSame);
      selected.isSameWork = true;
    }

    if (selected) {
      usedUrls.add(selected.url);
      recommendations.push(selected);
    }
  }

  return recommendations;
}

function renderRecommendations() {
  const recommendedList = getRecommendedPlaces(3);

  if (recommendedList.length === 0) return "";

  const cardsHTML = recommendedList
    .map(
      (item) => `
        <div class="recommend-card" onclick="window.location.href='${item.url}'">
          <div class="recommend-badge ${item.isSameWork ? "same-work" : "other-work"}">
            ${item.isSameWork ? "Cùng tác phẩm" : "Gợi ý khám phá"}
          </div>
          <h4 class="recommend-title">${item.name}</h4>
          <p class="recommend-meta">📖 ${item.workName} • <span class="recommend-grade">${item.grade}</span></p>
          <a href="${item.url}" class="recommend-btn">Khám phá ngay ➔</a>
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
        ${cardsHTML}
      </div>
    </section>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderMenu();
  renderFooter();
  setupSearch();

  const recommendHTML = renderRecommendations();
  const footerElement = document.getElementById("footer");

  if (recommendHTML) {
    if (footerElement) {
      footerElement.insertAdjacentHTML("beforebegin", recommendHTML);
    } else {
      document.body.insertAdjacentHTML("beforeend", recommendHTML);
    }
  }
});
