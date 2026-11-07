require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const path = require("path");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "sweety",
  database: process.env.DB_NAME || "sathvika_restaurant",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 2 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, "public")));

function staffOnly(req, res, next) {
  if (!req.session.staff) return res.status(401).json({ message: "Staff login required." });
  next();
}

app.get("/api/tables", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT table_id, table_number, seating_capacity, location, status FROM dining_tables WHERE status='Available' ORDER BY table_number"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load tables. Check the database connection." });
  }
});

app.post("/api/customers", async (req, res) => {
  const { name, email, password, phone_number } = req.body;
  if (!name?.trim() || !email?.trim() || !password || !phone_number?.trim()) {
    return res.status(400).json({ message: "Please complete all customer details." });
  }
  if (password.length < 6) return res.status(400).json({ message: "Password must contain at least 6 characters." });

  try {
    const [existing] = await pool.query("SELECT customer_id FROM customers WHERE email=?", [email.trim().toLowerCase()]);
    const passwordHash = await bcrypt.hash(password, 10);
    let customerId;
    if (existing.length) {
      customerId = existing[0].customer_id;
      await pool.query(
        "UPDATE customers SET name=?, password=?, phone_number=? WHERE customer_id=?",
        [name.trim(), passwordHash, phone_number.trim(), customerId]
      );
    } else {
      const [result] = await pool.query(
        "INSERT INTO customers (name,email,password,phone_number) VALUES (?,?,?,?)",
        [name.trim(), email.trim().toLowerCase(), passwordHash, phone_number.trim()]
      );
      customerId = result.insertId;
    }
    req.session.customerId = customerId;
    req.session.customerName = name.trim();
    res.json({ message: "Customer details saved.", customerName: name.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not save customer details." });
  }
});

app.post("/api/reservations", async (req, res) => {
  if (!req.session.customerId) return res.status(401).json({ message: "Please enter customer details first." });
  const { table_id, reservation_date, reservation_time, guests } = req.body;
  const guestCount = Number(guests);
  if (!table_id || !reservation_date || !reservation_time || !Number.isInteger(guestCount) || guestCount < 1) {
    return res.status(400).json({ message: "Please provide valid reservation details." });
  }

  const selectedDate = new Date(`${reservation_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(selectedDate.getTime()) || selectedDate < today) {
    return res.status(400).json({ message: "Please select today or a future date." });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [tables] = await connection.query(
      "SELECT table_id, table_number, seating_capacity, status FROM dining_tables WHERE table_id=? FOR UPDATE",
      [table_id]
    );
    if (!tables.length || tables[0].status !== "Available") {
      await connection.rollback();
      return res.status(409).json({ message: "This table is unavailable. Please try booking another table." });
    }
    const table = tables[0];
    if (guestCount > table.seating_capacity) {
      await connection.rollback();
      return res.status(400).json({ message: `This table has only ${table.seating_capacity} seats. Please select a suitable table.` });
    }

    const [conflicts] = await connection.query(
      `SELECT reservation_id FROM reservations
       WHERE table_id=? AND reservation_date=? AND reservation_time=?
       AND status IN ('Pending','Confirmed') FOR UPDATE`,
      [table_id, reservation_date, reservation_time]
    );
    if (conflicts.length) {
      await connection.rollback();
      return res.status(409).json({ message: "This slot is unavailable. Please try booking another table." });
    }

    const [result] = await connection.query(
      `INSERT INTO reservations
       (customer_id, table_id, reservation_date, reservation_time, guests, status)
       VALUES (?,?,?,?,?,'Pending')`,
      [req.session.customerId, table_id, reservation_date, reservation_time, guestCount]
    );
    await connection.commit();
    res.status(201).json({
      message: "Reservation is successful!",
      reservationId: result.insertId,
      tableNumber: table.table_number,
      status: "Pending"
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Reservation could not be completed. Please try again." });
  } finally {
    if (connection) connection.release();
  }
});

app.post("/api/staff/login", (req, res) => {
  const username = process.env.STAFF_USERNAME || "staff";
  const password = process.env.STAFF_PASSWORD || "admin123";
  if (req.body.username === username && req.body.password === password) {
    req.session.staff = true;
    return res.json({ message: "Staff login successful." });
  }
  res.status(401).json({ message: "Incorrect staff username or password." });
});

app.post("/api/staff/logout", staffOnly, (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out." }));
});

app.get("/api/staff/reservations", staffOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.reservation_id, c.name AS customer_name, c.email, c.phone_number,
             t.table_number, r.reservation_date, r.reservation_time, r.guests, r.status
      FROM reservations r
      JOIN customers c ON c.customer_id=r.customer_id
      JOIN dining_tables t ON t.table_id=r.table_id
      ORDER BY r.reservation_date DESC, r.reservation_time DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load reservations." });
  }
});

app.patch("/api/staff/reservations/:id", staffOnly, async (req, res) => {
  const allowed = ["Pending", "Confirmed", "Cancelled", "Completed"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid status." });
  try {
    const [result] = await pool.query("UPDATE reservations SET status=? WHERE reservation_id=?", [req.body.status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Reservation not found." });
    res.json({ message: "Reservation status updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update reservation." });
  }
});

app.get("/api/staff/tables", staffOnly, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM dining_tables ORDER BY table_number");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unable to load tables." });
  }
});

app.patch("/api/staff/tables/:id", staffOnly, async (req, res) => {
  if (!["Available", "Unavailable"].includes(req.body.status)) {
    return res.status(400).json({ message: "Invalid table status." });
  }
  try {
    const [result] = await pool.query("UPDATE dining_tables SET status=? WHERE table_id=?", [req.body.status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Table not found." });
    res.json({ message: "Table status updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update table status." });
  }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`Sathvika Restaurant app running at http://localhost:${PORT}`));
