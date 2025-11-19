// script.js — full UI with localStorage + status colors + mark-as-done buttons

Module.onRuntimeInitialized = () => {

  // WASM wrappers
  const c_add_patient = (n,a,g,ad,ph)=>Module.ccall('add_patient','number',['string','number','string','string','string'],[n,a,g,ad,ph]);
  const c_delete_patient = id=>Module.ccall('delete_patient','number',['number'],[id]);
  const c_get_patients = ()=>Module.ccall('get_patients','string',[],[]);
  const c_search_patients = t=>Module.ccall('search_patients','string',['string'],[t]);

  const c_add_doctor = (n,a,g,s)=>Module.ccall('add_doctor','number',['string','number','string','string'],[n,a,g,s]);
  const c_delete_doctor = id=>Module.ccall('delete_doctor','number',['number'],[id]);
  const c_get_doctors = ()=>Module.ccall('get_doctors','string',[],[]);
  const c_search_doctors = t=>Module.ccall('search_doctors','string',['string'],[t]);

  const c_create_appt = (pid,did,dt,rs)=>Module.ccall('create_appointment','number',['number','number','string','string'],[pid,did,dt,rs]);
  const c_cancel_appt = id=>Module.ccall('cancel_appointment','number',['number'],[id]);
  const c_done_appt = id=>Module.ccall('mark_appointment_done','number',['number'],[id]);
  const c_get_appts = ()=>Module.ccall('get_appointments','string',[],[]);

  const c_get_stats = ()=>Module.ccall('get_stats','string',[],[]);

  // ---------------------------------
  // LocalStorage
  // ---------------------------------
  function saveAll() {
    localStorage.setItem("patients", c_get_patients());
    localStorage.setItem("doctors", c_get_doctors());
    localStorage.setItem("appointments", c_get_appts());
  }

  function restoreAll() {
    const p = localStorage.getItem("patients");
    const d = localStorage.getItem("doctors");
    const a = localStorage.getItem("appointments");

    if (p) p.trim().split("\n").forEach(r=>{
      const c=r.split("|"); if(c.length>=6) c_add_patient(c[1],parseInt(c[2]),c[3],c[4],c[5]);
    });

    if (d) d.trim().split("\n").forEach(r=>{
      const c=r.split("|"); if(c.length>=5) c_add_doctor(c[1],parseInt(c[2]),c[3],c[4]);
    });

    if (a) a.trim().split("\n").forEach(r=>{
      const c=r.split("|"); if(c.length>=6) c_create_appt(parseInt(c[1]),parseInt(c[2]),c[3],c[4]);
    });
  }

  // helpers
  function parse(raw, cols) {
    if (!raw) return [];
    return raw.split("\n").filter(x=>x.trim()!="").map(l=>l.split("|")).filter(a=>a.length>=cols);
  }

  // ---------------------------------
  // Dashboard
  // ---------------------------------
  function refreshStats() {
    const s = JSON.parse(c_get_stats());
    stat_patients.textContent = s.patients;
    stat_doctors.textContent = s.doctors;
    stat_appointments.textContent = s.appointments;
    stat_scheduled.textContent = s.scheduled;
  }

  // ---------------------------------
  // Patients section
  // ---------------------------------
  function refreshPatients() {
    const rows = parse(c_get_patients(), 6);
    const tbody = patients_table.querySelector("tbody");
    tbody.innerHTML = "";
    rows.forEach(c=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td>
        <td>${c[3]}</td><td>${c[4]}</td><td>${c[5]}</td>
        <td class="actions">
          <button class="del" onclick="deletePatient(${c[0]})">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  window.deletePatient = id => {
    if (!confirm("Delete patient "+id+" ?")) return;
    c_delete_patient(id);
    saveAll();
    refreshPatients();
    refreshAppointments();
    refreshStats();   // FIXED
  };

  // ---------------------------------
  // Doctors section
  // ---------------------------------
  function refreshDoctors() {
    const rows = parse(c_get_doctors(), 5);
    const tbody = doctors_table.querySelector("tbody");
    tbody.innerHTML = "";
    rows.forEach(c=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td>
        <td>${c[3]}</td><td>${c[4]}</td>
        <td class="actions">
          <button class="del" onclick="deleteDoctor(${c[0]})">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  window.deleteDoctor = id => {
    if (!confirm("Delete doctor "+id+" ?")) return;
    c_delete_doctor(id);
    saveAll();
    refreshDoctors();
    refreshAppointments();
    refreshStats();   // FIXED
  };

  // ---------------------------------
  // Appointments section
  // ---------------------------------
  function refreshAppointments() {
    const rows = parse(c_get_appts(), 6);
    const tbody = appointments_table.querySelector("tbody");
    tbody.innerHTML = "";

    rows.forEach(c=>{
      const status = c[5];
      const tr = document.createElement("tr");

      if (status === "done") tr.classList.add("row-done");
      if (status === "cancelled") tr.classList.add("row-cancelled");

      tr.innerHTML = `
        <td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td>
        <td>${c[3]}</td><td>${c[4]}</td>
        <td class="status-${status}">${status}</td>
        <td class="actions">
          <button class="done-btn" onclick="markDone(${c[0]})">Done</button>
          <button class="cancel" onclick="cancelAppt(${c[0]})">Cancel</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  window.cancelAppt = id => {
    if (!confirm("Cancel appointment "+id+" ?")) return;
    c_cancel_appt(id);
    saveAll();
    refreshAppointments();
    refreshStats();   // FIXED
  };

  window.markDone = id => {
    if (!confirm("Mark appointment "+id+" as DONE?")) return;
    c_done_appt(id);
    saveAll();
    refreshAppointments();
    refreshStats();   // FIXED
  };

  // ---------------------------------
  // Add entries
  // ---------------------------------

  p_add.onclick = () => {
    if (!p_name.value.trim()) return alert("Name required");
    c_add_patient(
      p_name.value.trim(),
      parseInt(p_age.value || "0"),
      p_gender.value.trim(),
      p_address.value.trim(),
      p_phone.value.trim()
    );
    saveAll();
    refreshPatients();
    refreshStats();   // FIXED
    p_name.value = p_age.value = p_gender.value = p_address.value = p_phone.value = "";
  };

  d_add.onclick = () => {
    if (!d_name.value.trim()) return alert("Name required");
    c_add_doctor(
      d_name.value.trim(),
      parseInt(d_age.value || "0"),
      d_gender.value.trim(),
      d_spec.value.trim()
    );
    saveAll();
    refreshDoctors();
    refreshStats();   // FIXED
    d_name.value = d_age.value = d_gender.value = d_spec.value = "";
  };

  a_create.onclick = () => {
    const pid = parseInt(a_patient_id.value || "0");
    const did = parseInt(a_doctor_id.value || "0");
    if (!pid || !did || !a_datetime.value.trim()) return alert("Required fields missing");
    c_create_appt(pid, did, a_datetime.value.trim(), a_reason.value.trim());
    saveAll();
    refreshAppointments();
    refreshStats();   // already correct
    a_patient_id.value = a_doctor_id.value = a_datetime.value = a_reason.value = "";
  };

  // ---------------------------------
  // Search
  // ---------------------------------
  p_search_btn.onclick = ()=>{
    const t = p_search.value.trim();
    if (!t) return refreshPatients();
    const rows = parse(c_search_patients(t), 6);
    const tbody = patients_table.querySelector("tbody");
    tbody.innerHTML="";
    rows.forEach(c=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td><td>${c[3]}</td><td>${c[4]}</td><td>${c[5]}</td>
        <td class="actions"><button class="del" onclick="deletePatient(${c[0]})">Delete</button></td>`;
      tbody.appendChild(tr);
    });
  };
  p_clear_search.onclick=()=>{ p_search.value=""; refreshPatients(); };

  d_search_btn.onclick = ()=>{
    const t=d_search.value.trim();
    if (!t) return refreshDoctors();
    const rows = parse(c_search_doctors(t), 5);
    const tbody = doctors_table.querySelector("tbody");
    tbody.innerHTML="";
    rows.forEach(c=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td><td>${c[3]}</td><td>${c[4]}</td>
        <td class="actions"><button class="del" onclick="deleteDoctor(${c[0]})">Delete</button></td>`;
      tbody.appendChild(tr);
    });
  };
  d_clear_search.onclick=()=>{ d_search.value=""; refreshDoctors(); };

  // ---------------------------------
  // Tabs
  // ---------------------------------
  document.querySelectorAll(".tab-btn").forEach(b=>{
    b.onclick = ()=>{
      document.querySelectorAll(".tab-btn").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
      document.getElementById(b.dataset.tab).classList.add("active");
      refreshStats();
    };
  });

  // ---------------------------------
  // Init
  // ---------------------------------
  restoreAll();
  refreshPatients();
  refreshDoctors();
  refreshAppointments();
  refreshStats();
};