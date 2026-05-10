import { supabase } from "./supabase.js";

export async function fetchLeaderboard(range = "all_time") {
  let query = supabase.from("profiles").select("id, username, xp, level, streak, avatar_url");

  if (range === "weekly") {
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("updated_at", lastWeek);
  }

  const { data, error } = await query.order("xp", { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}

export function renderTop3(container, users) {
  container.innerHTML = "";
  users.slice(0, 3).forEach((u, idx) => {
    const medals = ["🥇", "🥈", "🥉"];
    const el = document.createElement("div");
    el.className = `podium podium-${idx + 1}`;
    el.innerHTML = `
      <div class="medal">${medals[idx]}</div>
      <img src="${u.avatar_url || "https://placehold.co/80x80?text=?"}" class="avatar lg" alt="avatar" />
      <h4>${u.username}</h4>
      <p>XP ${u.xp} • Lv ${u.level} • 🔥 ${u.streak}</p>
    `;
    container.appendChild(el);
  });
}

export function renderLeaderboardList(listEl, users) {
  listEl.innerHTML = "";
  users.forEach((u, idx) => {
    const li = document.createElement("li");
    li.className = "leader-row";
    li.innerHTML = `
      <span class="rank">#${idx + 1}</span>
      <img src="${u.avatar_url || "https://placehold.co/40x40?text=?"}" class="avatar sm" alt="avatar" />
      <span class="name">${u.username}</span>
      <span class="meta">Lv ${u.level}</span>
      <span class="meta">🔥 ${u.streak}</span>
      <span class="xp">${u.xp} XP</span>
    `;
    listEl.appendChild(li);
  });
}