const STORAGE_KEY = "attendance_records_v1";

const form = document.getElementById("attendanceForm");
const admissionNoEl = document.getElementById("admissionNo");
const studentNameEl = document.getElementById("studentName");
const departmentEl = document.getElementById("department");
const lecturerNameEl = document.getElementById("lecturerName");
const weekEl = document.getElementById("week");
const dateEl = document.getElementById("date");
const statusEl = document.getElementById("status");
const notesEl = document.getElementById("notes");

const recordsTbody = document.getElementById("recordsTbody");

const resetBtn = document.getElementById("resetBtn");
const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");

const searchInput = document.getElementById("searchInput");
const filterWeek = document.getElementById("filterWeek");
const filterStatus = document.getElementById("filterStatus");

let records = loadRecords();
let editingId = null;

// Set default date = today
(function init(){
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateEl.value = `${yyyy}-${mm}-${dd}`;
  render();
})();

function loadRecords(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecords(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function normalize(str){
  return String(str || "").trim().toLowerCase();
}

function makeId(){
  return crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function statusBadge(status){
  const s = String(status || "");
  const cls =
    s === "Present" ? "present" :
    s === "Absent" ? "absent" :
    s === "Late" ? "late" : "";
  return `<span class="badge ${cls}">${escapeHtml(s)}</span>`;
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFiltered(){
  const q = normalize(searchInput.value);
  const w = filterWeek.value;
  const st = filterStatus.value;

  return records.filter(r => {
    const hay = normalize(
      `${r.admissionNo} ${r.studentName} ${r.department} ${r.lecturerName} ${r.week} ${r.date} ${r.status} ${r.notes}`
    );
    const okQ = q ? hay.includes(q) : true;
    const okW = w ? r.week === w : true;
    const okS = st ? r.status === st : true;
    return okQ && okW && okS;
  });
}

function render(){
  const list = getFiltered();
  recordsTbody.innerHTML = list.map((r, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(r.admissionNo)}</td>
      <td>${escapeHtml(r.studentName)}</td>
      <td>${escapeHtml(r.department)}</td>
      <td>${escapeHtml(r.lecturerName)}</td>
      <td>${escapeHtml(r.week)}</td>
      <td>${escapeHtml(r.date)}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${escapeHtml(r.notes || "")}</td>
      <td>
        <div class="row-actions">
          <button class="link-btn" onclick="editRecord('${r.id}')">Edit</button>
          <button class="link-btn danger" onclick="deleteRecord('${r.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function validateUnique(admissionNo, week, date, ignoreId){
  // Avoid duplicate attendance entry for same student + week + date
  const found = records.find(r =>
    r.id !== ignoreId &&
    normalize(r.admissionNo) === normalize(admissionNo) &&
    r.week === week &&
    r.date === date
  );
  return !found;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const admissionNo = admissionNoEl.value.trim();
  const studentName = studentNameEl.value.trim();
  const department = departmentEl.value.trim();
  const lecturerName = lecturerNameEl.value.trim();
  const week = weekEl.value;
  const date = dateEl.value;
  const status = statusEl.value;
  const notes = notesEl.value.trim();

  if (!validateUnique(admissionNo, week, date, editingId)) {
    alert("Duplicate record: this admission number already has attendance for that week and date.");
    return;
  }

  const payload = { admissionNo, studentName, department, lecturerName, week, date, status, notes };

  if (editingId) {
    records = records.map(r => (r.id === editingId ? { ...r, ...payload } : r));
    editingId = null;
    document.getElementById("saveBtn").textContent = "Save Record";
  } else {
    records.unshift({ id: makeId(), createdAt: new Date().toISOString(), ...payload });
  }

  saveRecords();
  form.reset();

  // keep date as today after reset
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateEl.value = `${yyyy}-${mm}-${dd}`;

  render();
});

resetBtn.addEventListener("click", () => {
  editingId = null;
  document.getElementById("saveBtn").textContent = "Save Record";
  form.reset();

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateEl.value = `${yyyy}-${mm}-${dd}`;
});

clearBtn.addEventListener("click", () => {
  if (!confirm("Clear ALL attendance records? This cannot be undone.")) return;
  records = [];
  saveRecords();
  render();
});

exportBtn.addEventListener("click", () => {
  const list = getFiltered();
  if (list.length === 0) {
    alert("No records to export.");
    return;
  }

  const headers = ["Admission No","Student Name","Department","Lecturer","Week","Date","Status","Notes"];
  const rows = list.map(r => [
    r.admissionNo, r.studentName, r.department, r.lecturerName, r.week, r.date, r.status, r.notes || ""
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replaceAll('"','""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
});

searchInput.addEventListener("input", render);
filterWeek.addEventListener("change", render);
filterStatus.addEventListener("change", render);

// Make functions global for inline onclick
window.editRecord = function(id){
  const r = records.find(x => x.id === id);
  if (!r) return;

  editingId = id;
  admissionNoEl.value = r.admissionNo;
  studentNameEl.value = r.studentName;
  departmentEl.value = r.department;
  lecturerNameEl.value = r.lecturerName;
  weekEl.value = r.week;
  dateEl.value = r.date;
  statusEl.value = r.status;
  notesEl.value = r.notes || "";

  document.getElementById("saveBtn").textContent = "Update Record";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteRecord = function(id){
  if (!confirm("Delete this record?")) return;
  records = records.filter(r => r.id !== id);
  saveRecords();
  render();
};
