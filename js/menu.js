import { menuData, resolvePlaceUrl } from "./data.js";

function buildMenuHtml() {
  let menuMarkup = `<div class="menu-container"><ul class="menu" id="menuList">`;

  menuData.forEach((gradeEntry) => {
    menuMarkup += `
      <li>
        <a tabindex="0" id="${gradeEntry.id}">${gradeEntry.grade}</a>
        <ul class="tacPham" id="${gradeEntry.kId}">
    `;

    gradeEntry.works.forEach((literaryWork) => {
      const isLocalWorkPage = literaryWork.link?.startsWith("./html/");
      const workUrl = isLocalWorkPage
        ? resolvePlaceUrl(literaryWork.link)
        : literaryWork.link;
      const workLinkMarkup = workUrl
        ? `<a href="${workUrl}" target="${isLocalWorkPage ? "_self" : "_blank"}"${isLocalWorkPage ? "" : ' class="require-double-click" rel="noopener noreferrer"'}>${literaryWork.name}</a>`
        : `<a>${literaryWork.name}</a>`;

      menuMarkup += `
        <li tabindex="0">
          ${workLinkMarkup}
          <ul class="diaDanh">
      `;

      literaryWork.places.forEach((place) => {
        const placeUrl = resolvePlaceUrl(place.url);
        menuMarkup += `<li><a href="${placeUrl}" target="_self">${place.name}</a></li>`;
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

  menuMarkup += `</ul></div>`;
  return menuMarkup;
}

export function renderMenu() {
  const container = document.getElementById("menu");
  if (!container) return;

  container.innerHTML = buildMenuHtml();

  container.addEventListener("click", (event) => {
    const workMapLink = event.target.closest("a.require-double-click");

    if (workMapLink && !workMapLink.dataset.clickedOnce) {
      event.preventDefault();
      workMapLink.dataset.clickedOnce = "true";

      const originalLinkMarkup = workMapLink.innerHTML;
      workMapLink.innerHTML = `${originalLinkMarkup} (Xác nhận xem bản đồ trực quan ?)`;
      workMapLink.style.color = "red";

      setTimeout(() => {
        workMapLink.dataset.clickedOnce = "";
        workMapLink.innerHTML = originalLinkMarkup;
        workMapLink.style.color = "";
      }, 3000);
    }
  });
}

document.addEventListener("DOMContentLoaded", renderMenu);
