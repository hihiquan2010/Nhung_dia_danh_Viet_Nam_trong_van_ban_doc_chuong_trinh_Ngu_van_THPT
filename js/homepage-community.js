import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const communityLink = document.querySelector(".community-link");
const announcementsSection = document.getElementById("site-announcements");
const announcementsList = document.getElementById("site-announcements-list");
const closeAnnouncementsButton = document.getElementById("close-announcements");
const SEEN_ANNOUNCEMENTS_KEY = "diadanhvanhoc.seen-announcements";
let openAnnouncementIds = [];

function getSeenAnnouncementIds() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(SEEN_ANNOUNCEMENTS_KEY) || "[]",
    );
    return new Set(
      Array.isArray(stored)
        ? stored.filter((id) => typeof id === "string")
        : [],
    );
  } catch (error) {
    console.warn("Could not read dismissed homepage announcements.", error);
    return new Set();
  }
}

function markAnnouncementsSeen() {
  if (!openAnnouncementIds.length) return;

  const seenIds = getSeenAnnouncementIds();
  for (const id of openAnnouncementIds) seenIds.add(id);
  try {
    localStorage.setItem(
      SEEN_ANNOUNCEMENTS_KEY,
      JSON.stringify([...seenIds]),
    );
  } catch (error) {
    console.warn("Could not save dismissed homepage announcements.", error);
  }
}

if (closeAnnouncementsButton && announcementsSection) {
  closeAnnouncementsButton.addEventListener("click", () => {
    announcementsSection.close();
  });
  announcementsSection.addEventListener("close", markAnnouncementsSeen);
}

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  supabase.auth.onAuthStateChange((_event, session) => {
    if (communityLink) communityLink.hidden = Boolean(session);
  });

  try {
    const { data: announcements, error } = await supabase
      .from("site_announcements")
      .select("id, title, body, created_at")
      .eq("is_active", true)
      .order("starts_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    const seenIds = getSeenAnnouncementIds();
    const unreadAnnouncements = announcements.filter(
      (announcement) => !seenIds.has(announcement.id),
    );

    if (unreadAnnouncements.length && announcementsSection?.showModal) {
      openAnnouncementIds = unreadAnnouncements.map(
        (announcement) => announcement.id,
      );
      for (const announcement of unreadAnnouncements) {
        const article = document.createElement("article");
        article.className = "site-announcement";
        const ornament = document.createElement("span");
        ornament.className = "site-announcement-ornament";
        ornament.setAttribute("aria-hidden", "true");
        ornament.textContent = "❦";
        const title = document.createElement("h3");
        title.textContent = announcement.title;
        const body = document.createElement("p");
        body.textContent = announcement.body;
        const date = document.createElement("time");
        date.className = "site-announcement-date";
        date.dateTime = announcement.created_at;
        date.textContent = new Intl.DateTimeFormat("vi-VN", {
          dateStyle: "long",
        }).format(new Date(announcement.created_at));
        article.append(ornament, title, body, date);
        announcementsList.append(article);
      }
      announcementsSection.showModal();
    } else if (unreadAnnouncements.length) {
      console.error("This browser does not support announcement dialogs.");
    }
  } catch (error) {
    console.error("Could not load homepage announcements.", error);
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Could not check the homepage auth session.", error);
  } else if (communityLink) {
    communityLink.hidden = Boolean(data.session);
  }
}
