const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const dd = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10),
  today = () => dd(0),
  v = (id) => $("#" + id).value.trim();
const SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
];
const seed = () => ({
  services: [
    { n: "Medical Consultation", cap: 2 },
    { n: "Dental Check-up", cap: 1 },
    { n: "Physical Exam / Health Screening", cap: 2 },
    { n: "Medical Certificate / Clearance", cap: 2 },
    { n: "Vaccination", cap: 2 },
    { n: "First Aid & Wound Care", cap: 2 },
    { n: "Counseling Referral", cap: 1 },
  ],
  patients: {
    "2022-00123": {
      name: "Juan Dela Cruz",
      blood: "O+",
      allergy: "Penicillin",
      cond: "",
      em: "Rosa Dela Cruz (mother)",
    },
    "2021-04567": {
      name: "Maria Santos",
      blood: "A+",
      allergy: "",
      cond: "Asthma",
      em: "",
    },
    "2023-00981": {
      name: "Pedro Reyes",
      blood: "",
      allergy: "",
      cond: "",
      em: "",
    },
  },
  appts: [
    {
      id: 1,
      name: "Juan Dela Cruz",
      sid: "2022-00123",
      svc: "Medical Consultation",
      date: today(),
      time: "09:00",
      note: "Headache and fever since yesterday",
      urg: "Normal",
      st: "Pending",
    },
    {
      id: 2,
      name: "Maria Santos",
      sid: "2021-04567",
      svc: "Medical Certificate / Clearance",
      date: today(),
      time: "10:00",
      note: "Clearance for OJT",
      urg: "Normal",
      st: "Approved",
    },
    {
      id: 3,
      name: "Pedro Reyes",
      sid: "2023-00981",
      svc: "Vaccination",
      date: dd(1),
      time: "14:00",
      note: "Flu vaccine",
      urg: "Normal",
      st: "Pending",
    },
  ],
  visits: [
    {
      id: 1,
      sid: "2021-04567",
      date: dd(-6),
      cc: "Cough, wheezing",
      bp: "110/70",
      temp: "36.8",
      pulse: "88",
      dx: "Mild asthma flare",
      tx: "Rest, inhaler, hydration",
    },
  ],
  meds: [
    { n: "Paracetamol 500mg", qty: 120, min: 30, exp: dd(300) },
    { n: "Ibuprofen 200mg", qty: 15, min: 30, exp: dd(200) },
    { n: "Cetirizine 10mg", qty: 60, min: 20, exp: dd(400) },
    { n: "Oral Rehydration Salts", qty: 40, min: 20, exp: dd(25) },
    { n: "Antacid tablets", qty: 80, min: 30, exp: dd(-5) },
    { n: "Alcohol 70%", qty: 5, min: 10, exp: dd(500) },
  ],
  certs: [],
  queue: [],
  ann: [
    {
      id: 1,
      title: "Flu vaccination drive",
      body: "Free flu shots at the clinic every Tuesday this month. Bring your school ID.",
      date: today(),
    },
  ],
  log: ["System initialized"],
  next: 10,
});
let S;
try {
  S = JSON.parse(localStorage.getItem("udmc1"));
} catch (e) {}
S = S || seed();
const save = () => {
  try {
    localStorage.setItem("udmc1", JSON.stringify(S));
  } catch (e) {}
};
let U = null,
  pg = "",
  role = "admin",
  err = "",
  filt = { q: "", st: "" },
  ps = null,
  cv = null;
