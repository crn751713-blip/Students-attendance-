import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where,
  addDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// TODO: ដាក់ Firebase Web App config របស់អ្នកនៅទីនេះ (មិនមែន Service Account)
const firebaseConfig = {
  apiKey: "AIzaSyDayIjfXISI8892kS-4psHnqrJgJZft0NM",
  authDomain: "student-attendance-it.firebaseapp.com",
  projectId: "student-attendance-it",
  storageBucket: "student-attendance-it.firebasestorage.app",
  messagingSenderId: "587490385957",
  appId: "1:587490385957:web:76d56a8299ae02db5c1fcc",
  measurementId: "G-VJPCBVNXZC"
};
const IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/nkyzdthlb";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null, currentProfile = null, isAdmin = false;

const $ = id => document.getElementById(id);
const today = () => new Date().toLocaleDateString("en-CA");
$("attendanceDate").value = today();
$("reportDate").value = today();

function showMessage(id, msg, error=false) {
  const el = $(id); el.textContent = msg; el.style.color = error ? "#b42318" : "#2457d6";
}
function aliasEmail(id) { return `${id.trim().toLowerCase()}@attendance.local`; }
function escapeHtml(s="") { return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
function switchTab(id) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("hidden", p.id !== id));
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === id));
}
document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  showMessage("loginMessage", "កំពុង Login...");
  try {
    const id = $("loginId").value.trim();
    await signInWithEmailAndPassword(auth, aliasEmail(id), $("loginPassword").value);
  } catch (err) { showMessage("loginMessage", "Login មិនបានទេ៖ " + err.message, true); }
});
$("logoutBtn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (!user) {
    $("loginView").classList.remove("hidden"); $("appView").classList.add("hidden"); $("logoutBtn").classList.add("hidden");
    return;
  }
  try {
    const token = await user.getIdTokenResult(true);
    isAdmin = token.claims.admin === true;
    const snap = await getDoc(doc(db, "users", user.uid));
    currentProfile = snap.exists() ? snap.data() : { displayName: user.displayName || "User", role: isAdmin ? "admin" : "student" };
    $("loginView").classList.add("hidden"); $("appView").classList.remove("hidden"); $("logoutBtn").classList.remove("hidden");
    $("welcomeTitle").textContent = `សូមស្វាគមន៍ ${currentProfile.displayName || ""}`;
    $("welcomeMeta").textContent = `ID: ${currentProfile.studentId || ""}`;
    $("roleBadge").textContent = isAdmin ? "ADMIN" : "STUDENT";
    document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", !isAdmin));
    $("profileName").value = currentProfile.displayName || "";
    $("telegram").value = currentProfile.telegram || "";
    $("profilePreview").src = currentProfile.photoURL || "https://placehold.co/120x120?text=Photo";
    await loadAttendance();
    await loadMyReports();
    if (isAdmin) { await loadStudents(); await loadAllReports(); }
  } catch (err) { alert("មិនអាចទាញយក Profile បាន៖ " + err.message); }
});

