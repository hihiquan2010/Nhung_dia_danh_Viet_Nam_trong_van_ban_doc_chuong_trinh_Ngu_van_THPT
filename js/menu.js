import { menuData, resolvePlaceUrl } from "./data.js";

function buildMenuHtml() {
  let html = `<div class="menu-container"><ul class="menu" id="menuList">`;

  menuData.forEach((gradeItem) => {
    html += `
      <li>
        <a tabindex="0" id="${gradeItem.id}">${gradeItem.grade}</a>
        <ul class="tacPham" id="${gradeItem.kId}">
    `;

    gradeItem.works.forEach((work) => {
      const workLink = work.link
        ? `<a href="${work.link}" target="_blank">${work.name}</a>`
        : `<a>${work.name}</a>`;

      html += `
        <li tabindex="0">
          ${workLink}
          <ul class="diaDanh">
      `;

      work.places.forEach((place) => {
        const dynamicUrl = resolvePlaceUrl(place.url);
        html += `<li><a href="${dynamicUrl}" target="_self">${place.name}</a></li>`;
      });

      html += `
          </ul>
        </li>
      `;
    });

    html += `
        </ul>
      </li>
    `;
  });

  html += `</ul></div>`;
  return html;
}

export function renderMenu() {
  const container = document.getElementById("menu");
  if (!container) return;

  container.innerHTML = buildMenuHtml();
}

// Tự động chạy khi tải trang
document.addEventListener("DOMContentLoaded", renderMenu);