const log = (m) => {
  S.log.unshift(new Date().toLocaleString() + " – " + m);
  S.log = S.log.slice(0, 60);
  save();
};
const toast = (m) => {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = m;
  document.body.append(t);
  setTimeout(() => t.remove(), 2400);
};
const sure = (b, c) => {
  if (b.dataset.s) {
    new Function(c)();
  } else {
    b.dataset.s = 1;
    b.dataset.o = b.textContent;
    b.textContent = "Sure?";
    setTimeout(() => {
      b.dataset.s = "";
      b.textContent = b.dataset.o;
    }, 3000);
  }
};
const ensure = (sid, name) => {
  S.patients[sid] = S.patients[sid] || {
    name,
    blood: "",
    allergy: "",
    cond: "",
    em: "",
  };
};
const ACC = {
  admin: { u: "admin", p: "admin123", name: "Clinic Staff" },
  student: {
    u: "student",
    p: "student123",
    name: "Juan Dela Cruz",
    sid: "2022-00123",
  },
};
const MENU = {
  admin: [
    ["dash", "Dashboard"],
    ["appts", "Appointments"],
    ["queue", "Walk-in Queue"],
    ["rec", "Patient Records"],
    ["meds", "Medicine Inventory"],
    ["certs", "Certificates"],
    ["cal", "Daily Schedule"],
    ["svc", "Services"],
    ["ann", "Advisories"],
    ["log", "Activity Log"],
  ],
  student: [
    ["book", "Book Appointment"],
    ["mine", "My Appointments"],
    ["prof", "My Health Profile"],
    ["ann", "Health Advisories"],
  ],
};
const go = (p) => {
  pg = p;
  render();
};
function render() {
  // Render the login screen or the shared shell and currently selected page.
  $("#hb").innerHTML = U
    ? "<button onclick=\"U=null;pg='';render()\">Log out</button>"
    : "";
  if (!U) {
    $("#app").innerHTML = `<div class="wrap">
        <main>
          <div class="login box">
            <div class="login-intro">
              <span class="login-kicker">CAMPUS HEALTH SERVICES</span>
              <h2>Clinic Sign in</h2>
              <p>Faster and easier access to clinic for the Unibersidad de Manila Students.</p>
            </div>
            <div class="tabs">
              <button class="${role == "admin" ? "on" : ""}" onclick="setRole('admin')">Clinic Staff</button>
              <button class="${role == "student" ? "on" : ""}" onclick="setRole('student')">Student</button>
            </div>
            <label>Username</label>
            <input id="lu">
            <label>Password</label>
            <input id="lp" type="password" onkeydown="if(event.key=='Enter')login()">
            <div class="err">${esc(err)}</div>
            <p><button class="btn" style="width:100%" onclick="login()">Log in</button></p>
            <div class="hint">Demo accounts:<br>Staff – admin / admin123<br>Student – student / student123</div>
          </div>
        </main>
      </div>`;
    return;
  }
  if (!pg) pg = MENU[U.role][0][0];
  $("#app").innerHTML =
    `<div class="wrap"><nav><div class="who">${esc(U.name)}<br>${U.role == "admin" ? "Clinic Staff" : "Student"}</div>${MENU[U.role].map((m) => `<a class="${pg == m[0] ? "on" : ""}" onclick="${m[0] == "rec" ? "ps=null;" : ""}go('${m[0]}')">${m[1]}</a>`).join("")}</nav><main id="mn"></main></div>`;
  $("#mn").innerHTML = PAGES[pg]();
  if (pg == "appts") tbl();
}
function setRole(r) {
  role = r;
  err = "";
  render();
}
function login() {
  const a = ACC[role];
  if (v("lu") == a.u && $("#lp").value == a.p) {
    U = { ...a, role };
    err = "";
    pg = "";
    log(a.name + " logged in");
    render();
  } else {
    err = "Invalid username or password.";
    render();
  }
}
const medSt = (m) =>
  m.exp < today()
    ? "Expired"
    : m.exp < dd(30)
      ? "Expiring"
      : m.qty <= m.min
        ? "Low"
        : "OK";
const anns = () =>
  S.ann
    .map(
      (a) =>
        `<div class="ann"><b>${esc(a.title)}</b> <small>${a.date}</small><br>${esc(a.body)}</div>`,
    )
    .join("") || "<p>No advisories.</p>";
