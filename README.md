# Sathvika Restaurant Table Reservation Management System

Technology stack: HTML, CSS, JavaScript, Node.js, Express.js and MySQL.

## Features
- Three-page customer booking process: customer details → choose date/time/table → confirm.
- Available table list is loaded from MySQL.
- Reservation is checked again on the server before saving.
- Successful booking is stored in the `reservations` table.
- Conflicting slot displays: "This slot is unavailable. Please try booking another table."
- Staff dashboard displays reservations and lets staff update booking status.
- Staff can mark tables Available or Unavailable.
- Passwords are hashed using bcryptjs.

## Requirements
- Node.js 18 or newer
- MySQL Server and MySQL Workbench

## Step 1: Create the database
1. Start MySQL Server.
2. Open MySQL Workbench and connect to your local server.
3. Open `database.sql` from this folder.
4. Execute the complete script.
5. Confirm that `sathvika_restaurant` appears in the Schemas panel.

## Step 2: Configure MySQL
The default `.env.example` values match the details provided for this mini project:
- Host: localhost
- User: root
- Password: sweety
- Database: sathvika_restaurant

Copy `.env.example` to a new file named `.env`. Edit `DB_PASSWORD` if your local MySQL password is different. Do not use these demo credentials on a public server.

## Step 3: Install packages
Open terminal / Command Prompt in this project folder and run:

```bash
npm install
```

## Step 4: Start the website

```bash
npm start
```

Open this URL in your browser:

`http://localhost:3000`

## Customer booking flow
1. Customer details page: name, email, password and phone.
2. Reservation page: choose a date, time, guest count and available table.
3. Confirmation page: check the details and confirm the reservation.

The booking is inserted into MySQL only after the customer clicks Confirm booking.

## Staff dashboard
Open `http://localhost:3000/staff.html`

Demo staff login:
- Username: `staff`
- Password: `admin123`

Staff can update reservation statuses to Pending, Confirmed, Cancelled or Completed and change table availability.

## View saved data in MySQL Workbench

```sql
USE sathvika_restaurant;
SELECT * FROM customers;
SELECT * FROM dining_tables;
SELECT * FROM reservations;
```

## Important project notes
- MySQL Workbench is a database client. The MySQL Server service must be running for the app to connect.
- This educational version defines a slot as an exact table + date + time match. To support booking durations (e.g. 60 or 90 minutes), add interval-overlap validation.
- For real deployment, use HTTPS, a persistent session store, stronger staff authentication, rate limiting and secure secret values.
