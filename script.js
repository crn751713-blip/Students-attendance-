
/* =========================
   1. STORAGE
========================= */

function loadData(key, fallback) {
  try {
    const data = localStorage.getItem(key);

    return data ? JSON.parse(data) : fallback;

  } catch (error) {
    console.error("Storage error:", error);
    return fallback;
  }
}

let students = loadData("students", []);
let attendanceRecords = loadData("attendanceRecords", {});


function saveStudents() {
  localStorage.setItem(
    "students",
    JSON.stringify(students)
  );
}

function saveAttendance() {
  localStorage.setItem(
    "attendanceRecords",
    JSON.stringify(attendanceRecords)
  );
}


/* =========================
   2. DATE FUNCTIONS
========================= */

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  if (!date) return "";

  const parts = date.split("-");

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const dateInput = document.getElementById("attendanceDate");

dateInput.value = getLocalDate();

function showDate() {
  document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
}


/* =========================
   3. MIGRATE OLD DATA
========================= */

function migrateOldData() {

  let changed = false;

  students = students.map(student => {

    if (student.id) {
      return student;
    }

    const newStudent = {
      id: `${Date.now()}-${Math.random()}`,
      name: student.name
    };

    if (student.status) {

      const today = getLocalDate();

      if (!attendanceRecords[today]) {
        attendanceRecords[today] = {};
      }

      attendanceRecords[today][newStudent.id] =
        student.status;
    }

    changed = true;

    return newStudent;
  });

  if (changed) {
    saveStudents();
    saveAttendance();
  }
}


/* =========================
   4. GET SELECTED DATE DATA
========================= */

function getSelectedDate() {
  return dateInput.value || getLocalDate();
}

function getAttendance(date, studentId) {

  if (
    attendanceRecords[date] &&
    attendanceRecords[date][studentId]
  ) {
    return attendanceRecords[date][studentId];
  }

  return "Absent";
}


/* =========================
   5. ADD STUDENT
========================= */

function addStudent() {

  const input = document.getElementById("studentName");

  const name = input.value.trim();

  if (name === "") {
    alert("Please enter student name!");
    return;
  }

  const duplicate = students.some(student =>
    student.name.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    alert("This student already exists!");
    return;
  }

  const newStudent = {
    id: `${Date.now()}-${Math.random()}`,
    name: name
  };

  students.push(newStudent);

  saveStudents();

  input.value = "";

  displayStudents();
}


/* =========================
   6. DISPLAY STUDENTS
========================= */

function displayStudents() {

  const list = document.getElementById("studentList");

  const search = document
    .getElementById("searchStudent")
    .value
    .toLowerCase();

  const date = getSelectedDate();

  list.replaceChildren();

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(search)
  );

  filteredStudents.forEach((student, index) => {

    const status = getAttendance(date, student.id);

    const row = document.createElement("tr");

    // Number
    const numberCell = document.createElement("td");
    numberCell.textContent = index + 1;

    // Name
    const nameCell = document.createElement("td");
    nameCell.textContent = student.name;

    // Status
    const statusCell = document.createElement("td");

    statusCell.textContent = status;

    statusCell.className =
      status === "Present"
        ? "present-status"
        : "absent-status";

    // Action
    const actionCell = document.createElement("td");

    const actions = document.createElement("div");
    actions.className = "actions";

    const presentButton = document.createElement("button");

    presentButton.textContent = "Present";
    presentButton.className = "present-btn";

    presentButton.onclick = () =>
      markAttendance(student.id, "Present");

    const absentButton = document.createElement("button");

    absentButton.textContent = "Absent";
    absentButton.className = "absent-btn";

    absentButton.onclick = () =>
      markAttendance(student.id, "Absent");

    const deleteButton = document.createElement("button");

    deleteButton.textContent = "Delete";
    deleteButton.className = "delete-btn";

    deleteButton.onclick = () =>
      deleteStudent(student.id);

    actions.append(
      presentButton,
      absentButton,
      deleteButton
    );

    actionCell.appendChild(actions);

    row.append(
      numberCell,
      nameCell,
      statusCell,
      actionCell
    );

    list.appendChild(row);

  });

  document.getElementById("emptyMessage").hidden =
    filteredStudents.length !== 0;

  updateDashboard();
}


/* =========================
   7. MARK ATTENDANCE
========================= */

function markAttendance(studentId, status) {

  const date = getSelectedDate();

  if (!attendanceRecords[date]) {
    attendanceRecords[date] = {};
  }

  attendanceRecords[date][studentId] = status;

  saveAttendance();

  displayStudents();
}


/* =========================
   8. MARK ALL PRESENT
========================= */

