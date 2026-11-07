const $ = (id) => document.getElementById(id);
let selectedTable = null;
let customerName = "";
let bookingData = {};

function showMessage(message, type = "success") {
  const box = $("message");
  box.textContent = message;
  box.className = `message ${type}`;
  box.classList.remove("hidden");
}
function clearMessage() { $("message").classList.add("hidden"); }
function showPage(page) {
  ["page1", "page2", "page3", "successPage"].forEach(id => $(id).classList.add("hidden"));
  $(page).classList.remove("hidden");
  document.querySelectorAll(".step").forEach(el => {
    el.classList.toggle("active", Number(el.dataset.step) === Number(page.slice(-1)) && page !== "successPage");
    el.classList.toggle("done", Number(el.dataset.step) < Number(page.slice(-1)));
  });
  clearMessage();
}
async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}
async function loadTables() {
  const tables = await api("/api/tables");
  const list = $("tablesList");
  if (!tables.length) {
    list.innerHTML = '<p class="muted">No tables are available right now.</p>';
    return;
  }
  list.innerHTML = tables.map(t => `
    <label class="table-choice">
      <input type="radio" name="table_id" value="${t.table_id}" data-number="${t.table_number}" data-capacity="${t.seating_capacity}" data-location="${t.location}" required>
      <span><strong>Table ${t.table_number}</strong><small>${t.seating_capacity} seats · ${t.location}</small></span>
      <em>Available</em>
    </label>`).join("");
}
$("startBooking").addEventListener("click", () => $("booking").scrollIntoView({ behavior: "smooth" }));
$("customerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    const result = await api("/api/customers", { method: "POST", body: JSON.stringify(form) });
    customerName = result.customerName;
    await loadTables();
    showPage("page2");
  } catch (err) { showMessage(err.message, "error"); }
});
$("backTo1").addEventListener("click", () => showPage("page1"));
$("reservationForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const chosen = document.querySelector('input[name="table_id"]:checked');
  if (!chosen) return showMessage("Please select an available table.", "error");
  const date = $("reservationDate").value;
  const time = $("reservationTime").value;
  const guests = Number($("guests").value);
  const capacity = Number(chosen.dataset.capacity);
  if (guests > capacity) return showMessage(`This table has only ${capacity} seats. Select another table.`, "error");
  if (!date || !time) return showMessage("Please select reservation date and time.", "error");
  selectedTable = {
    table_id: Number(chosen.value),
    table_number: chosen.dataset.number,
    location: chosen.dataset.location,
    capacity
  };
  bookingData = { reservation_date: date, reservation_time: time, guests };
  $("bookingSummary").innerHTML = `
    <p><span>Restaurant</span><strong>Sathvika Restaurant</strong></p>
    <p><span>Customer</span><strong>${escapeText(customerName)}</strong></p>
    <p><span>Table</span><strong>Table ${selectedTable.table_number} · ${escapeText(selectedTable.location)}</strong></p>
    <p><span>Date</span><strong>${escapeText(date)}</strong></p>
    <p><span>Time</span><strong>${escapeText(time)}</strong></p>
    <p><span>Guests</span><strong>${guests}</strong></p>`;
  showPage("page3");
});
$("backTo2").addEventListener("click", () => showPage("page2"));
$("confirmBooking").addEventListener("click", async () => {
  $("confirmBooking").disabled = true;
  try {
    const result = await api("/api/reservations", {
      method: "POST",
      body: JSON.stringify({ ...bookingData, table_id: selectedTable.table_id })
    });
    $("successText").textContent = `Reservation #${result.reservationId} for Table ${result.tableNumber} has been saved. Status: ${result.status}.`;
    showPage("successPage");
  } catch (err) {
    showPage("page2");
    showMessage(err.message, "error");
    try { await loadTables(); } catch (_) {}
  } finally { $("confirmBooking").disabled = false; }
});
$("newBooking").addEventListener("click", () => {
  $("customerForm").reset(); $("reservationForm").reset();
  selectedTable = null; bookingData = {}; customerName = "";
  showPage("page1");
  $("booking").scrollIntoView({ behavior: "smooth" });
});
function escapeText(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}
const today = new Date();
$("reservationDate").min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0,10);
