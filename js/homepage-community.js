import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const communityLink = document.querySelector(".community-link");
const announcementsSection = document.getElementById("site-announcements");
const announcementsList = document.getElementById("site-announcements-list");

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  supabase.auth.onAuthStateChange((_event, session) => {
    if (communityLink) communityLink.hidden = Boolean(session);
  });

  try {
    const { data: announcements, error } = await supabase
      .from("site_announcements")
      .select("title, body")
      .eq("is_active", true)
      .order("starts_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    if (announcements.length) {
      for (const announcement of announcements) {
        const article = document.createElement("article");
        article.className = "site-announcement";
        const title = document.createElement("h3");
        title.textContent = announcement.title;
        const body = document.createElement("p");
        body.textContent = announcement.body;
        article.append(title, body);
        announcementsList.append(article);
      }
      announcementsSection.hidden = false;
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