function markAllPresent() {

  if (students.length === 0) {
    alert("No students available!");
    return;
  }

  const confirmAction = confirm(
    "Mark all students as Present?"
  );

  if (!confirmAction) return;

  const date = getSelectedDate();

  if (!attendanceRecords[date]) {
    attendanceRecords[date] = {};
  }

  students.forEach(student => {
    attendanceRecords[date][student.id] = "Present";
  });

  saveAttendance();

  displayStudents();
}


/* =========================
   9. DELETE STUDENT
========================= */

function deleteStudent(studentId) {

  const confirmAction = confirm(
    "Are you sure you want to delete this student?"
  );

  if (!confirmAction) return;

  students = students.filter(
    student => student.id !== studentId
  );

  // Remove this student's attendance history
  Object.keys(attendanceRecords).forEach(date => {

    delete attendanceRecords[date][studentId];

  });

  saveStudents();
  saveAttendance();

  displayStudents();
}


/* =========================
   10. UPDATE DASHBOARD
========================= */

function updateDashboard() {

  const total = students.length;

  const date = getSelectedDate();

  let presentCount = 0;

  students.forEach(student => {

    if (getAttendance(date, student.id) === "Present") {
      presentCount++;
    }

  });

  const absentCount = total - presentCount;

  const percentage = total > 0
    ? Math.round((presentCount / total) * 100)
    : 0;

  document.getElementById("total").textContent = total;

  document.getElementById("present").textContent =
    presentCount;

  document.getElementById("absent").textContent =
    absentCount;

  document.getElementById("percentage").textContent =
    percentage + "%";
}


/* =========================
   11. SEARCH STUDENT
========================= */

document
  .getElementById("searchStudent")
  .addEventListener("input", displayStudents);


/* =========================
   12. CHANGE DATE
========================= */

dateInput.addEventListener("change", function() {

  displayStudents();

  if (!document.getElementById("historySection").hidden) {
    displayHistory();
  }

});


/* =========================
   13. EXPORT CSV
========================= */

function exportCSV() {

  if (students.length === 0) {
    alert("No student data to export!");
    return;
  }

  const date = getSelectedDate();

  const rows = [
    ["No.", "Student Name", "Date", "Attendance"]
  ];

  students.forEach((student, index) => {

    rows.push([
      index + 1,
      student.name,
      date,
      getAttendance(date, student.id)
    ]);

  });

  const csv = rows.map(row => {

    return row.map(value => {

      const text = String(value).replace(/"/g, '""');

      return `"${text}"`;

    }).join(",");

  }).join("\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = `Attendance-${date}.csv`;

  link.click();

  URL.revokeObjectURL(url);
}


/* =========================
   14. TOGGLE HISTORY
========================= */

function toggleHistory() {

  const section = document.getElementById("historySection");

  const button = document.getElementById("historyButton");

  section.hidden = !section.hidden;

  if (section.hidden) {

    button.textContent = "View History";

  } else {

    button.textContent = "Hide History";

    displayHistory();

  }

}


/* =========================
   15. DISPLAY HISTORY
========================= */

function displayHistory() {

  const historyList = document.getElementById("historyList");

  historyList.replaceChildren();

  const dates = Object.keys(attendanceRecords)
    .filter(date =>
      Object.keys(attendanceRecords[date]).length > 0
    )
    .sort()
    .reverse();

  if (dates.length === 0) {

    const empty = document.createElement("p");

    empty.className = "history-empty";

    empty.textContent = "No attendance history found.";

    historyList.appendChild(empty);

    return;
  }

  dates.forEach(date => {

    const records = attendanceRecords[date];

    let present = 0;
    let absent = 0;

    students.forEach(student => {

      const status = getAttendance(date, student.id);

      if (status === "Present") {
        present++;
      } else {
        absent++;
      }

    });

    const card = document.createElement("div");

    card.className = "history-card";

    const title = document.createElement("h3");

    title.textContent = formatDate(date);

    const info = document.createElement("div");

    info.className = "history-info";

    const presentText = document.createElement("span");

    presentText.textContent = `Present: ${present}`;

    const absentText = document.createElement("span");

    absentText.textContent = `Absent: ${absent}`;

    info.append(presentText, absentText);

    const viewButton = document.createElement("button");

    viewButton.textContent = "View This Date";

    viewButton.onclick = () => {

      dateInput.value = date;

      displayStudents();

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    };

    card.append(title, info, viewButton);

    historyList.appendChild(card);

  });

}


/* =========================
   16. INITIALIZE APP
========================= */

migrateOldData();

showDate();

displayStudents();
