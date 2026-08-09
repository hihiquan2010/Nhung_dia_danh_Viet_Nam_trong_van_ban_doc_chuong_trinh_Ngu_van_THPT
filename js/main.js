const toggleBtn = document.getElementById("toggleBtn");
const menuList = document.getElementById("menuList");

toggleBtn.addEventListener("click", function () {
  menuList.classList.toggle("open");
});

//-----------------------------\\
const data = [
  // lớp 10
  "Núi Thạch Môn",
  "Hàm Tử",
  "Sông Bạch Đằng",
  "Vùng Lam Sơn",
  "Linh Sơn",
  "Bồ Đằng",
  "Trà Lân",
  "Tây Kinh",
  "Thăng Long",
  "Hà Đông",
  "Đông Đô",
  "Ninh Kiều",
  "Tốt Động",
  "Chi Lăng",
  "Mã An",
  "Lạng Giang",
  "Xương Giang,Bình Than",
  "Xương Giang",
  "Cần Trạm",
  "Khôi Huyện",
  "Huyện Yên Dũng Đất Lạng Giang",
  "Huyện Yên Dũng",
  "Đền Tản Viên",
  "Thành Đông Quan",
  "Cửa Hiền Quan",
  "Núi Dục Thúy",
  "Dục Thúy Sơn",
  "Đình Bảng",
  "Bia Lam Sơn",
  "Lăng Tẩm",
  "Pho tượng Trấn Vũ",
  "Chùa Phật Tích",
  "Bút Tháp",
  "Chùa Phật Tích Bút Tháp",
  "Hà Đông",
  "Chùa Tây Phương",
  "Chùa Cói",
  // Lớp 11
  "Nam Định",
  "Làng Vũ Đại",
  "Chợ Lớn",
  "Nhà lao Thừa Phủ",
  "Sông Hồng(Vùng Chèm - Vẽ)",
  "Tây Bắc",
  "Thăng Long",
  "Hồ Tây",
];
// khung nhập liệu
const input = document.querySelector(
  ".widgetbar .search-group .searchbar #search",
);
// nút tìm kiếm
const btn = document.querySelector(".widgetbar .search-group #submit");

// bảng gợi ý
const bangdx = document.querySelector(
  ".widgetbar .search-group .searchbar #bangdexuat",
);

