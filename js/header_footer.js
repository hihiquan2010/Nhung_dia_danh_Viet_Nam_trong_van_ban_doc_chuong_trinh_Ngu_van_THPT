import { buildPageMap } from "./data.js";

function renderHeader(rootPath) {
  const headerContainer = document.getElementById("header");

  if (/*DEBUG*/ headerContainer) {
    headerContainer.innerHTML = `
      <span class="widgetbar">
        <div class="widgets">
          <!-- Sử dụng đường dẫn động rootPath -->
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
}

function attachSearch(pageMap) {
  // Phần Khai Báo Tính Năng Tìm Kiếm
  const input = document.getElementById("search");
  const btn = document.getElementById("submit");
  const bangdx = document.getElementById("bangdexuat");

  if (/*DEBUG*/ input && btn && bangdx) {
    // Danh sách các địa danh lấy từ pageMap đã tạo ở bước 1
    const data = Object.keys(pageMap);

    // Lọc từ khóa người dùng nhập vào và gợi ý
    input.addEventListener("input", function () {
      const ainput = this.value.toLowerCase().trim();
      bangdx.innerHTML = "";
      if (!ainput) return;

      const matches = data.filter((tacpham) =>
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

    // Bỏ trống gợi ý khi click ra ngoài
    document.addEventListener("click", function (e) {
      if (e.target !== input) {
        bangdx.innerHTML = "";
      }
    });

    // Đưa người dùng đến file địa danh người dùng nhập
    btn.addEventListener("click", function () {
      const inpval = input.value.trim();

      if (!inpval) {
        alert("Hãy nhập tên địa danh!");
        return;
      }

      // Lấy tên file tương ứng với địa danh
      const fileName = pageMap[inpval];

      if (fileName) {
        const htmlFolderDir = "./html/";
        window.location.href = htmlFolderDir + fileName;
      } else {
        alert(
          "Vui lòng kiểm tra lại tên địa danh hoặc tham khảo ở 3 nút bấm có chữ lớp 10, lớp 11, lớp 12 trong trang.",
        );
        console.log("Không thấy đường dẫn liên quan!");
      }
    });
  }
}

function initHeaderFooter() {
  const pageMap = buildPageMap();
  const rootPath = "./";

  renderHeader(rootPath);
  renderFooter();
  attachSearch(pageMap);
}

document.addEventListener("DOMContentLoaded", initHeaderFooter);