async function getUploadAuth() {
  const idToken = await currentUser.getIdToken();
  const r = await fetch("/api/upload-auth", { method:"POST", headers:{ Authorization:`Bearer ${idToken}` } });
  const data = await r.json(); if (!r.ok) throw new Error(data.error || "Upload auth failed");
  return data;
}
async function uploadImage(file, folder) {
  if (!file) throw new Error("សូមជ្រើសរើសរូបភាព");
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("អនុញ្ញាតតែ JPG, PNG ឬ WEBP");
  if (file.size > 2 * 1024 * 1024) throw new Error("រូបភាពត្រូវតូចជាង 2 MB");
  const signed = await getUploadAuth();
  const form = new FormData();
  form.append("file", file); form.append("fileName", `${folder}-${Date.now()}.jpg`);
  form.append("publicKey", signed.publicKey); form.append("token", signed.token);
  form.append("expire", signed.expire); form.append("signature", signed.signature);
  form.append("folder", `/student-attendance/${folder}`);
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method:"POST", body:form });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Image upload failed");
  return result.url;
}
$("profileFile").addEventListener("change", () => {
  const f = $("profileFile").files[0]; if (f) $("profilePreview").src = URL.createObjectURL(f);
});
$("saveProfileBtn").addEventListener("click", async () => {
  try {
    let photoURL = currentProfile.photoURL || "";
    if ($("profileFile").files[0]) photoURL = await uploadImage($("profileFile").files[0], "profiles");
    await updateDoc(doc(db, "users", currentUser.uid), {
      displayName: $("profileName").value.trim(),
      telegram: $("telegram").value.trim().replace(/^@/,""),
      photoURL
    });
    currentProfile = { ...currentProfile, displayName:$("profileName").value.trim(), telegram:$("telegram").value.trim().replace(/^@/,""), photoURL };
    $("profilePreview").src = photoURL || "https://placehold.co/120x120?text=Photo";
    showMessage("profileMessage", "រក្សាទុក Profile បានជោគជ័យ។");
  } catch(e) { showMessage("profileMessage", e.message, true); }
});

async function loadAttendance() {
  const date = $("attendanceDate").value || today();
  const snap = await getDocs(query(collection(db,"attendance"), where("date","==",date)));
  const rows = snap.docs.map(d => ({id:d.id,...d.data()}));
  if (!isAdmin && currentProfile?.studentId) {
    // Students can see class attendance; only public attendance fields are rendered.
  }
  $("attendanceBody").innerHTML = rows.map(r => `<tr><td>${escapeHtml(r.studentId)}</td><td>${escapeHtml(r.displayName)}</td><td>${escapeHtml(r.status)}</td></tr>`).join("") || `<tr><td colspan="3">មិនទាន់មានទិន្នន័យ</td></tr>`;
  const present = rows.filter(r=>r.status==="Present").length, absent=rows.filter(r=>r.status==="Absent").length;
  $("attendanceStats").innerHTML = `<div class="stat">Present: <b>${present}</b></div><div class="stat">Absent: <b>${absent}</b></div><div class="stat">សរុប: <b>${rows.length}</b></div>`;
}
$("loadAttendanceBtn").addEventListener("click", loadAttendance);
$("attendanceDate").addEventListener("change", loadAttendance);

async function loadStudents() {
  const snap = await getDocs(collection(db,"users"));
  const students = snap.docs.map(d=>({uid:d.id,...d.data()})).filter(u=>u.role==="student");
  $("studentsList").innerHTML = students.map(s=>`<div class="student-card"><b>${escapeHtml(s.studentId)}</b> — ${escapeHtml(s.displayName)}<div class="small muted">${s.telegram ? "Telegram: @"+escapeHtml(s.telegram) : "No Telegram"}</div></div>`).join("") || "មិនទាន់មានសិស្ស";
}
$("createStudentForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const token = await currentUser.getIdToken();
    const r = await fetch("/api/create-student",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({
      studentId:$("newStudentId").value.trim(),displayName:$("newStudentName").value.trim(),password:$("newStudentPassword").value
    })});
    const data = await r.json(); if(!r.ok) throw new Error(data.error);
    showMessage("createStudentMessage",`បានបង្កើត ${data.studentId} រួចរាល់។`);
    e.target.reset(); await loadStudents();
  } catch(err) { showMessage("createStudentMessage",err.message,true); }
});
$("markAllBtn").addEventListener("click", async () => {
  if (!isAdmin || !confirm("កត់សម្គាល់សិស្សទាំងអស់ដែលមានគណនីជា Present?")) return;
  try {
    const date=$("attendanceDate").value || today();
    const snap=await getDocs(collection(db,"users"));
    for (const d of snap.docs) {
      const s=d.data(); if(s.role!=="student") continue;
      await setDoc(doc(db,"attendance",`${date}_${d.id}`),{date,studentUid:d.id,studentId:s.studentId,displayName:s.displayName,status:"Present",updatedAt:serverTimestamp()});
    }
    await loadAttendance(); showMessage("attendanceMessage","បានកត់ Present ទាំងអស់។");
  } catch(e){showMessage("attendanceMessage",e.message,true);}
});

