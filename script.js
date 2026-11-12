
/* ==========================================
   STUDENT ATTENDANCE SYSTEM
   COMPLETE JAVASCRIPT
========================================== */

// ==========================================
// 1. DEFAULT ACCOUNTS
// ==========================================

const defaultUsers = [
  {
    id: "admin",
    password: "admin12345",
    name: "Administrator",
    role: "admin",
    telegram: "",
    photo: ""
  },
  {
    id: "S001",
    password: "student123",
    name: "Student One",
    role: "student",
    telegram: "",
    photo: ""
  }
];

// ==========================================
// 2. LOAD AND SAVE DATA
// ==========================================

function loadData(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (error) {
    return fallback;
  }
}

let users = loadData("attendance_users", defaultUsers);
let attendance = loadData("attendance_records", []);
let reports = loadData("attendance_reports", []);

let currentUser = null;

function saveData() {
  try {
    localStorage.setItem("attendance_users", JSON.stringify(users));
    localStorage.setItem("attendance_records", JSON.stringify(attendance));
    localStorage.setItem("attendance_reports", JSON.stringify(reports));
    return true;
  } catch (error) {
    alert("Storage is full. Please use smaller photos.");
    return false;
  }
}

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .split("T")[0];
}

function getUser(id) {
  return users.find(user => user.id === id);
}

function getStudent(id) {
  return users.find(user =>
    user.id === id && user.role === "student"
  );
}

// ==========================================
// 3. HTML ELEMENTS
// ==========================================

const loginForm = document.getElementById("loginForm");
const loginSection = document.getElementById("loginSection");
const appSection = document.getElementById("appSection");
const logoutBtn = document.getElementById("logoutBtn");

const attendanceDate = document.getElementById("attendanceDate");

// ==========================================
// 4. LOGIN
// ==========================================

loginForm.addEventListener("submit", function(e) {
  e.preventDefault();

  const id = document.getElementById("loginId").value.trim();
  const password = document.getElementById("loginPassword").value;

  const user = users.find(u =>
    u.id === id && u.password === password
  );

  if (!user) {
    document.getElementById("loginMessage").textContent =
      "Incorrect ID or Password!";
    return;
  }

  currentUser = user;

  loginSection.classList.add("hidden");
  appSection.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");

  document.getElementById("welcomeName").textContent =
    "Welcome, " + user.name;

  document.getElementById("welcomeRole").textContent =
    user.role === "admin" ? "Administrator" : "Student";

  document.getElementById("roleBadge").textContent =
    user.role.toUpperCase();

  // Show Admin-only elements
  document.querySelectorAll(".admin-only").forEach(element => {
    element.classList.toggle(
      "hidden",
      user.role !== "admin"
    );
  });

  attendanceDate.value = today();
  document.getElementById("reportDate").value = today();

  updateDashboard();
  renderAttendance();
  renderHistory();
  renderReports();
  renderStudents();
  renderProfileGallery();
  renderPasswordAccounts();
  loadProfile();
  updateReportAlert();

  showPage("dashboardPage");

  document.getElementById("loginMessage").textContent = "";

  // Alert Admin about unseen reports
  if (user.role === "admin") {
    const unseen = getUnseenReports();

    if (unseen.length > 0) {
      alert(
        "You have " + unseen.length +
        " new report(s) waiting to be reviewed. " +
        "Please open Reports."
      );
    }
  }
});

// ==========================================
// 5. LOGOUT
// ==========================================

logoutBtn.addEventListener("click", function() {
  currentUser = null;

  appSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
  logoutBtn.classList.add("hidden");

  loginForm.reset();
});

// ==========================================
// 6. NAVIGATION
// ==========================================

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", function() {
    if (this.classList.contains("hidden")) return;

    showPage(this.dataset.page);
  });
});

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.add("hidden");
  });

  const page = document.getElementById(pageId);

  if (!page) return;

  page.classList.remove("hidden");

  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.toggle(
      "active",
      tab.dataset.page === pageId
    );
  });

  if (pageId === "dashboardPage") {
    updateDashboard();
  }

  if (pageId === "attendancePage") {
    renderAttendance();
  }

  if (pageId === "historyPage") {
    renderHistory();
  }

  if (pageId === "reportPage") {
    renderReports();

    // Mark reports as viewed when Admin opens Reports
    if (currentUser?.role === "admin") {
      markReportsAsViewed();
    }
  }

  if (pageId === "profilePage") {
    loadProfile();
    renderProfileGallery();
  }

  if (pageId === "studentsPage") {
    renderStudents();
    renderPasswordAccounts();
  }
}

