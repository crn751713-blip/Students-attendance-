import { createClient } from
"https://esm.sh/@supabase/supabase-js@2";

// ==================================
// SUPABASE CONFIGURATION
// ==================================

const SUPABASE_URL =
"https://lcdluuirihtqqhkcicsq.supabase.co";

const SUPABASE_KEY =
"sb_publishable_jeeLDY-u5eqz2Auf6fPjsQ_2vzOnhTZ";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ==================================
// GLOBAL VARIABLES
// ==================================

let currentUser = null;
let currentProfile = null;

const $ = id => document.getElementById(id);

function notify(message) {
  const box = $("message");

  box.textContent = message;
  box.style.display = "block";

  setTimeout(() => {
    box.style.display = "none";
  }, 3500);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function isAdmin() {
  return currentProfile?.role === "admin";
}

// ==================================
// AUTHENTICATION
// ==================================

$("showRegister").onclick = event => {
  event.preventDefault();

  $("loginForm").classList.add("hidden");
  $("registerForm").classList.remove("hidden");
};

$("showLogin").onclick = event => {
  event.preventDefault();

  $("registerForm").classList.add("hidden");
  $("loginForm").classList.remove("hidden");
};

$("loginBtn").onclick = async () => {
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  if (!email || !password) {
    return notify("Please enter email and password.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return notify(error.message);
  }

  notify("Login successful.");
};

$("registerBtn").onclick = async () => {
  const fullName = $("regName").value.trim();
  const studentId = $("regStudentId").value.trim();
  const email = $("regEmail").value.trim();
  const password = $("regPassword").value;

  if (!fullName || !studentId || !email || !password) {
    return notify("Please complete all fields.");
  }

  if (password.length < 8) {
    return notify("Password must be at least 8 characters.");
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        student_id: studentId
      }
    }
  });

  if (error) {
    return notify(error.message);
  }

  notify(
    "Registration submitted. Check your email if confirmation is required."
  );
};

// ==================================
// LOGOUT
// ==================================

$("logoutBtn").onclick = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) return notify(error.message);

  currentUser = null;
  currentProfile = null;

  showAuth();
};

// ==================================
// SHOW / HIDE SECTIONS
// ==================================

function showAuth() {
  $("authSection").classList.remove("hidden");
  $("appSection").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
}

function showApp() {
  $("authSection").classList.add("hidden");
  $("appSection").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
}

// ==================================
// LOAD PROFILE
// ==================================

async function loadProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    notify("Cannot load profile: " + error.message);
    return false;
  }

  currentProfile = data;

  $("welcomeText").textContent =
    "Welcome, " + (data.full_name || "User");

  $("roleText").textContent =
    "Role: " + data.role;

  $("profileName").value = data.full_name || "";
  $("profilePhone").value = data.phone || "";
  $("profileEmail").textContent =
    "Email: " + (currentUser.email || "");

  $("profileStudentId").textContent =
    "Student ID: " + (data.student_id || "Not assigned");

  $("studentsNav").classList.toggle(
    "hidden",
    !isAdmin()
  );

  $("adminAttendance").classList.toggle(
    "hidden",
    !isAdmin()
  );

  await showProfileImage();

  return true;
}

// ==================================
// STORAGE HELPERS
// ==================================