input.addEventListener("input", function () {
  const ainput = this.value.toLowerCase();
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

document.addEventListener("click", function (e) {
  if (e.target !== input) {
    bangdx.innerHTML = "";
  }
});

btn.addEventListener("click", function () {
  const inpval = input.value.trim();

  if (!inpval) {
    alert("Hãy nhập tên tác phẩm!");
  }
  const currentPath = window.location.pathname;
  switch (inpval) {
    // Địa Danh TTT
    case "Núi Thạch Môn":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Nui_Thach_Mon.html";
      } else {
        window.location.href = "./html/Nui_Thach_Mon.html";
      }
      break;
    // Địa danh BNDC
    case "Hàm Tử":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Ham_Tu.html";
      } else {
        window.location.href = "./html/Ham_Tu.html";
      }
      break;
    case "Sông Bạch Đằng":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Song_Bach_Dang.html";
      } else {
        window.location.href = "./html/Song_Bach_Dang.html";
      }
      break;
    case "Vùng Lam Sơn":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Vung_Lam_Son.html";
      } else {
        window.location.href = "./html/Vung_Lam_Son.html";
      }
      break;
    case "Linh Sơn":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Linh_Son.html";
      } else {
        window.location.href = "./html/Linh_Son.html";
      }
      break;
    case "Bồ Đằng":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Bo_Dang.html";
      } else {
        window.location.href = "./html/Bo_Dang.html";
      }
      break;
    case "Trà Lân":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Tra_Lan.html";
      } else {
        window.location.href = "./html/Tra_Lan.html";
      }
      break;
    case "Tây Kinh":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Tay_Kinh.html";
      } else {
        window.location.href = "./html/Tay_Kinh.html";
      }
      break;
    case "Hà Đông":
    case "Đông Đô":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Dong_Do.html";
      } else {
        window.location.href = "./html/Dong_Do.html";
      }
      break;
    case "Ninh Kiều":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Ninh_Kieu.html";
      } else {
        window.location.href = "./html/Ninh_Kieu.html";
      }
      break;
    case "Tốt Động":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Tot_Dong.html";
      } else {
        window.location.href = "./html/Tot_Dong.html";
      }
      break;
    case "Chi Lăng":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Chi_Lang.html";
      } else {
        window.location.href = "./html/Chi_Lang.html";
      }
      break;
    case "Mã An":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Ma_An.html";
      } else {
        window.location.href = "./html/Ma_An.html";
      }
      break;
    case "Lạng Giang":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Lang_Giang.html";
      } else {
        window.location.href = "./html/Lang_Giang.html";
      }
      break;
    case "Xương Giang":
    case "Xương Giang,Bình Than":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Xuong_Giang_Binh_Than.html";
      } else {
        window.location.href = "./html/Xuong_Giang_Binh_Than.html";
      }
      break;
    case "Cần Trạm":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Can_Tram.html";
      } else {
        window.location.href = "./html/Can_Tram.html";
      }
      break;
    case "Khôi Huyện":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Khoi_Huyen.html";
      } else {
        window.location.href = "./html/Khoi_Huyen.html";
      }
      break;
    // Địa danh TVTPSL
    case "Đền Tản Viên":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Den_Tan_Vien.html";
      } else {
        window.location.href = "./html/Den_Tan_Vien.html";
      }
      break;
    case "Huyện Yên Dũng":
    case "Huyện Yên Dũng Đất Lạng Giang":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Huyen_Yen_Dung_Dat_Lang_Giang.html";
      } else {
        window.location.href = "./html/Huyen_Yen_Dung_Dat_Lang_Giang.html";
      }
      break;
    case "Thành Đông Quan":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Thanh_Dong_Quan.html";
      } else {
        window.location.href = "./html/Thanh_Dong_Quan.html";
      }
      break;
    // HTLNKCQG
    case "Cửa Hiền Quan":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Cua_Hien_Quan.html";
      } else {
        window.location.href = "./html/Cua_Hien_Quan.html";
      }
      break;
    // DTS
    case "Dục Thúy Sơn":
    case "Núi Dục Thúy":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Nui_Duc_Thuy.html";
      } else {
        window.location.href = "./html/Nui_Duc_Thuy.html";
      }
      break;
    // NTTTCNV
    case "Đình Bảng":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Dinh_Bang.html";
      } else {
        window.location.href = "./html/Dinh_Bang.html";
      }
      break;
    case "Bia Lam Sơn":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Bia_Lam_Son.html";
      } else {
        window.location.href = "./html/Bia_Lam_Son.html";
      }
      break;
    case "Lăng Tẩm":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Lang_Tam.html";
      } else {
        window.location.href = "./html/Lang_Tam.html";
      }
      break;
    case "Pho tượng Trấn Vũ":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Pho_Tuong_Tran_Vu.html";
      } else {
        window.location.href = "./html/Pho_Tuong_Tran_Vu.html";
      }
      break;
    case "Chùa Phật Tích":
    case "Bút Tháp":
    case "Chùa Phật Tích Bút Tháp":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Chua_Phat_Tich_But_Thap.html";
      } else {
        window.location.href = "./html/Chua_Phat_Tich_But_Thap.html";
      }
      break;
    case "Chùa Tây Phương":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Chua_Tay_Phuong.html";
      } else {
        window.location.href = "./html/Chua_Tay_Phuong.html";
      }
      break;
    case "Chùa Cói":
      if (currentPath.includes("/html/")) {
        window.location.href = "../html/Chua_Coi.html";
      } else {
        window.location.href = "./html/Chua_Coi.html";
      }
      break;
    default:
      console.warn(
        "Vui lòng kiểm tra lại tên địa danh hoặc tham khảo ở thanh tác phẩm phía bên phải",
      );
      console.log("Không thấy đường dẫn liên quan!");
  }
});