// ==========================================
// 7. REPORT NOTIFICATIONS
// ==========================================

function getUnseenReports() {
  if (currentUser?.role !== "admin") return [];

  return reports.filter(report =>
    report.viewedByAdmin !== true
  );
}

function updateReportAlert() {
  const badge = document.getElementById("reportAlertBadge");

  if (!badge) return;

  if (currentUser?.role !== "admin") {
    badge.classList.add("hidden");
    return;
  }

  const count = getUnseenReports().length;

  badge.textContent = count;

  badge.classList.toggle("hidden", count === 0);
}

function markReportsAsViewed() {
  if (currentUser?.role !== "admin") return;

  reports.forEach(report => {
    report.viewedByAdmin = true;
  });

  saveData();
  updateReportAlert();
}

// ==========================================
// 8. DASHBOARD
// ==========================================

function updateDashboard() {
  const students = users.filter(u => u.role === "student");

  const records = attendance.filter(a =>
    a.date === today()
  );

  document.getElementById("totalStudents").textContent =
    students.length;

  document.getElementById("totalPresent").textContent =
    records.filter(a => a.status === "Present").length;

  document.getElementById("totalAbsent").textContent =
    records.filter(a => a.status === "Absent").length;
}

// ==========================================
// 9. ATTENDANCE
// ==========================================

attendanceDate.value = today();

attendanceDate.addEventListener("change", renderAttendance);

function renderAttendance() {
  const table = document.getElementById("attendanceTable");
  const date = attendanceDate.value || today();

  table.innerHTML = "";

  let students = users.filter(u => u.role === "student");

  // Students can only see their own attendance row
  if (currentUser?.role === "student") {
    students = students.filter(u =>
      u.id === currentUser.id
    );
  }

  students.forEach(student => {
    const record = attendance.find(a =>
      a.studentId === student.id &&
      a.date === date
    );

    const status = record ? record.status : "Not Marked";

    const tr = document.createElement("tr");

    // Student photo
    const photoCell = document.createElement("td");
    const photo = document.createElement("img");

    photo.src = student.photo ||
      "https://placehold.co/120x120";

    photo.alt = "Student Profile";
    photo.className = "attendance-profile";
    photoCell.appendChild(photo);

    // Student ID
    const idCell = document.createElement("td");
    idCell.textContent = student.id;

    // Student name
    const nameCell = document.createElement("td");
    nameCell.textContent = student.name;

    // Attendance status
    const statusCell = document.createElement("td");
    statusCell.textContent = status;

    if (status === "Present") {
      statusCell.className = "status-present";
    } else if (status === "Absent") {
      statusCell.className = "status-absent";
    }

    tr.append(
      photoCell,
      idCell,
      nameCell,
      statusCell
    );

    // Admin who marked the attendance
    const markedByCell = document.createElement("td");
    const markedById = record?.markedBy || "";

    const markedByUser = getUser(markedById);

    if (markedByUser) {
      const markedBox = document.createElement("div");
      markedBox.className = "marked-by-box";

      const adminPhoto = document.createElement("img");
      adminPhoto.src = markedByUser.photo ||
        "https://placehold.co/120x120";

      adminPhoto.alt = "Marked by";
      adminPhoto.className = "marked-by-photo";

      const adminName = document.createElement("span");
      adminName.className = "marked-by-name";
      adminName.textContent = markedByUser.name;

      markedBox.append(adminPhoto, adminName);
      markedByCell.appendChild(markedBox);
    } else {
      markedByCell.textContent = "—";
    }

    tr.appendChild(markedByCell);

    // Admin action buttons
    if (currentUser?.role === "admin") {
      const actionCell = document.createElement("td");

      const presentBtn = document.createElement("button");
      presentBtn.textContent = "Present";
      presentBtn.className = "primary-btn";
      presentBtn.addEventListener("click", function() {
        markAttendance(student.id, "Present");
      });

      const absentBtn = document.createElement("button");
      absentBtn.textContent = "Absent";
      absentBtn.className = "danger-btn";
      absentBtn.addEventListener("click", function() {
        markAttendance(student.id, "Absent");
      });

      actionCell.append(presentBtn, absentBtn);
      tr.appendChild(actionCell);
    }

    table.appendChild(tr);
  });
}

// ==========================================
// 10. MARK ATTENDANCE
// ==========================================

