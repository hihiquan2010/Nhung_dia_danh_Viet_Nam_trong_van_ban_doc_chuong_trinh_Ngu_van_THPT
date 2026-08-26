// --- XÁC ĐỊNH ĐƯỜNG DẪN TƯƠNG ĐỐI ---
function getRootPath() {
  const isHtmlFolder = window.location.pathname.includes("/html/");
  return isHtmlFolder ? "../" : "./";
}

// --- TỰ ĐỘNG CHÈN ICON VÀO THẺ <HEAD> ---
function injectHeadIcons() {
  const rootPath = getRootPath();

  const headIcons = `
    <link rel="apple-touch-icon" sizes="57x57" href="${rootPath}webico/apple-icon-57x57.png" />
    <link rel="apple-touch-icon" sizes="60x60" href="${rootPath}webico/apple-icon-60x60.png" />
    <link rel="apple-touch-icon" sizes="72x72" href="${rootPath}webico/apple-icon-72x72.png" />
    <link rel="apple-touch-icon" sizes="76x76" href="${rootPath}webico/apple-icon-76x76.png" />
    <link rel="apple-touch-icon" sizes="114x114" href="${rootPath}webico/apple-icon-114x114.png" />
    <link rel="apple-touch-icon" sizes="120x120" href="${rootPath}webico/apple-icon-120x120.png" />
    <link rel="apple-touch-icon" sizes="144x144" href="${rootPath}webico/apple-icon-144x144.png" />
    <link rel="apple-touch-icon" sizes="152x152" href="${rootPath}webico/apple-icon-152x152.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="${rootPath}webico/apple-icon-180x180.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="${rootPath}webico/android-icon-192x192.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="${rootPath}webico/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="96x96" href="${rootPath}webico/favicon-96x96.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="${rootPath}webico/favicon-16x16.png" />
    <link rel="manifest" href="${rootPath}webico/manifest.json" />
    <meta name="msapplication-TileColor" content="#ffffff" />
    <meta name="msapplication-TileImage" content="${rootPath}webico/ms-icon-144x144.png" />
    <meta name="theme-color" content="#ffffff" />
  `;

  document.head.insertAdjacentHTML("beforeend", headIcons);
}

injectHeadIcons();
