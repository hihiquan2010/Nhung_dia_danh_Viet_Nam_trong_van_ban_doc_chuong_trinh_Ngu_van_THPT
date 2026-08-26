// Đây là code gốc để lên ý tưởng rồi tách dần thành các file js khác của nhóm có thể còn sai sót , nhóm khắc phục khi tách thành các file nhỏ lẻ khác để code đỡ dài hơn,dễ quản lí :<>=)

// // const toggleBtn = document.getElementById("toggleBtn");
// // const menuList = document.getElementById("menuList");

// // toggleBtn.addEventListener("click", function () {
// //   menuList.classList.toggle("open");
// // });

// //-----------------------------\\
// const data = [
//   // lớp 10
//   "Núi Thạch Môn",
//   "Hàm Tử",
//   "Sông Bạch Đằng",
//   "Vùng Lam Sơn",
//   "Linh Sơn",
//   "Bồ Đằng",
//   "Trà Lân",
//   "Tây Kinh",
//   "Thăng Long",
//   "Hà Đông",
//   "Đông Đô",
//   "Ninh Kiều",
//   "Tốt Động",
//   "Chi Lăng",
//   "Mã An",
//   "Lạng Giang",
//   "Xương Giang,Bình Than",
//   "Xương Giang",
//   "Cần Trạm",
//   "Khôi Huyện",
//   "Huyện Yên Dũng Đất Lạng Giang",
//   "Huyện Yên Dũng",
//   "Đền Tản Viên",
//   "Thành Đông Quan",
//   "Cửa Hiền Quan",
//   "Núi Dục Thúy",
//   "Dục Thúy Sơn",
//   "Đình Bảng",
//   "Bia Lam Sơn",
//   "Lăng Tẩm",
//   "Pho tượng Trấn Vũ",
//   "Chùa Phật Tích",
//   "Bút Tháp",
//   "Chùa Phật Tích Bút Tháp",
//   "Hà Đông",
//   "Chùa Tây Phương",
//   "Chùa Cói",
//   // Lớp 11
//   // "Nam Định",
//   "Làng Vũ Đại",
//   "Chợ Lớn",
//   "Nhà lao Thừa Phủ",
//   "Sông Hồng(Vùng Chèm - Vẽ)",
//   "Tây Bắc",
//   "Thăng Long",
//   "Hồ Tây",
//   "Sông Hương",
//   "Núi Kim Phụng",
//   "Châu Hoá",
//   "Ngọc Trản",
//   "Chùa Thiên Mụ",
//   "Vọng Cảnh",
//   "Tam Thai",
//   "Lựu Bảo",
//   "Kim Long",
//   "Cồn Giã Viên",
//   "Cồn Hến",
//   "Bao Vinh",
//   "Phú Xuân",
//   "Cà Mau",
//   "Sài Gòn",
//   "Huế",
//   "Hà Nội",
//   "Hải Phòng",
//   "Nam Định",
//   "Vĩnh Kim Đông",
//   "Hậu Giang",
//   "Mỹ Tho",
//   "Vĩnh Long",
//   "Sa Đéc",
//   "Cần Giuộc",
//   "Chùa Tông Thạnh",
//   // lop 12
//   "Sông Mã",
//   "Sài Khao",
//   "Mường Lát",
//   "Pha Luông",
//   "Mường Hịch",
//   "Mai Châu",
//   "Châu Mộc",
//   "Mộc Châu",
//   "Quảng Trị",
//   "Yên Bái",
//   "Cao Bằng",
//   "Đồng Hới",
//   "Vĩnh Linh",
//   "Quảng Trị",
//   "Hà Nội ",
//   "Thanh Hoá",
//   "Hà Tĩnh",
//   "Đèo Đá Đẽo",
//   "Quảng Bình",
//   "Vĩnh Linh",
//   "Thanh Hoá",
//   "Sông Chu",
//   "Yên Lộ",
// ];
// // khung nhập liệu
// const input = document.querySelector(
//   ".header .widgetbar .search-group .searchbar #search",
// );
// // nút tìm kiếm
// const btn = document.querySelector(".header .widgetbar .search-group #submit");

