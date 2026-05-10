import { supabase } from "./supabase.js";
import { login, logout, register, getSessionUser } from "./auth.js";
import {
  ensureProfile,
  getMyProfile,
  updateMyProgress,
  uploadAvatar,
  removeAvatar
} from "./profile.js";
import {
  fetchLeaderboard,
  renderLeaderboardList,
  renderTop3
} from "./leaderboard.js";

const authCard = document.getElementById("authCard");
const appCard = document.getElementById("appCard");
const authMessage = document.getElementById("authMessage");
const profileMessage = document.getElementById("profileMessage");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const showLogin = document.getElementById("showLogin");
const showRegister = document.getElementById("showRegister");

const usernameText = document.getElementById("usernameText");
const statsText = document.getElementById("statsText");
const avatarImg = document.getElementById("avatarImg");

const uploadAvatarBtn = document.getElementById("uploadAvatarBtn");
const removeAvatarBtn = document.getElementById("removeAvatarBtn");
const avatarFileInput = document.getElementById("avatarFile");
const logoutBtn = document.getElementById("logoutBtn");

const top3El = document.getElementById("top3");
const leaderboardList = document.getElementById("leaderboardList");
const rangeTabs = document.querySelectorAll("[data-range]");

let currentRange = "all_time";
let currentUser = null;

function setAuthMode(mode) {
  const isLogin = mode === "login";
  loginForm.classList.toggle("hidden", !isLogin);
  registerForm.classList.toggle("hidden", isLogin);
  showLogin.classList.toggle("active", isLogin);
  showRegister.classList.toggle("active", !isLogin);
  authMessage.textContent = "";
}

function setMessage(el, msg, isError = false) {
  el.textContent = msg || "";
  el.style.color = isError ? "#ff6b6b" : "#9ef5b1";
}

async function renderProfile(userId) {
  const profile = await getMyProfile(userId);
  usernameText.textContent = profile.username;
  statsText.textContent = `XP ${profile.xp} • Level ${profile.level} • 🔥 ${profile.streak}`;
  avatarImg.src = profile.avatar_url || "https://placehold.co/64x64?text=?";
}

async function renderBoard() {
  const users = await fetchLeaderboard(currentRange);
  renderTop3(top3El, users);
  renderLeaderboardList(leaderboardList, users);
}

async function onAuthenticated(user) {
  currentUser = user;

  await ensureProfile(user);
  await renderProfile(user.id);
  await renderBoard();

  authCard.classList.add("hidden");
  appCard.classList.add("show");
}

function onSignedOut() {
  currentUser = null;

  authCard.classList.remove("hidden");
  appCard.classList.remove("show");

  setAuthMode("login");
}

/* ---------------- AUTH UI ---------------- */

showLogin.addEventListener("click", () => setAuthMode("login"));
showRegister.addEventListener("click", () => setAuthMode("register"));

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    await login({ email, password });

    setMessage(authMessage, "Logged in successfully.");
  } catch (err) {
    setMessage(authMessage, err.message, true);
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const username = document.getElementById("registerUsername").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    await register({ username, email, password });

    setMessage(authMessage, "Registered. Check email to verify account.");
  } catch (err) {
    setMessage(authMessage, err.message, true);
  }
});

/* ---------------- LOGOUT ---------------- */

logoutBtn.addEventListener("click", async () => {
  try {
    await logout();
  } catch (err) {
    setMessage(profileMessage, err.message, true);
  }
});

/* ---------------- AVATAR ---------------- */

uploadAvatarBtn.addEventListener("click", async () => {
  try {
    const file = avatarFileInput.files?.[0];
    if (!file) return setMessage(profileMessage, "Select image first", true);

    await uploadAvatar(currentUser.id, file);

    await renderProfile(currentUser.id);
    await renderBoard();

    setMessage(profileMessage, "Avatar updated");
  } catch (err) {
    setMessage(profileMessage, err.message, true);
  }
});

removeAvatarBtn.addEventListener("click", async () => {
  try {
    await removeAvatar(currentUser.id);

    await renderProfile(currentUser.id);
    await renderBoard();

    setMessage(profileMessage, "Avatar removed");
  } catch (err) {
    setMessage(profileMessage, err.message, true);
  }
});

/* ---------------- LEADERBOARD ---------------- */

rangeTabs.forEach((btn) => {
  btn.addEventListener("click", async () => {
    currentRange = btn.dataset.range;

    rangeTabs.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    await renderBoard();
  });
});

/* ---------------- GLOBAL SYNC ---------------- */

window.syncSupabaseProgress = async ({ xp, level, streak, progress }) => {
  if (!currentUser) return;

  try {
    await updateMyProgress(currentUser.id, { xp, level, streak, progress });

    await renderProfile(currentUser.id);
    await renderBoard();
  } catch (err) {
    setMessage(profileMessage, `Sync failed: ${err.message}`, true);
  }
};

/* ---------------- FIX: AUTH STATE ---------------- */

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    await onAuthenticated(session.user);
  } else {
    onSignedOut();
  }
});

/* ---------------- FIX: SESSION RECOVERY ---------------- */

async function restoreSession() {
  // 🔥 תופס session גם אחרי email redirect (GitHub Pages fix)
  await supabase.auth.getSessionFromUrl?.({ storeSession: true });

  const { data } = await supabase.auth.getSession();

  if (data?.session?.user) {
    await onAuthenticated(data.session.user);
  } else {
    onSignedOut();
  }
}

/* ---------------- START ---------------- */

restoreSession();
