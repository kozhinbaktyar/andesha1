// ===== سیستەمی چوونەژوورەوە بەبێ Firebase Authentication =====
// ستافەکان لە Realtime Database دا خەزن دەکرێن: staff/<username> = { name, role, salt, hash }
// پاسۆرد هەرگیز بە دەقی ئاسایی خەزن ناکرێت (PBKDF2-SHA256 + salt).
import { db } from "./firebase-config.js";
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const SESSION_KEY = "sa_session";
const ITERATIONS = 100000;

const toHex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) => new Uint8Array(hex.match(/.{2}/g).map(h => parseInt(h, 16)));

export function makeSalt() { return toHex(crypto.getRandomValues(new Uint8Array(16))); }

export async function hashPassword(password, saltHex) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS, salt: fromHex(saltHex) }, key, 256);
    return toHex(bits);
}

export const normalizeUsername = (u) => String(u || "").trim().toLowerCase();
export const isValidUsername = (u) => /^[a-z0-9_-]{3,30}$/.test(u);

function authError(code, message) { return Object.assign(new Error(message), { code }); }

// ===== دروستکردن / گۆڕینی پاسۆرد =====
export async function createStaff({ username, name, password, role }) {
    username = normalizeUsername(username);
    if (!isValidUsername(username)) throw authError("bad-username", "ناوی بەکارهێنەر دەبێت ٣ بۆ ٣٠ پیتی ئینگلیزی (a-z)، ژمارە، _ یان - بێت.");
    if (String(password).length < 6) throw authError("weak-password", "پاسۆرد دەبێت لانیکەم ٦ پیت بێت.");
    const existing = await get(ref(db, "staff/" + username));
    if (existing.exists()) throw authError("exists", "ئەم ناوی بەکارهێنەرە پێشتر بەکارهاتووە.");
    const salt = makeSalt();
    const hash = await hashPassword(password, salt);
    await set(ref(db, "staff/" + username), { name, username, role, salt, hash, createdAt: Date.now() });
    return username;
}

export async function setPassword(username, newPassword) {
    if (String(newPassword).length < 6) throw authError("weak-password", "پاسۆرد دەبێت لانیکەم ٦ پیت بێت.");
    const salt = makeSalt();
    const hash = await hashPassword(newPassword, salt);
    await update(ref(db, "staff/" + username), { salt, hash });
    return hash;
}

export async function changeOwnPassword(username, oldPassword, newPassword) {
    await login(username, oldPassword);            // دڵنیابوونەوە لە پاسۆردی کۆن
    const hash = await setPassword(username, newPassword);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username, hash }));
}

// ===== چوونەژوورەوە =====
export async function login(username, password) {
    username = normalizeUsername(username);
    const bad = () => authError("bad-credentials", "ناوی بەکارهێنەر یان پاسۆرد هەڵەیە.");
    if (!isValidUsername(username)) throw bad();
    const snap = await get(ref(db, "staff/" + username));
    if (!snap.exists()) throw bad();
    const rec = snap.val();
    if (!rec.salt || !rec.hash) throw bad();
    const hash = await hashPassword(password, rec.salt);
    if (hash !== rec.hash) throw bad();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username, hash }));
    return staffObject(username, rec);
}

function staffObject(username, rec) {
    return {
        uid: username,
        username,
        name: rec.name || username,
        email: rec.email || "",
        phone: rec.phone || "",
        role: rec.role || "staff"
    };
}

// ئایا ڕۆژی چوونەژوورەوە هێشتا دروستە؟ (null ئەگەر نا)
export async function verifySession() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) {}
    if (!s || !s.username || !s.hash) return null;
    const snap = await get(ref(db, "staff/" + s.username));
    if (!snap.exists()) return null;
    const rec = snap.val();
    if (rec.hash !== s.hash) return null;
    return staffObject(s.username, rec);
}

// ===== پاسەوانی پەڕەکان (هەمان ناوی پێشوو) =====
export function requireStaffAuth(options = {}) {
    const { requireAdmin = false, allowTeacher = false } = options;

    return new Promise(async (resolve) => {
        try {
            const staff = await verifySession();

            if (!staff) {
                localStorage.removeItem(SESSION_KEY);
                goToLogin();
                return;
            }
            // مامۆستا تەنها ماڵپەڕی خۆی بەکاردەهێنێت
            if (staff.role === "teacher" && !allowTeacher) {
                window.location.href = "teacher.html";
                return;
            }
            if (requireAdmin && staff.role !== "admin") {
                alert("ئەم بەشە تەنها بۆ بەڕێوەبەرە.");
                window.location.href = "home.html";
                return;
            }
            resolve(staff);
        } catch (error) {
            console.error("هەڵە لە پشکنینی ستاف:", error);
            alert("هەڵە لە پەیوەندی بە Database: " + error.message);
            goToLogin();
        }
    });
}

function goToLogin() {
    const currentPage = location.pathname.split("/").pop();
    window.location.href = "index.html?redirect=" + encodeURIComponent(currentPage);
}

export function logout(redirect) {
    // ئەگەر وەک event handler بانگ کرا، redirect دەبێت event؛ پشتگوێی دەخەین
    const target = typeof redirect === "string" ? redirect : "index.html";
    localStorage.removeItem(SESSION_KEY);
    window.location.href = target;
}