function markAttendance(studentId, status) {
  if (currentUser?.role !== "admin") return;

  const date = attendanceDate.value || today();

  const existing = attendance.find(a =>
    a.studentId === studentId &&
    a.date === date
  );

  if (existing) {
    existing.status = status;
    existing.markedBy = currentUser.id;
  } else {
    attendance.push({
      studentId,
      date,
      status,
      markedBy: currentUser.id
    });
  }

  saveData();

  renderAttendance();
  renderHistory();
  updateDashboard();

  document.getElementById("attendanceMessage").textContent =
    "Attendance saved successfully!";
}

// ==========================================
// 11. MARK ALL PRESENT
// ==========================================

document.getElementById("markAllBtn").addEventListener("click", function() {
  if (currentUser?.role !== "admin") return;

  const date = attendanceDate.value || today();

  users.filter(u => u.role === "student").forEach(student => {
    const existing = attendance.find(a =>
      a.studentId === student.id &&
      a.date === date
    );

    if (existing) {
      existing.status = "Present";
      existing.markedBy = currentUser.id;
    } else {
      attendance.push({
        studentId: student.id,
        date,
        status: "Present",
        markedBy: currentUser.id
      });
    }
  });

  saveData();

  renderAttendance();
  renderHistory();
  updateDashboard();
});

// ==========================================
// 12. ATTENDANCE HISTORY
// ==========================================

function renderHistory() {
  const table = document.getElementById("historyTable");

  table.innerHTML = "";

  let records = attendance;

  if (currentUser?.role === "student") {
    records = records.filter(a =>
      a.studentId === currentUser.id
    );
  }

  records.slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach(record => {
      const student = getStudent(record.studentId);

      const tr = document.createElement("tr");

      const dateCell = document.createElement("td");
      dateCell.textContent = record.date;

      const photoCell = document.createElement("td");
      const photo = document.createElement("img");

      photo.src = student?.photo ||
        "https://placehold.co/120x120";

      photo.alt = "Student";
      photo.className = "attendance-profile";

      photoCell.appendChild(photo);

      const idCell = document.createElement("td");
      idCell.textContent = record.studentId;

      const nameCell = document.createElement("td");
      nameCell.textContent = student?.name || "Unknown";

      const statusCell = document.createElement("td");
      statusCell.textContent = record.status;

      statusCell.className =
        record.status === "Present"
          ? "status-present"
          : "status-absent";

      tr.append(
        dateCell,
        photoCell,
        idCell,
        nameCell,
        statusCell
      );

      table.appendChild(tr);
    });
}

// ==========================================
// 13. EXPORT CSV
// ==========================================

