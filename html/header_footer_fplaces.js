import { menuData } from "../js/data.js";

document.addEventListener("DOMContentLoaded", function () {
  const rootPath = "../";
  const basePath = "./";

  // --- 2. RENDER HEADER (Bao gồm icon, chỗ chứa Menu và thanh Tìm kiếm) ---
  const headerContainer = document.getElementById("header");

  if (headerContainer) {
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
          
          <!-- Đây là nơi menu.js trước đó đổ dữ liệu vào -->
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

  // --- 3. RENDER MENU VÀO TRONG <div id="menu"> ---
  const menuContainer = document.getElementById("menu");
  if (menuContainer) {
    let menuHtml = `<div class="menu-container"><ul class="menu" id="menuList">`;

    menuData.forEach((gradeItem) => {
      menuHtml += `
        <li>
          <a tabindex="0" id="${gradeItem.id}">${gradeItem.grade}</a>
          <ul class="tacPham" id="${gradeItem.kId}">
      `;

      gradeItem.works.forEach((work) => {
        const workLink = work.link
          ? `<a href="${work.link}" target="_blank">${work.name}</a>`
          : `<a>${work.name}</a>`;

        menuHtml += `
          <li tabindex="0">
            ${workLink}
            <ul class="diaDanh">
        `;

        work.places.forEach((place) => {
          const fileName = place.url.split("/").pop();
          const dynamicUrl = basePath + fileName;
          menuHtml += `<li><a href="${dynamicUrl}" target="_self">${place.name}</a></li>`;
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

    menuHtml += `</ul></div>`;
    menuContainer.innerHTML = menuHtml;
  }

  // --- 4. RENDER FOOTER ---
  const footer = document.getElementById("footer");
  if (footer) {
    footer.innerHTML = `
      <span class="icon">
      <a href="#" style="display: block; color: #9c4128; text-decoration: none">
        <i class="fa-solid fa-up-long"></i>
        <b>Quay về đầu trang</b>
      </a>
    </span>

    <div class="infoGroup">
      <b><p id="dv">
          <i class="fa-solid fa-school"></i> Đơn vị: Trường THPT Bình Chánh
        </p></b>
      <pre></pre>
      <p>Nhóm thực hiện: Phạm Gia Uy 11A3 và Trần Thanh Duy 12A16</p>
      <pre></pre>
      <i><p>&copy; Web được phát triển bởi nhóm học sinh THPT Bình Chánh</p></i>
    </div>
    `;
  }

  // --- 5. TẠO DỮ LIỆU TÌM KIẾM (PAGEMAP) VÀ SỰ KIỆN TÌM KIẾM ---
  const pageMap = {};
  menuData.forEach((gradeItem) => {
    if (gradeItem.works) {
      gradeItem.works.forEach((work) => {
        if (work.places) {
          work.places.forEach((place) => {
            const fileName = place.url.split("/").pop();
            pageMap[place.name] = fileName;
          });
        }
      });
    }
  });

  const input = document.getElementById("search");
  const btn = document.getElementById("submit");
  const bangdx = document.getElementById("bangdexuat");

  if (input && btn && bangdx) {
    const dataList = Object.keys(pageMap);

    // Xử lý gợi ý khi gõ phím
    input.addEventListener("input", function () {
      const ainput = this.value.toLowerCase().trim();
      bangdx.innerHTML = "";
      if (!ainput) return;

      const matches = dataList.filter((tacpham) =>
        tacpham.toLowerCase().includes(ainput),
      );

      matches.forEach((match) => {
        const tpgoiy = document.createElement("div");
        tpgoiy.classList.add("nddx");
        tpgoiy.textContent = match;

        tpgoiy.addEventListener("click", function () {
          input.value = match;
          bangdx.innerHTML = "";
        });

        bangdx.appendChild(tpgoiy);
      });
    });

    // Ẩn bảng gợi ý khi click ra ngoài
    document.addEventListener("click", function (e) {
      if (e.target !== input) {
        bangdx.innerHTML = "";
      }
    });

    // Xử lý nút tìm kiếm
    btn.addEventListener("click", function () {
      const inpval = input.value.trim();

      if (!inpval) {
        alert("Hãy nhập tên địa danh!");
        return;
      }

      const fileName = pageMap[inpval];
      if (fileName) {
        window.location.href = basePath + fileName;
      } else {
        alert(
          "Vui lòng kiểm tra lại tên địa danh hoặc tham khảo ở 3 nút bấm có chữ lớp 10, lớp 11, lớp 12 trong trang.",
        );
      }
    });
  }
});