const opts = (a) => a.map((x) => `<option>${esc(x)}</option>`).join("");
const PAGES = {
  dash() {
    const A = S.appts,
      c = (s) => A.filter((x) => x.st == s).length,
      low = S.meds.filter((m) => medSt(m) != "OK").length,
      mo = today().slice(0, 7);
    const mx = Math.max(
      1,
      ...S.services.map((x) => A.filter((a) => a.svc == x.n).length),
    );
    return `<h2>Clinic Dashboard</h2><div class="cards"><div class="card"><b>${A.filter((a) => a.date == today()).length}</b><span>Appointments today</span></div><div class="card"><b>${c("Pending")}</b><span>Pending approval</span></div><div class="card"><b>${S.queue.filter((q) => q.st == "Waiting").length}</b><span>Waiting in queue</span></div><div class="card ${low ? "w" : ""}"><b>${low}</b><span>Medicine alerts</span></div><div class="card"><b>${S.visits.filter((x) => x.date.startsWith(mo)).length}</b><span>Visits this month</span></div><div class="card"><b>${S.certs.length}</b><span>Certificates issued</span></div></div>
 <div class="box"><h3>Pending requests</h3>${
   A.filter((a) => a.st == "Pending")
     .map(
       (a) =>
         `<div class="bl"><i>${esc(a.name)}</i>${esc(a.svc)} · ${a.date} ${a.time}${a.urg == "Urgent" ? ' <span class="tag Urgent">Urgent</span>' : ""} <button class="btn sm" onclick="setSt(${a.id},'Approved')">Approve</button></div>`,
     )
     .join("") || "<p>None</p>"
 }</div>
 <div class="box"><h3>Appointments by service</h3>${S.services
   .map((x) => {
     const n = A.filter((a) => a.svc == x.n).length;
     return `<div class="bl"><i>${esc(x.n)}</i><div class="bar" style="width:${(n / mx) * 50 + 2}%"></div>${n}</div>`;
   })
   .join("")}</div>
 <div class="box"><h3>Medicines needing attention</h3>${
   S.meds
     .filter((m) => medSt(m) != "OK")
     .map(
       (m) =>
         `<div class="bl"><i>${esc(m.n)}</i><span class="tag ${medSt(m)}">${medSt(m)}</span> qty ${m.qty}</div>`,
     )
     .join("") || "<p>All stocked</p>"
 }</div>`;
  },
  appts() {
    return `<h2>Appointments</h2><div class="row"><input placeholder="Search name, student no., service…" value="${esc(filt.q)}" oninput="filt.q=this.value;tbl()"><select onchange="filt.st=this.value;tbl()">${["", "Pending", "Approved", "Declined", "Completed", "No-show", "Cancelled"].map((s) => `<option value="${s}" ${filt.st == s ? "selected" : ""}>${s || "All statuses"}</option>`).join("")}</select><button class="btn n" onclick="csv()">Copy CSV</button></div><div id="tb"></div>`;
  },
  queue() {
    const q = S.queue
      .filter((x) => x.st != "Done")
      .sort(
        (a, b) =>
          (a.pr == "Urgent" ? 0 : 1) - (b.pr == "Urgent" ? 0 : 1) ||
          a.id - b.id,
      );
    return `<h2>Walk-in Queue</h2><div class="box"><div class="row"><input id="qn" placeholder="Patient name"><input id="qs" placeholder="Student no."><input id="qc" placeholder="Complaint"><select id="qp"><option>Normal</option><option>Urgent</option></select><button class="btn n" onclick="addQ()">Add to queue</button></div></div>
 <div class="tw"><table><tr><th>#</th><th>Patient</th><th>Complaint</th><th>Priority</th><th>Status</th><th></th></tr>${q.map((x) => `<tr><td>${x.id}</td><td>${esc(x.name)}</td><td>${esc(x.cc)}</td><td><span class="tag ${x.pr}">${x.pr}</span></td><td><span class="tag ${x.st == "Serving" ? "Serving" : "Waiting"}">${x.st}</span></td><td>${x.st == "Waiting" ? `<button class="btn sm" onclick="qSt(${x.id},'Serving')">Call</button>` : `<button class="btn sm" onclick="qSt(${x.id},'Done')">Finish</button>`}</td></tr>`).join("") || '<tr><td colspan="6">Queue is empty.</td></tr>'}</table></div>`;
  },
  rec() {
    if (ps) {
      const p = S.patients[ps],
        vs = S.visits.filter((x) => x.sid == ps).reverse();
      return `<h2>${esc(p.name)} <small style="font-weight:400;font-size:13px">${esc(ps)}</small></h2><p><button class="btn gray sm" onclick="ps=null;go('rec')">← All patients</button></p>
 <div class="box"><h3>Health profile</h3>Blood type: <b>${esc(p.blood || "—")}</b> · Allergies: <b>${esc(p.allergy || "None recorded")}</b> · Conditions: <b>${esc(p.cond || "None recorded")}</b><br>Emergency contact: <b>${esc(p.em || "—")}</b></div>
 <div class="box"><h3>New visit record</h3><div class="row"><input id="vc" placeholder="Chief complaint"><input id="vb" placeholder="BP e.g. 120/80"><input id="vt" placeholder="Temp °C"><input id="vp" placeholder="Pulse"></div><div class="row"><input id="vd" placeholder="Diagnosis / assessment"><input id="vx" placeholder="Treatment / advice"></div>
 <div class="row"><select id="vm"><option value="">No medicine dispensed</option>${S.meds.map((m) => `<option>${esc(m.n)}</option>`).join("")}</select><input id="vq" type="number" min="1" value="1" class="n" style="max-width:90px"><button class="btn n" onclick="addVisit()">Save visit</button></div></div>
 <div class="tw"><table><tr><th>Date</th><th>Complaint</th><th>Vitals</th><th>Diagnosis</th><th>Treatment</th></tr>${vs.map((x) => `<tr><td>${x.date}</td><td>${esc(x.cc)}</td><td>${esc(x.bp)} · ${esc(x.temp)}°C · ${esc(x.pulse)} bpm</td><td>${esc(x.dx)}</td><td>${esc(x.tx)}</td></tr>`).join("") || '<tr><td colspan="5">No visits yet.</td></tr>'}</table></div>`;
    }
    const q = (window.rq || "").toLowerCase();
    return `<h2>Patient Records</h2><div class="row"><input placeholder="Search patient…" value="${esc(window.rq || "")}" oninput="window.rq=this.value;go('rec');const e=$('main input');e.focus();e.setSelectionRange(99,99)"></div><div class="tw"><table><tr><th>Student no.</th><th>Name</th><th>Allergies</th><th>Visits</th><th></th></tr>${Object.entries(
      S.patients,
    )
      .filter(([k, p]) => (k + p.name).toLowerCase().includes(q))
      .map(
        ([k, p]) =>
          `<tr><td>${esc(k)}</td><td>${esc(p.name)}</td><td>${esc(p.allergy || "—")}</td><td>${S.visits.filter((x) => x.sid == k).length}</td><td><button class="btn sm" onclick="ps='${esc(k)}';go('rec')">Open</button></td></tr>`,
      )
      .join("")}</table></div>`;
  },
  meds() {
    return `<h2>Medicine Inventory</h2><div class="box"><div class="row"><input id="mn1" placeholder="Medicine / supply"><input id="mq" type="number" placeholder="Qty"><input id="mi" type="number" placeholder="Min. stock"><input id="me" type="date"><button class="btn n" onclick="addMed()">Add item</button></div></div>
 <div class="tw"><table><tr><th>Item</th><th>Qty</th><th>Min</th><th>Expiry</th><th>Status</th><th>Restock</th></tr>${S.meds.map((m, i) => `<tr><td>${esc(m.n)}</td><td>${m.qty}</td><td>${m.min}</td><td>${m.exp}</td><td><span class="tag ${medSt(m)}">${medSt(m)}</span></td><td style="white-space:nowrap"><input id="rs${i}" type="number" min="1" value="10" style="width:70px"> <button class="btn sm" onclick="restock(${i})">Add</button><button class="btn red sm" onclick="sure(this,'delMed(${i})')">Remove</button></td></tr>`).join("")}</table></div>`;
  },
  certs() {
    const c = cv && S.certs.find((x) => x.id == cv);
    return `<h2>Medical Certificates</h2>${c ? `<div class="cert" id="cert"><h3>UNIBERSIDAD DE MANILA — UNIVERSITY HEALTH CLINIC<br>MEDICAL CERTIFICATE</h3><p>Date: ${c.date}</p><p>This is to certify that <b>${esc(c.name)}</b> (${esc(c.sid)}) was examined at the University Health Clinic and is hereby issued a <b>${esc(c.type)}</b>${c.days ? ` for <b>${c.days}</b> day(s)` : ""}.</p><p>Remarks: ${esc(c.note || "—")}</p><p style="margin-top:36px">______________________<br>Attending clinic staff</p></div><p><button class="btn" onclick="window.print()">Print</button> <button class="btn gray" onclick="cv=null;go('certs')">Close</button></p>` : ""}
 <div class="box"><div class="row"><input id="cn" placeholder="Student name"><input id="cs" placeholder="Student no."><select id="ct">${opts(["Fit to Study / Clearance", "Medical Excuse (Rest)", "Dental Clearance", "Fit for OJT / Sports"])}</select><input id="cd" type="number" min="0" placeholder="Days of rest" class="n" style="max-width:130px"></div><div class="row"><input id="cr" placeholder="Remarks"><button class="btn n" onclick="addCert()">Issue certificate</button></div></div>
 <div class="tw"><table><tr><th>Date</th><th>Student</th><th>Type</th><th></th></tr>${S.certs.map((x) => `<tr><td>${x.date}</td><td>${esc(x.name)}</td><td>${esc(x.type)}</td><td><button class="btn sm" onclick="cv=${x.id};go('certs')">View / Print</button></td></tr>`).join("") || '<tr><td colspan="4">None issued yet.</td></tr>'}</table></div>`;
  },
  book() {
    const st = U.role == "student";
    return `<h2>${st ? "Book a Clinic Appointment" : "New Booking"}</h2><div class="alert"><b>Emergency?</b> Do not book online — go to the clinic right away or ask someone nearby to call for emergency help.</div><div class="box"><div class="row"><input id="bn" placeholder="Student name" value="${st ? esc(U.name) : ""}"><input id="bs" placeholder="Student no." value="${st ? U.sid : ""}"></div>
 <div class="row"><select id="bv">${opts(S.services.map((x) => x.n))}</select><input id="bd" type="date" min="${today()}" value="${today()}"><select id="bt">${opts(SLOTS)}</select><select id="bu"><option>Normal</option><option>Urgent</option></select></div>
 <label>Symptoms / reason for visit</label><textarea id="bp" rows="3"></textarea><p><button class="btn" onclick="addAppt()">Submit appointment</button></p></div>`;
  },
  mine() {
    return `<h2>My Appointments</h2>${tableOf(
      S.appts.filter((a) => a.sid == U.sid),
      false,
    )}`;
  },
  prof() {
    const p = S.patients[U.sid] || {},
      vs = S.visits.filter((x) => x.sid == U.sid),
      cs = S.certs.filter((x) => x.sid == U.sid);
    return `<h2>My Health Profile</h2><div class="box"><div class="row"><div><label>Blood type</label><select id="pb">${["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => `<option ${p.blood == b ? "selected" : ""}>${b}</option>`).join("")}</select></div><div><label>Allergies</label><input id="pa" value="${esc(p.allergy)}"></div></div><div class="row"><div><label>Existing conditions</label><input id="pc" value="${esc(p.cond)}"></div><div><label>Emergency contact</label><input id="pe" value="${esc(p.em)}"></div></div><p><button class="btn" onclick="saveProf()">Save profile</button></p></div>
 <h3>My clinic visits</h3><div class="tw"><table><tr><th>Date</th><th>Complaint</th><th>Diagnosis</th><th>Advice</th></tr>${vs.map((x) => `<tr><td>${x.date}</td><td>${esc(x.cc)}</td><td>${esc(x.dx)}</td><td>${esc(x.tx)}</td></tr>`).join("") || '<tr><td colspan="4">No visits on record.</td></tr>'}</table></div><h3>My certificates</h3>${cs.map((x) => `<div class="ann">${x.date} – ${esc(x.type)}</div>`).join("") || "<p>None issued.</p>"}`;
  },
  cal() {
    const d = window.cd || today();
    return `<h2>Daily Schedule</h2><div class="row"><input type="date" value="${d}" onchange="window.cd=this.value;go('cal')" style="max-width:200px"></div><div class="tw"><table><tr><th>Time</th>${S.services.map((x) => `<th>${esc(x.n)}</th>`).join("")}</tr>${SLOTS.map(
      (t) =>
        `<tr><td><b>${t}</b></td>${S.services
          .map((x) => {
            const l = S.appts.filter(
              (a) =>
                a.svc == x.n &&
                a.date == d &&
                a.time == t &&
                !["Declined", "Cancelled"].includes(a.st),
            );
            return `<td>${l.map((a) => esc(a.name)).join("<br>") || '<span style="color:#aaa">open</span>'}</td>`;
          })
          .join("")}</tr>`,
    ).join("")}</table></div>`;
  },
  svc() {
    return `<h2>Clinic Services</h2><div class="box"><div class="row"><input id="sn" placeholder="New service"><input id="sc" type="number" min="1" value="1" class="n" style="max-width:110px" title="Slots per hour"><button class="btn n" onclick="addSvc()">Add</button></div></div><div class="tw"><table><tr><th>Service</th><th>Slots per hour</th><th></th></tr>${S.services.map((x, i) => `<tr><td>${esc(x.n)}</td><td>${x.cap}</td><td><button class="btn red sm" onclick="sure(this,'delSvc(${i})')">Remove</button></td></tr>`).join("")}</table></div>`;
  },
  ann() {
    return `<h2>Health Advisories</h2>${U.role == "admin" ? `<div class="box"><input id="at" placeholder="Title"><textarea id="ab" rows="2" placeholder="Message to students" style="margin-top:8px"></textarea><p><button class="btn" onclick="addAnn()">Post advisory</button></p></div>` : ""}${anns()}`;
  },
  log() {
    return `<h2>Activity Log</h2><div class="box">${S.log.map((l) => `<div style="font-size:13px;padding:4px 0;border-bottom:1px solid var(--b)">${esc(l)}</div>`).join("")}</div><button class="btn gray" onclick="sure(this,'S=seed();save();go(\\'dash\\')')">Reset demo data</button>`;
  },
};
function tableOf(l, adm) {
  return `<div class="tw"><table><tr><th>Patient</th><th>Service</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th></th></tr>${l.map((a) => `<tr><td>${esc(a.name)}<br><small>${esc(a.sid)}</small></td><td>${esc(a.svc)}</td><td>${a.date}</td><td>${a.time}</td><td>${a.urg == "Urgent" ? '<span class="tag Urgent">Urgent</span> ' : ""}${esc(a.note)}</td><td><span class="tag ${a.st}">${a.st}</span></td><td style="white-space:nowrap">${adm ? (a.st == "Pending" ? `<button class="btn sm" onclick="setSt(${a.id},'Approved')">Approve</button><button class="btn red sm" onclick="setSt(${a.id},'Declined')">Decline</button>` : a.st == "Approved" ? `<button class="btn sm" onclick="setSt(${a.id},'Completed')">Complete</button><button class="btn gray sm" onclick="setSt(${a.id},'No-show')">No-show</button>` : "") + `<button class="btn gray sm" onclick="sure(this,'delA(${a.id})')">Delete</button>` : ["Pending", "Approved"].includes(a.st) ? `<button class="btn red sm" onclick="setSt(${a.id},'Cancelled')">Cancel</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="7">No appointments found.</td></tr>'}</table></div>`;
}
const fl = () => {
  const q = filt.q.toLowerCase();
  return S.appts
    .filter(
      (a) =>
        (!filt.st || a.st == filt.st) &&
        (a.name + a.sid + a.svc + a.note).toLowerCase().includes(q),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
};
const tbl = () => ($("#tb").innerHTML = tableOf(fl(), true)),
  refresh = () => (pg == "appts" ? tbl() : go(pg));
function setSt(id, s) {
  const a = S.appts.find((x) => x.id == id);
  a.st = s;
  log(`${a.name}’s appointment: ${s}`);
  save();
  toast("Marked " + s);
  refresh();
}
function delA(id) {
  S.appts = S.appts.filter((x) => x.id != id);
  log("Appointment deleted");
  save();
  refresh();
}
function addAppt() {
  const n = v("bn"),
    s = v("bs"),
    sv = v("bv"),
    d = v("bd"),
    t = v("bt"),
    p = v("bp");
  if (!n || !s || !d || !p) return toast("Please fill in all fields");
  if (d < today()) return toast("Date cannot be in the past");
  const w = new Date(d + "T00:00").getDay();
  if (w == 0 || w == 6) return toast("The clinic is closed on weekends");
  const cap = S.services.find((x) => x.n == sv).cap,
    u = S.appts.filter(
      (a) =>
        a.svc == sv &&
        a.date == d &&
        a.time == t &&
        !["Declined", "Cancelled"].includes(a.st),
    ).length;
  if (u >= cap) return toast("That slot is full – choose another time");
  ensure(s, n);
  S.appts.push({
    id: S.next++,
    name: n,
    sid: s,
    svc: sv,
    date: d,
    time: t,
    note: p,
    urg: v("bu"),
    st: "Pending",
  });
  log(`New booking: ${n} – ${sv}`);
  save();
  toast("Appointment submitted!");
  go(U.role == "admin" ? "appts" : "mine");
}
function addQ() {
  const n = v("qn"),
    c = v("qc");
  if (!n || !c) return toast("Enter name and complaint");
  if (v("qs")) ensure(v("qs"), n);
  S.queue.push({
    id: S.next++,
    name: n,
    sid: v("qs"),
    cc: c,
    pr: v("qp"),
    st: "Waiting",
  });
  log("Walk-in added: " + n);
  save();
  go("queue");
}
function qSt(id, s) {
  S.queue.find((x) => x.id == id).st = s;
  save();
  go("queue");
}
function addVisit() {
  if (!v("vc")) return toast("Enter the chief complaint");
  const m = v("vm"),
    q = +$("#vq").value || 1;
  if (m) {
    const it = S.meds.find((x) => x.n == m);
    if (it.qty < q) return toast("Not enough stock");
    it.qty -= q;
  }
  S.visits.push({
    id: S.next++,
    sid: ps,
    date: today(),
    cc: v("vc"),
    bp: v("vb") || "—",
    temp: v("vt") || "—",
    pulse: v("vp") || "—",
    dx: v("vd") || "—",
    tx: v("vx") + (m ? ` (${m} ×${q})` : ""),
  });
  log("Visit recorded for " + S.patients[ps].name);
  save();
  toast("Visit saved");
  go("rec");
}
function addMed() {
  if (!v("mn1") || !v("me")) return toast("Enter name and expiry");
  S.meds.push({
    n: v("mn1"),
    qty: +v("mq") || 0,
    min: +v("mi") || 0,
    exp: v("me"),
  });
  log("Inventory item added: " + v("mn1"));
  save();
  go("meds");
}
function restock(i) {
  S.meds[i].qty += +$("#rs" + i).value || 0;
  log("Restocked " + S.meds[i].n);
  save();
  go("meds");
}
function delMed(i) {
  S.meds.splice(i, 1);
  save();
  go("meds");
}
function addCert() {
  if (!v("cn") || !v("cs")) return toast("Enter student name and number");
  ensure(v("cs"), v("cn"));
  const c = {
    id: S.next++,
    name: v("cn"),
    sid: v("cs"),
    type: v("ct"),
    days: +v("cd") || 0,
    note: v("cr"),
    date: today(),
  };
  S.certs.unshift(c);
  log("Certificate issued: " + c.name);
  save();
  cv = c.id;
  go("certs");
}
function saveProf() {
  Object.assign(S.patients[U.sid], {
    blood: v("pb"),
    allergy: v("pa"),
    cond: v("pc"),
    em: v("pe"),
  });
  save();
  toast("Profile saved");
}
function addSvc() {
  if (!v("sn")) return;
  S.services.push({ n: v("sn"), cap: Math.max(1, +v("sc") || 1) });
  save();
  go("svc");
}
function delSvc(i) {
  S.services.splice(i, 1);
  save();
  go("svc");
}
function addAnn() {
  if (!v("at")) return;
  S.ann.unshift({ id: S.next++, title: v("at"), body: v("ab"), date: today() });
  save();
  go("ann");
}
function csv() {
  const t =
    "Name,Student No,Service,Date,Time,Status\n" +
    fl()
      .map((a) =>
        [a.name, a.sid, a.svc, a.date, a.time, a.st]
          .map((x) => `"${x}"`)
          .join(","),
      )
      .join("\n");
  try {
    navigator.clipboard.writeText(t);
    toast("CSV copied");
  } catch (e) {
    toast("Copy not available");
  }
}
render();