document.getElementById("exportBtn").addEventListener("click", function() {
  if (currentUser?.role !== "admin") return;

  const rows = [
    ["Date", "Student ID", "Name", "Status", "Marked By"]
  ];

  attendance.forEach(record => {
    const student = getStudent(record.studentId);
    const admin = getUser(record.markedBy);

    rows.push([
      record.date,
      record.studentId,
      student?.name || "Unknown",
      record.status,
      admin?.name || ""
    ]);
  });

  const csv = rows.map(row =>
    row.map(value =>
      '"' + String(value).replace(/"/g, '""') + '"'
    ).join(",")
  ).join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "attendance.csv";
  link.click();

  URL.revokeObjectURL(url);
});

// ==========================================
// 14. IMAGE RESIZER
// ==========================================

function resizeImage(file, maxSize = 700) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please select an image."));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Cannot read image."));
    };

    reader.onload = function() {
      const img = new Image();

      img.onerror = () => {
        reject(new Error("Invalid image."));
      };

      img.onload = function() {
        const canvas = document.createElement("canvas");

        const scale = Math.min(
          1,
          maxSize / Math.max(img.width, img.height)
        );

        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const context = canvas.getContext("2d");

        context.drawImage(
          img,
          0,
          0,
          canvas.width,
          canvas.height
        );

        resolve(
          canvas.toDataURL("image/jpeg", 0.7)
        );
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

// ==========================================
// 15. REPORT PHOTO PREVIEW
// ==========================================

document.getElementById("reportPhoto").addEventListener("change", async function() {
  const file = this.files[0];
  const preview = document.getElementById("reportPhotoPreview");

  if (!file) {
    preview.classList.add("hidden");
    return;
  }

  try {
    const image = await resizeImage(file, 900);

    preview.src = image;
    preview.classList.remove("hidden");
  } catch (error) {
    alert(error.message);
    this.value = "";
    preview.classList.add("hidden");
  }
});

// ==========================================
// 16. SUBMIT REPORT
// ==========================================

document.getElementById("reportForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  if (!currentUser || currentUser.role !== "student") {
    alert("Only students can submit reports.");
    return;
  }

  const date = document.getElementById("reportDate").value;
  const status = document.getElementById("reportStatus").value;
  const reason = document.getElementById("reportReason").value.trim();
  const file = document.getElementById("reportPhoto").files[0];

  if (!date || !reason) {
    alert("Please complete all required fields.");
    return;
  }

  const submitButton = this.querySelector('button[type="submit"]');

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  try {
    let evidencePhoto = "";

    if (file) {
      evidencePhoto = await resizeImage(file, 900);
    }

    const newReport = {
      id: Date.now(),
      studentId: currentUser.id,
      date,
      status,
      reason,
      evidencePhoto,
      state: "Pending",
      viewedByAdmin: false,
      createdAt: new Date().toISOString()
    };

    reports.push(newReport);

    if (!saveData()) {
      reports.pop();
      return;
    }

    this.reset();

    document.getElementById("reportDate").value = today();

    const preview = document.getElementById("reportPhotoPreview");
    preview.src = "";
    preview.classList.add("hidden");

    renderReports();
    updateReportAlert();

    alert("Report submitted successfully!");

  } catch (error) {
    alert(error.message || "Could not submit report.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Report";
  }
});

// ==========================================
// 17. DISPLAY REPORTS
// ==========================================

function renderReports() {
  const myReports = document.getElementById("myReports");
  const allReports = document.getElementById("allReports");

  myReports.innerHTML = "";
  allReports.innerHTML = "";

  if (!currentUser) return;

  const mine = reports.filter(report =>
    report.studentId === currentUser.id
  );

  if (mine.length === 0) {
    myReports.textContent = "You have no reports yet.";
  }

  mine.slice().reverse().forEach(report => {
    myReports.appendChild(
      createReportCard(report, false)
    );
  });

  if (currentUser.role === "admin") {
    if (reports.length === 0) {
      allReports.textContent = "No student reports yet.";
    }

    reports.slice().reverse().forEach(report => {
      allReports.appendChild(
        createReportCard(report, true)
      );
    });
  }

  updateReportAlert();
}

// ==========================================
// 18. CREATE REPORT CARD
// ==========================================

function createReportCard(report, isAdmin) {
  const card = document.createElement("div");

  card.className = "report-card";

  card.classList.add(
    report.state === "Pending"
      ? "report-pending"
      : "report-reviewed"
  );

  const student = getStudent(report.studentId);

  const title = document.createElement("h4");
  title.textContent = student?.name || report.studentId;

  const date = document.createElement("p");
  date.textContent = "Date: " + report.date;

  const requested = document.createElement("p");
  requested.textContent = "Requested Status: " + report.status;

  const reason = document.createElement("p");
  reason.textContent = "Reason: " + report.reason;

  const state = document.createElement("p");
  state.textContent = "Report Status: " + report.state;

  card.append(title, date, requested, reason, state);

  // Evidence photo
  if (report.evidencePhoto) {
    const photoLabel = document.createElement("p");
    photoLabel.textContent = "Evidence Photo:";

    const image = document.createElement("img");
    image.src = report.evidencePhoto;
    image.alt = "Report evidence";
    image.className = "evidence-photo";
    image.loading = "lazy";

    card.append(photoLabel, image);
  } else {
    const noPhoto = document.createElement("p");
    noPhoto.textContent = "No evidence photo attached.";
    noPhoto.className = "help-text";

    card.appendChild(noPhoto);
  }

  // Admin actions
  if (isAdmin) {
    const actions = document.createElement("div");
    actions.className = "report-actions";

    const approve = document.createElement("button");
    approve.textContent = "Approve";
    approve.className = "primary-btn";

    approve.addEventListener("click", function() {
      manageReport(report.id, "approve");
    });

    const reject = document.createElement("button");
    reject.textContent = "Reject";
    reject.className = "danger-btn";

    reject.addEventListener("click", function() {
      manageReport(report.id, "reject");
    });

    const remove = document.createElement("button");
    remove.textContent = "Delete";
    remove.className = "danger-btn";

    remove.addEventListener("click", function() {
      manageReport(report.id, "delete");
    });

    actions.append(approve, reject, remove);
    card.appendChild(actions);
  }

  return card;
}

// ==========================================
// 19. ADMIN REPORT MANAGEMENT
// ==========================================

function manageReport(id, action) {
  if (currentUser?.role !== "admin") return;

  const report = reports.find(r => r.id === id);

  if (!report) return;

  if (action === "delete") {
    if (!confirm("Delete this report?")) return;

    reports = reports.filter(r => r.id !== id);

  } else if (action === "approve") {
    report.state = "Approved";

    const existing = attendance.find(a =>
      a.studentId === report.studentId &&
      a.date === report.date
    );

    if (existing) {
      existing.status = report.status;
      existing.markedBy = currentUser.id;
    } else {
      attendance.push({
        studentId: report.studentId,
        date: report.date,
        status: report.status,
        markedBy: currentUser.id
      });
    }

  } else if (action === "reject") {
    report.state = "Rejected";
  }

  saveData();

  renderReports();
  renderHistory();
  renderAttendance();
  updateDashboard();
  updateReportAlert();
}

// ==========================================
// 20. PROFILE
// ==========================================

function loadProfile() {
  if (!currentUser) return;

  const user = getUser(currentUser.id);

  if (!user) return;

  document.getElementById("profileName").value = user.name;

  document.getElementById("telegram").value =
    user.telegram || "";

  document.getElementById("profilePreview").src =
    user.photo || "https://placehold.co/120x120";
}

// Profile photo preview
document.getElementById("profilePhoto").addEventListener("change", async function() {
  const file = this.files[0];

  if (!file) return;

  try {
    const image = await resizeImage(file, 600);

    document.getElementById("profilePreview").src = image;
  } catch (error) {
    alert(error.message);
    this.value = "";
  }
});

// Save profile
document.getElementById("profileForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  if (!currentUser) return;

  const user = getUser(currentUser.id);

  if (!user) return;

  const oldName = user.name;
  const oldTelegram = user.telegram;
  const oldPhoto = user.photo;

  user.name = document.getElementById("profileName").value.trim();

  user.telegram = document.getElementById("telegram").value.trim();

  const file = document.getElementById("profilePhoto").files[0];

  try {
    if (file) {
      user.photo = await resizeImage(file, 600);
    }

    if (!saveData()) {
      user.name = oldName;
      user.telegram = oldTelegram;
      user.photo = oldPhoto;
      return;
    }

    currentUser = user;

    document.getElementById("welcomeName").textContent =
      "Welcome, " + user.name;

    document.getElementById("profileMessage").textContent =
      "Profile saved successfully!";

    renderProfileGallery();
    renderAttendance();
    renderHistory();

  } catch (error) {
    user.name = oldName;
    user.telegram = oldTelegram;
    user.photo = oldPhoto;

    alert(error.message);
  }
});

