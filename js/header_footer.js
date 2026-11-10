import {
  attachSiteSearch,
  refreshSiteChromeStylesheet,
  renderSiteFooter,
  renderSiteHeader,
} from "./site_chrome.js?v=footer-redesign-20261111";

function initHistats() {
  if (!document.getElementById("histats_counter")) return;

  window._Hasync = window._Hasync || [];
  window._Hasync.push(["Histats.start", "1,5053294,4,383,112,48,00011110"]);
  window._Hasync.push(["Histats.fasi", "1"]);
  window._Hasync.push(["Histats.track_hits", ""]);

  if (document.getElementById("histats-script")) return;

  const histatsScript = document.createElement("script");
  histatsScript.id = "histats-script";
  histatsScript.type = "text/javascript";
  histatsScript.async = true;
  histatsScript.src = "//s10.histats.com/js15_as.js";
  (document.head || document.body).appendChild(histatsScript);
}

function initHeaderFooter() {
  const assetBasePath = window.location.pathname.includes("/html/")
    ? "../"
    : "./";
  refreshSiteChromeStylesheet();
  renderSiteHeader(assetBasePath);
  renderSiteFooter({ includeStats: assetBasePath === "./" });
  attachSiteSearch(assetBasePath);
  initHistats();
}

document.addEventListener("DOMContentLoaded", initHeaderFooter);