// // bảng gợi ý
// const bangdx = document.querySelector(
//   ".header .widgetbar .search-group .searchbar #bangdexuat",
// );

// input.addEventListener("input", function () {
//   const ainput = this.value.toLowerCase();
//   bangdx.innerHTML = "";
//   if (!ainput) return;

//   const matches = data.filter((tacpham) =>
//     tacpham.toLowerCase().includes(ainput),
//   );

//   matches.forEach((match) => {
//     const tpgoiy = document.createElement("div");
//     tpgoiy.classList.add("nddx");
//     tpgoiy.textContent = match;

//     tpgoiy.addEventListener("click", function () {
//       input.value = match;
//       bangdx.innerHTML = "";
//     });

//     bangdx.appendChild(tpgoiy);
//   });
// });

// document.addEventListener("click", function (e) {
//   if (e.target !== input) {
//     bangdx.innerHTML = "";
//   }
// });

// btn.addEventListener("click", function () {
//   const inpval = input.value.trim();

//   if (!inpval) {
//     alert("Hãy nhập tên tác phẩm!");
//   }
//   const currentPath = window.location.pathname;
//   switch (inpval) {
//     // Địa Danh TTT
//     case "Núi Thạch Môn":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Nui_Thach_Mon.html";
//       } else {
//         window.location.href = "./html/Nui_Thach_Mon.html";
//       }
//       break;
//     // Địa danh BNDC
//     case "Hàm Tử":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Ham_Tu.html";
//       } else {
//         window.location.href = "./html/Ham_Tu.html";
//       }
//       break;
//     case "Sông Bạch Đằng":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Song_Bach_Dang.html";
//       } else {
//         window.location.href = "./html/Song_Bach_Dang.html";
//       }
//       break;
//     case "Vùng Lam Sơn":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Vung_Lam_Son.html";
//       } else {
//         window.location.href = "./html/Vung_Lam_Son.html";
//       }
//       break;
//     case "Linh Sơn":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Linh_Son.html";
//       } else {
//         window.location.href = "./html/Linh_Son.html";
//       }
//       break;
//     case "Bồ Đằng":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Bo_Dang.html";
//       } else {
//         window.location.href = "./html/Bo_Dang.html";
//       }
//       break;
//     case "Trà Lân":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Tra_Lan.html";
//       } else {
//         window.location.href = "./html/Tra_Lan.html";
//       }
//       break;
//     case "Tây Kinh":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Tay_Kinh.html";
//       } else {
//         window.location.href = "./html/Tay_Kinh.html";
//       }
//       break;
//     case "Hà Đông":
//     case "Đông Đô":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Dong_Do.html";
//       } else {
//         window.location.href = "./html/Dong_Do.html";
//       }
//       break;
//     case "Ninh Kiều":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Ninh_Kieu.html";
//       } else {
//         window.location.href = "./html/Ninh_Kieu.html";
//       }
//       break;
//     case "Tốt Động":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Tot_Dong.html";
//       } else {
//         window.location.href = "./html/Tot_Dong.html";
//       }
//       break;
//     case "Chi Lăng":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Chi_Lang.html";
//       } else {
//         window.location.href = "./html/Chi_Lang.html";
//       }
//       break;
//     case "Mã An":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Ma_An.html";
//       } else {
//         window.location.href = "./html/Ma_An.html";
//       }
//       break;
//     case "Lạng Giang":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Lang_Giang.html";
//       } else {
//         window.location.href = "./html/Lang_Giang.html";
//       }
//       break;
//     case "Xương Giang":
//     case "Xương Giang,Bình Than":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Xuong_Giang_Binh_Than.html";
//       } else {
//         window.location.href = "./html/Xuong_Giang_Binh_Than.html";
//       }
//       break;
//     case "Cần Trạm":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Can_Tram.html";
//       } else {
//         window.location.href = "./html/Can_Tram.html";
//       }
//       break;
//     case "Khôi Huyện":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Khoi_Huyen.html";
//       } else {
//         window.location.href = "./html/Khoi_Huyen.html";
//       }
//       break;
//     // Địa danh TVTPSL
//     case "Đền Tản Viên":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Den_Tan_Vien.html";
//       } else {
//         window.location.href = "./html/Den_Tan_Vien.html";
//       }
//       break;
//     case "Huyện Yên Dũng":
//     case "Huyện Yên Dũng Đất Lạng Giang":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Huyen_Yen_Dung_Dat_Lang_Giang.html";
//       } else {
//         window.location.href = "./html/Huyen_Yen_Dung_Dat_Lang_Giang.html";
//       }
//       break;
//     case "Thành Đông Quan":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Thanh_Dong_Quan.html";
//       } else {
//         window.location.href = "./html/Thanh_Dong_Quan.html";
//       }
//       break;
//     // HTLNKCQG
//     case "Cửa Hiền Quan":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Cua_Hien_Quan.html";
//       } else {
//         window.location.href = "./html/Cua_Hien_Quan.html";
//       }
//       break;
//     // DTS
//     case "Dục Thúy Sơn":
//     case "Núi Dục Thúy":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Nui_Duc_Thuy.html";
//       } else {
//         window.location.href = "./html/Nui_Duc_Thuy.html";
//       }
//       break;
//     // NTTTCNV
//     case "Đình Bảng":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Dinh_Bang.html";
//       } else {
//         window.location.href = "./html/Dinh_Bang.html";
//       }
//       break;
//     case "Bia Lam Sơn":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Bia_Lam_Son.html";
//       } else {
//         window.location.href = "./html/Bia_Lam_Son.html";
//       }
//       break;
//     case "Lăng Tẩm":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Lang_Tam.html";
//       } else {
//         window.location.href = "./html/Lang_Tam.html";
//       }
//       break;
//     case "Pho tượng Trấn Vũ":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Pho_Tuong_Tran_Vu.html";
//       } else {
//         window.location.href = "./html/Pho_Tuong_Tran_Vu.html";
//       }
//       break;
//     case "Chùa Phật Tích":
//     case "Bút Tháp":
//     case "Chùa Phật Tích Bút Tháp":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Chua_Phat_Tich_But_Thap.html";
//       } else {
//         window.location.href = "./html/Chua_Phat_Tich_But_Thap.html";
//       }
//       break;
//     case "Chùa Tây Phương":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Chua_Tay_Phuong.html";
//       } else {
//         window.location.href = "./html/Chua_Tay_Phuong.html";
//       }
//       break;
//     case "Chùa Cói":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Chua_Coi.html";
//       } else {
//         window.location.href = "./html/Chua_Coi.html";
//       }
//       break;
//     // Lop 11
//     // -------------------
//     case "Nam Định":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Nam_Dinh.html";
//       } else {
//         window.location.href = "./html/Nam_Dinh.html";
//       }
//       break;
//     case "Làng Vũ Đại":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Lang_Vu_Dai.html";
//       } else {
//         window.location.href = "./html/Lang_Vu_Dai.html";
//       }
//       break;
//     case "Chợ Lớn":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Cho_Lon.html";
//       } else {
//         window.location.href = "./html/Cho_Lon.html";
//       }
//       break;
//     case "Nhà lao Thừa Phủ":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Nha_Lao_Thua_Phu.html";
//       } else {
//         window.location.href = "./html/Nha_Lao_Thua_Phu.html";
//       }
//       break;
//     case "Sông Hồng(Vùng Chèm - Vẽ)":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Song_Hong.html";
//       } else {
//         window.location.href = "./html/Song_Hong.html";
//       }
//       break;
//     case "Tây Bắc":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Tay_Bac.html";
//       } else {
//         window.location.href = "./html/Tay_Bac.html";
//       }
//       break;
//     case "Thăng Long":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Thang_Long.html";
//       } else {
//         window.location.href = "./html/Thang_Long.html";
//       }
//       break;
//     case "Hồ Tây":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Ho_Tay.html";
//       } else {
//         window.location.href = "./html/Ho_Tay.html";
//       }
//       break;
//     case "Sông Hương":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Song_Huong.html";
//       } else {
//         window.location.href = "./html/Song_Huong.html";
//       }
//       break;
//     case "Núi Kim Phụng":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Nui_Kim_Phung.html";
//       } else {
//         window.location.href = "./html/Nui_Kim_Phung.html";
//       }
//       break;
//     case "Châu Hoá":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Chau_Hoa.html";
//       } else {
//         window.location.href = "./html/Chau_Hoa.html";
//       }
//       break;
//     case "Ngọc Trản":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Ngoc_Tran.html";
//       } else {
//         window.location.href = "./html/Ngoc_Tran.html";
//       }
//       break;
//     case "Chùa Thiên Mụ":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Chua_Thien_Mu.html";
//       } else {
//         window.location.href = "./html/Chua_Thien_Mu.html";
//       }
//       break;
//     case "Vọng Cảnh":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Vong_Canh.html";
//       } else {
//         window.location.href = "./html/Vong_Canh.html";
//       }
//       break;
//     case "Tam Thai":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Tam_Thai.html";
//       } else {
//         window.location.href = "./html/Tam_Thai.html";
//       }
//       break;
//     case "Lựu Bảo":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Luu_Bao.html";
//       } else {
//         window.location.href = "./html/Luu_Bao.html";
//       }
//       break;
//     case "Kim Long":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Kim_Long.html";
//       } else {
//         window.location.href = "./html/Kim_Long.html";
//       }
//       break;
//     case "Cồn Giã Viên":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Con_Gia_Vien.html";
//       } else {
//         window.location.href = "./html/Con_Gia_Vien.html";
//       }
//       break;
//     case "Cồn Hến":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Con_Hen.html";
//       } else {
//         window.location.href = "./html/Con_Hen.html";
//       }
//       break;
//     case "Bao Vinh":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Bao_Vinh.html";
//       } else {
//         window.location.href = "./html/Bao_Vinh.html";
//       }
//       break;
//     case "Phú Xuân":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Phu_Xuan.html";
//       } else {
//         window.location.href = "./html/Phu_Xuan.html";
//       }
//       break;
//     case "Cà Mau":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Ca_Mau.html";
//       } else {
//         window.location.href = "./html/Ca_Mau.html";
//       }
//       break;
//     case "Sài Gòn":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Sai_Gon.html";
//       } else {
//         window.location.href = "./html/Sai_Gon.html";
//       }
//       break;
//     case "Huế":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Hue.html";
//       } else {
//         window.location.href = "./html/Hue.html";
//       }
//       break;
//     case "Hà Nội":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Ha_Noi.html";
//       } else {
//         window.location.href = "./html/Ha_Noi.html";
//       }
//       break;
//     case "Hải Phòng":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Hai_Phong.html";
//       } else {
//         window.location.href = "./html/Hai_Phong.html";
//       }
//       break;
//     case "Nam Định":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Nam_Dinh.html";
//       } else {
//         window.location.href = "./html/Nam_Dinh.html";
//       }
//       break;
//     case "Vĩnh Kim Đông":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Vinh_Kim_Dong.html";
//       } else {
//         window.location.href = "./html/Vinh_Kim_Dong.html";
//       }
//       break;
//     case "Hậu Giang":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Hau_Giang.html";
//       } else {
//         window.location.href = "./html/Hau_Giang.html";
//       }
//       break;
//     case "Mỹ Tho":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/My_Tho.html";
//       } else {
//         window.location.href = "./html/My_Tho.html";
//       }
//       break;
//     case "Vĩnh Long":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Vinh_Long.html";
//       } else {
//         window.location.href = "./html/Vinh_Long.html";
//       }
//       break;
//     case "Sa Đéc":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Sa_Dec.html";
//       } else {
//         window.location.href = "./html/Sa_Dec.html";
//       }
//       break;
//     case "Cần Giuộc":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Can_Giuoc.html";
//       } else {
//         window.location.href = "./html/Can_Giuoc.html";
//       }
//       break;
//     case "Chùa Tông Thạnh":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Chua_Tong_Thanh.html";
//       } else {
//         window.location.href = "./html/Chua_Tong_Thanh.html";
//       }
//       break;
//     // Lop 12
//     // # --------------------------------------#
//     case "Sông Mã":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Song_Ma.html";
//       } else {
//         window.location.href = "./html/Song_Ma.html";
//       }
//       break;
//     case "Sài Khao":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Sai_Khao.html";
//       } else {
//         window.location.href = "./html/Sai_Khao.html";
//       }
//       break;
//     case "Mường Lát":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Muong_Lat.html";
//       } else {
//         window.location.href = "./html/Muong_Lat.html";
//       }
//       break;
//     case "Pha Luông":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Pha_Luong.html";
//       } else {
//         window.location.href = "./html/Pha_Luong.html";
//       }
//       break;
//     case "Mường Hịch":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Muong_Hich.html";
//       } else {
//         window.location.href = "./html/Muong_Hich.html";
//       }
//       break;
//     case "Mai Châu":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Mai_Chau.html";
//       } else {
//         window.location.href = "./html/Mai_Chau.html";
//       }
//       break;
//     case "Mộc Châu":
//     case "Châu Mộc":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Chau_Moc.html";
//       } else {
//         window.location.href = "./html/Chau_Moc.html";
//       }
//       break;
//     case "Quảng Trị":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Quang_Tri.html";
//       } else {
//         window.location.href = "./html/Quang_Tri.html";
//       }
//       break;
//     case "Yên Bái":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Yen_Bai.html";
//       } else {
//         window.location.href = "./html/Yen_Bai.html";
//       }
//       break;
//     case "Cao Bằng":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Cao_Bang.html";
//       } else {
//         window.location.href = "./html/Cao_Bang.html";
//       }
//       break;
//     case "Đồng Hới":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Dong_Hoi.html";
//       } else {
//         window.location.href = "./html/Dong_Hoi.html";
//       }
//       break;
//     case "Vĩnh Linh":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Vinh_Linh.html";
//       } else {
//         window.location.href = "./html/Vinh_Linh.html";
//       }
//       break;
//     case "Hà Nội ":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Ha_Noi.html";
//       } else {
//         window.location.href = "./html/Ha_Noi.html";
//       }
//       break;
//     case "Thanh Hoá":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Thanh_Hoa.html";
//       } else {
//         window.location.href = "./html/Thanh_Hoa.html";
//       }
//       break;
//     case "Hà Tĩnh":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Ha_Tinh.html";
//       } else {
//         window.location.href = "./html/Ha_Tinh.html";
//       }
//       break;
//     case "Đèo Đá Đẽo":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Deo_Da_Deo.html";
//       } else {
//         window.location.href = "./html/Deo_Da_Deo.html";
//       }
//       break;
//     case "Quảng Bình":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Quang_Binh.html";
//       } else {
//         window.location.href = "./html/Quang_Binh.html";
//       }
//       break;
//     case "Vĩnh Linh":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Vinh_Linh.html";
//       } else {
//         window.location.href = "./html/Vinh_Linh.html";
//       }
//       break;
//     case "Thanh Hoá":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Thanh_Hoa.html";
//       } else {
//         window.location.href = "./html/Thanh_Hoa.html";
//       }
//       break;
//     case "Sông Chu":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Song_Chu.html";
//       } else {
//         window.location.href = "./html/Song_Chu.html";
//       }
//       break;
//     case "Yên Lộ":
//       if (currentPath.includes("/html/")) {
//         window.location.href = "../html/Yen_Lo.html";
//       } else {
//         window.location.href = "./html/Yen_Lo.html";
//       }
//       break;
//     default:
//       console.warn(
//         "Vui lòng kiểm tra lại tên địa danh hoặc tham khảo ở thanh tác phẩm phía bên phải",
//       );
//       console.log("Không thấy đường dẫn liên quan!");
//   }
// });