// ==========================================
// 21. PROFILE GALLERY
// ==========================================

function renderProfileGallery() {
  const gallery = document.getElementById("profileGallery");

  if (!gallery) return;

  gallery.innerHTML = "";

  const students = users.filter(u => u.role === "student");

  if (students.length === 0) {
    gallery.textContent = "No student profiles found.";
    return;
  }

  students.forEach(student => {
    const card = document.createElement("div");
    card.className = "profile-gallery-card";

    const image = document.createElement("img");

    image.src = student.photo ||
      "https://placehold.co/120x120";

    image.alt = "Student profile";
    image.loading = "lazy";

    const name = document.createElement("h4");
    name.textContent = student.name;

    const id = document.createElement("p");
    id.textContent = "ID: " + student.id;

    const telegram = document.createElement("p");
    telegram.textContent =
      "Telegram: " + (student.telegram || "Not added");

    card.append(image, name, id, telegram);

    gallery.appendChild(card);
  });
}

// ==========================================
// 22. CHANGE OWN PASSWORD
// ==========================================

document.getElementById("myPasswordForm").addEventListener("submit", function(e) {
  e.preventDefault();

  if (!currentUser) return;

  const currentPassword =
    document.getElementById("currentPassword").value;

  const newPassword =
    document.getElementById("myNewPassword").value;

  const confirmPassword =
    document.getElementById("confirmMyPassword").value;

  const message =
    document.getElementById("myPasswordMessage");

  const user = getUser(currentUser.id);

  if (!user || user.password !== currentPassword) {
    message.textContent = "Current password is incorrect.";
    return;
  }

  if (newPassword.length < 8) {
    message.textContent =
      "Password must have at least 8 characters.";
    return;
  }

  if (newPassword !== confirmPassword) {
    message.textContent = "New passwords do not match.";
    return;
  }

  const oldPassword = user.password;

  user.password = newPassword;

  if (!saveData()) {
    user.password = oldPassword;
    return;
  }

  this.reset();

  message.textContent =
    "Your password has been changed successfully.";
});