async function uploadImage(file, folder) {
  if (!file) return null;

  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5 MB.");
  }

  const extension =
    file.name.split(".").pop().replace(/[^a-zA-Z0-9]/g, "");

  const path =
    `${currentUser.id}/${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("student-images")
    .upload(path, file, {
      contentType: file.type,
      upsert: false
    });

  if (error) throw error;

  return path;
}

async function getImageURL(path) {
  if (!path) return "";

  const { data, error } = await supabase.storage
    .from("student-images")
    .createSignedUrl(path, 3600);

  if (error) {
    console.error(error);
    return "";
  }

  return data.signedUrl;
}

// ==================================
// PROFILE IMAGE
// ==================================

async function showProfileImage() {
  const path = currentProfile?.photo_url;

  if (!path) {
    $("profilePreview").removeAttribute("src");
    return;
  }

  const url = await getImageURL(path);

  if (url) $("profilePreview").src = url;
}

$("saveProfileBtn").onclick = async () => {
  try {
    const fullName = $("profileName").value.trim();
    const phone = $("profilePhone").value.trim();

    if (!fullName) {
      return notify("Name is required.");
    }

    let photoPath = currentProfile.photo_url || "";

    const file = $("profileImage").files[0];

    if (file) {
      photoPath = await uploadImage(file, "profile");
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        photo_url: photoPath
      })
      .eq("id", currentUser.id);

    if (error) throw error;

    await loadProfile();

    notify("Profile updated.");

  } catch (error) {
    notify(error.message);
  }
};

// ==================================
// PAGE NAVIGATION
// ==================================

document.querySelectorAll("[data-page]").forEach(button => {
  button.onclick = async () => {
    const page = button.dataset.page;

    if (page === "students" && !isAdmin()) {
      return notify("Admin access required.");
    }

    document.querySelectorAll(".page").forEach(section => {
      section.classList.add("hidden");
    });

    $(page + "Page").classList.remove("hidden");

    if (page === "dashboard") loadDashboard();
    if (page === "attendance") loadAttendance();
    if (page === "history") loadHistory();
    if (page === "reports") loadReports();
    if (page === "students") loadStudents();
  };
});

// ==================================
// DASHBOARD
// ==================================

async function loadDashboard() {
  let query = supabase
    .from("attendance")
    .select("*");

  if (!isAdmin()) {
    query = query.eq("student_id", currentUser.id);
  }

  const { data, error } = await query;

  if (error) {
    $("dashboardInfo").textContent = error.message;
    return;
  }

  const total = data.length;

  const present = data.filter(
    x => x.status === "present"
  ).length;

  const absent = data.filter(
    x => x.status === "absent"
  ).length;

  $("dashboardInfo").innerHTML = `
    <p>Total Records: ${total}</p>
    <p>Present: ${present}</p>
    <p>Absent: ${absent}</p>
    <p>Account: ${isAdmin() ? "Administrator" : "Student"}</p>
  `;
}

// ==================================
// LOAD STUDENTS FOR ADMIN
// ==================================

async function loadStudentOptions() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, student_id")
    .eq("role", "student")
    .order("full_name");

  if (error) return notify(error.message);

  $("attendanceStudent").innerHTML =
    '<option value="">Select Student</option>';

  data.forEach(student => {
    const option = document.createElement("option");

    option.value = student.id;
    option.textContent =
      `${student.full_name} (${student.student_id || "No ID"})`;

    $("attendanceStudent").appendChild(option);
  });
}

// ==================================
// ATTENDANCE
// ==================================

$("saveAttendanceBtn").onclick = async () => {
  if (!isAdmin()) return notify("Admin only.");

  const studentId = $("attendanceStudent").value;
  const status = $("attendanceStatus").value;
  const note = $("attendanceNote").value.trim();

  if (!studentId) {
    return notify("Please select a student.");
  }

  const { error } = await supabase
    .from("attendance")
    .upsert({
      student_id: studentId,
      attendance_date:
        new Date().toLocaleDateString("en-CA"),
      status,
      note
    }, {
      onConflict: "student_id,attendance_date"
    });

  if (error) return notify(error.message);

  $("attendanceNote").value = "";

  notify("Attendance saved.");

  await loadAttendance();
  await loadHistory();
  await loadDashboard();
};

async function loadAttendance() {
  if (isAdmin()) {
    await loadStudentOptions();
  }

  let query = supabase
    .from("attendance")
    .select("*")
    .order("attendance_date", { ascending: false })
    .limit(30);

  if (!isAdmin()) {
    query = query.eq("student_id", currentUser.id);
  }

  const { data, error } = await query;

  if (error) {
    $("studentAttendance").textContent = error.message;
    return;
  }

  $("studentAttendance").innerHTML = data.length
    ? data.map(item => `
      <div class="item">
        <p>Date: ${escapeHTML(item.attendance_date)}</p>
        <p>Status: ${escapeHTML(item.status)}</p>
        <p>Note: ${escapeHTML(item.note)}</p>
      </div>
    `).join("")
    : "<p>No attendance records.</p>";
}

// ==================================
// HISTORY
// ==================================

async function loadHistory() {
  let query = supabase
    .from("attendance")
    .select("*")
    .order("attendance_date", { ascending: false });

  if (!isAdmin()) {
    query = query.eq("student_id", currentUser.id);
  }

  const { data, error } = await query;

  if (error) {
    $("historyList").textContent = error.message;
    return;
  }

  $("historyList").innerHTML = data.length
    ? data.map(item => `
      <div class="item">
        <strong>${escapeHTML(item.attendance_date)}</strong>
        <p>Status: ${escapeHTML(item.status)}</p>
        <p>Note: ${escapeHTML(item.note)}</p>
      </div>
    `).join("")
    : "<p>No history found.</p>";
}

// ==================================
// CREATE REPORT
// ==================================

$("submitReportBtn").onclick = async () => {
  try {
    const title = $("reportTitle").value.trim();
    const description =
      $("reportDescription").value.trim();

    const file = $("reportImage").files[0];

    if (!title) {
      return notify("Please enter report title.");
    }

    let imagePath = "";

    if (file) {
      imagePath = await uploadImage(file, "reports");
    }

    const { error } = await supabase
      .from("reports")
      .insert({
        student_id: currentUser.id,
        title,
        description,
        image_url: imagePath
      });

    if (error) throw error;

    $("reportTitle").value = "";
    $("reportDescription").value = "";
    $("reportImage").value = "";

    notify("Report submitted.");

    await loadReports();

  } catch (error) {
    notify(error.message);
  }
};

// ==================================
// LOAD REPORTS
// ==================================

async function loadReports() {
  let query = supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (!isAdmin()) {
    query = query.eq("student_id", currentUser.id);
  }

  const { data, error } = await query;

  if (error) {
    $("reportsList").textContent = error.message;
    return;
  }

  $("reportsList").innerHTML = "";

  if (!data.length) {
    $("reportsList").textContent = "No reports found.";
    return;
  }

  for (const report of data) {
    const imageURL = await getImageURL(report.image_url);

    const item = document.createElement("div");
    item.className = "item";

    item.innerHTML = `
      <h3>${escapeHTML(report.title)}</h3>

      <p>${escapeHTML(report.description)}</p>

      <p class="status ${escapeHTML(report.status)}">
        Status: ${escapeHTML(report.status)}
      </p>

      <p>Date: ${escapeHTML(
        new Date(report.created_at).toLocaleString()
      )}</p>

      ${imageURL ? `<img src="${imageURL}" alt="Evidence">` : ""}

      <div class="admin-actions"></div>
    `;

    if (isAdmin()) {
      const actions = item.querySelector(".admin-actions");

      ["approved", "rejected"].forEach(status => {
        const button = document.createElement("button");

        button.textContent =
          status === "approved" ? "Approve" : "Reject";

        button.onclick = () => updateReport(report.id, status);

        actions.appendChild(button);
      });

      const deleteButton = document.createElement("button");

      deleteButton.textContent = "Delete";
      deleteButton.style.background = "#dc2626";

      deleteButton.onclick = () => deleteReport(report.id);

      actions.appendChild(deleteButton);
    }

    $("reportsList").appendChild(item);
  }
}

// ==================================
// ADMIN REPORT ACTIONS
// ==================================

async function updateReport(id, status) {
  if (!isAdmin()) return;

  const { error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", id);

  if (error) return notify(error.message);

  notify("Report updated.");

  await loadReports();
}

async function deleteReport(id) {
  if (!isAdmin()) return;

  if (!confirm("Delete this report?")) return;

  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", id);

  if (error) return notify(error.message);

  notify("Report deleted.");

  await loadReports();
}

// ==================================
// MANAGE STUDENTS
// ==================================

async function loadStudents() {
  if (!isAdmin()) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .order("full_name");

  if (error) {
    $("studentsList").textContent = error.message;
    return;
  }

  $("studentsList").innerHTML = data.length
    ? data.map(student => `
      <div class="item">
        <strong>${escapeHTML(student.full_name)}</strong>
        <p>Student ID: ${escapeHTML(student.student_id)}</p>
        <p>Phone: ${escapeHTML(student.phone)}</p>
      </div>
    `).join("")
    : "<p>No students found.</p>";
}

// ==================================
// AUTH SESSION
// ==================================

async function startApp(session) {
  if (!session) {
    currentUser = null;
    currentProfile = null;
    showAuth();
    return;
  }

  currentUser = session.user;

  const success = await loadProfile();

  if (!success) {
    showAuth();
    return;
  }

  showApp();

  await loadDashboard();
  await loadAttendance();
}

supabase.auth.onAuthStateChange(
  (_event, session) => {
    setTimeout(() => {
      startApp(session);
    }, 0);
  }
);

// ==================================
// INITIALIZE
// ==================================

const {
  data: { session }
} = await supabase.auth.getSession();

await startApp(session);
