const $ = id => document.getElementById(id);
async function request(url, options = {}) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}
function message(id, text, type = "success") {
  const el = $(id); el.textContent = text; el.className = `message ${type}`; el.classList.remove("hidden");
}
async function loadDashboard() {
  const [reservations, tables] = await Promise.all([
    request("/api/staff/reservations"), request("/api/staff/tables")
  ]);
  $("reservationsBody").innerHTML = reservations.map(r => `<tr>
    <td>#${r.reservation_id}</td><td>${safe(r.customer_name)}</td>
    <td>${safe(r.phone_number)}<br><small>${safe(r.email)}</small></td>
    <td>${r.table_number}</td><td>${safe(r.reservation_date)}<br>${safe(r.reservation_time)}</td><td>${r.guests}</td>
    <td><span class="status">${safe(r.status)}</span></td>
    <td><select data-reservation="${r.reservation_id}" class="reservation-status">
      ${["Pending","Confirmed","Cancelled","Completed"].map(s => `<option ${s===r.status?"selected":""}>${s}</option>`).join("")}
    </select><button class="tiny-btn save-reservation" data-id="${r.reservation_id}">Save</button></td></tr>`).join("") || '<tr><td colspan="8">No reservations yet.</td></tr>';
  $("tablesBody").innerHTML = tables.map(t => `<tr><td>${t.table_number}</td><td>${t.seating_capacity}</td><td>${safe(t.location)}</td><td>${safe(t.status)}</td>
    <td><select data-table="${t.table_id}" class="table-status"><option ${t.status==="Available"?"selected":""}>Available</option><option ${t.status==="Unavailable"?"selected":""}>Unavailable</option></select><button class="tiny-btn save-table" data-id="${t.table_id}">Save</button></td></tr>`).join("");
}
$("staffLogin").addEventListener("submit", async e => {
  e.preventDefault();
  const form = Object.fromEntries(new FormData(e.currentTarget).entries());
  try {
    await request("/api/staff/login", { method: "POST", body: JSON.stringify(form) });
    $("loginPanel").classList.add("hidden"); $("dashboard").classList.remove("hidden");
    await loadDashboard();
  } catch (err) { message("staffMessage", err.message, "error"); }
});
$("dashboard").addEventListener("click", async e => {
  if (e.target.classList.contains("save-reservation")) {
    const id = e.target.dataset.id;
    const status = document.querySelector(`[data-reservation="${id}"]`).value;
    try { const result = await request(`/api/staff/reservations/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); message("dashboardMessage", result.message); await loadDashboard(); }
    catch (err) { message("dashboardMessage", err.message, "error"); }
  }
  if (e.target.classList.contains("save-table")) {
    const id = e.target.dataset.id;
    const status = document.querySelector(`[data-table="${id}"]`).value;
    try { const result = await request(`/api/staff/tables/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); message("dashboardMessage", result.message); await loadDashboard(); }
    catch (err) { message("dashboardMessage", err.message, "error"); }
  }
});
$("logout").addEventListener("click", async () => {
  try { await request("/api/staff/logout", { method: "POST" }); } catch (_) {}
  $("dashboard").classList.add("hidden"); $("loginPanel").classList.remove("hidden");
});
function safe(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