// ==========================================
// 23. ADD STUDENT
// ==========================================

document.getElementById("studentForm").addEventListener("submit", function(e) {
  e.preventDefault();

  if (currentUser?.role !== "admin") return;

  const id = document.getElementById("newStudentId").value.trim();
  const name = document.getElementById("newStudentName").value.trim();
  const password = document.getElementById("newStudentPassword").value;

  const message = document.getElementById("studentMessage");

  if (users.some(u => u.id === id)) {
    message.textContent = "Student ID already exists!";
    return;
  }

  if (password.length < 8) {
    message.textContent =
      "Password must have at least 8 characters.";
    return;
  }

  const newStudent = {
    id,
    password,
    name,
    role: "student",
    telegram: "",
    photo: ""
  };

  users.push(newStudent);

  if (!saveData()) {
    users.pop();
    return;
  }

  this.reset();

  message.textContent = "Student added successfully!";

  renderStudents();
  renderProfileGallery();
  renderPasswordAccounts();
  updateDashboard();
});

// ==========================================
// 24. STUDENT LIST
// ==========================================

function renderStudents() {
  const list = document.getElementById("studentList");

  if (!list) return;

  list.innerHTML = "";

  users.filter(u => u.role === "student").forEach(student => {
    const card = document.createElement("div");
    card.className = "student-card";

    const name = document.createElement("b");
    name.textContent = student.name;

    const id = document.createElement("p");
    id.textContent = "ID: " + student.id;

    const telegram = document.createElement("p");
    telegram.textContent =
      "Telegram: " + (student.telegram || "Not added");

    const remove = document.createElement("button");
    remove.textContent = "Delete Student";
    remove.className = "danger-btn";

    remove.addEventListener("click", function() {
      deleteStudent(student.id);
    });

    card.append(name, id, telegram, remove);

    list.appendChild(card);
  });
}

// ==========================================
// 25. DELETE STUDENT
// ==========================================

function deleteStudent(id) {
  if (currentUser?.role !== "admin") return;

  if (!confirm("Are you sure you want to delete this student?")) {
    return;
  }

  const oldUsers = users;
  const oldAttendance = attendance;
  const oldReports = reports;

  users = users.filter(u => u.id !== id);

  attendance = attendance.filter(a =>
    a.studentId !== id
  );

  reports = reports.filter(r =>
    r.studentId !== id
  );

  if (!saveData()) {
    users = oldUsers;
    attendance = oldAttendance;
    reports = oldReports;
    return;
  }

  renderStudents();
  renderAttendance();
  renderHistory();
  renderReports();
  renderProfileGallery();
  renderPasswordAccounts();
  updateDashboard();
  updateReportAlert();
}

// ==========================================
// 26. ADMIN PASSWORD MANAGEMENT
// ==========================================

function renderPasswordAccounts() {
  const select = document.getElementById("passwordTarget");

  if (!select || currentUser?.role !== "admin") return;

  select.innerHTML = "";

  users.forEach(user => {
    const option = document.createElement("option");

    option.value = user.id;
    option.textContent =
      `${user.name} (${user.id}) - ${user.role}`;

    select.appendChild(option);
  });
}

document.getElementById("adminPasswordForm").addEventListener("submit", function(e) {
  e.preventDefault();

  if (currentUser?.role !== "admin") return;

  const targetId =
    document.getElementById("passwordTarget").value;

  const newPassword =
    document.getElementById("adminNewPassword").value;

  const confirmPassword =
    document.getElementById("adminConfirmPassword").value;

  const message =
    document.getElementById("passwordMessage");

  if (newPassword.length < 8) {
    message.textContent =
      "Password must have at least 8 characters.";
    return;
  }

  if (newPassword !== confirmPassword) {
    message.textContent = "Passwords do not match.";
    return;
  }

  const targetUser = getUser(targetId);

  if (!targetUser) {
    message.textContent = "Account not found.";
    return;
  }

  const oldPassword = targetUser.password;

  targetUser.password = newPassword;

  if (!saveData()) {
    targetUser.password = oldPassword;
    return;
  }

  this.reset();

  message.textContent =
    "Password changed successfully for " + targetUser.name + ".";
});

// ==========================================
// 27. INITIAL SETTINGS
// ==========================================

attendanceDate.value = today();
document.getElementById("reportDate").value = today();

saveData();