$("reportForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const date=$("reportDate").value, reason=$("reportReason").value.trim();
    const evidenceURL=await uploadImage($("evidenceFile").files[0],"evidence");
    const attendanceSnap=await getDoc(doc(db,"attendance",`${date}_${currentUser.uid}`));
    await addDoc(collection(db,"reports"),{
      studentUid:currentUser.uid,studentId:currentProfile.studentId,displayName:currentProfile.displayName,
      date,recordedStatus:attendanceSnap.exists()?attendanceSnap.data().status:"Not recorded",
      requestedStatus:$("requestedStatus").value,reason,evidenceURL,status:"Pending",
      createdAt:serverTimestamp(),adminNote:""
    });
    e.target.reset(); $("reportDate").value=today(); showMessage("reportMessage","បានផ្ញើ Report ជោគជ័យ។");
    await loadMyReports();
  } catch(err){showMessage("reportMessage",err.message,true);}
});
function reportHtml(r, admin=false) {
  return `<article class="report-card"><b>${escapeHtml(r.studentId)} · ${escapeHtml(r.date)}</b><p>ស្ថានភាព: ${escapeHtml(r.recordedStatus)} → ${escapeHtml(r.requestedStatus)}</p><p>${escapeHtml(r.reason)}</p><p>Status: <b>${escapeHtml(r.status)}</b></p><a href="${escapeHtml(r.evidenceURL)}" target="_blank" rel="noopener">មើល Evidence</a>${r.adminNote?`<p>Admin note: ${escapeHtml(r.adminNote)}</p>`:""}${admin?`<div class="report-actions"><button class="primary" data-action="approve" data-id="${r.id}">Approve & Correct</button><button class="secondary" data-action="reject" data-id="${r.id}">Reject</button><button class="secondary" data-action="delete" data-id="${r.id}">Delete</button></div>`:""}</article>`;
}
async function loadMyReports(){
  const snap=await getDocs(query(collection(db,"reports"),where("studentUid","==",currentUser.uid)));
  $("myReports").innerHTML=snap.docs.map(d=>reportHtml({id:d.id,...d.data()})).join("")||"មិនទាន់មាន Report";
}
async function loadAllReports(){
  const snap=await getDocs(query(collection(db,"reports"),where("status","==","Pending")));
  $("allReports").innerHTML=snap.docs.map(d=>reportHtml({id:d.id,...d.data()},true)).join("")||"គ្មាន Report រង់ចាំ";
}
$("adminReports").addEventListener("click",async e=>{
  const b=e.target.closest("button[data-action]"); if(!b)return;
  const id=b.dataset.id, action=b.dataset.action;
  try{
    const ref=doc(db,"reports",id), snap=await getDoc(ref); if(!snap.exists())return;
    const r=snap.data();
    if(action==="delete"){if(confirm("លុប Report នេះ?"))await deleteDoc(ref);}
    if(action==="reject"){await updateDoc(ref,{status:"Rejected",adminNote:prompt("មូលហេតុបដិសេធ?")||""});}
    if(action==="approve"){
      await setDoc(doc(db,"attendance",`${r.date}_${r.studentUid}`),{date:r.date,studentUid:r.studentUid,studentId:r.studentId,displayName:r.displayName,status:r.requestedStatus,updatedAt:serverTimestamp()});
      await updateDoc(ref,{status:"Approved",adminNote:"Attendance corrected by admin"});
    }
    await loadAllReports(); await loadMyReports();
  }catch(err){alert(err.message);}
});
