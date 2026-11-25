const bloodbankRoutes = require("./routes");
require("dotenv").config();

const express = require("express");
const db = require("./db");

const session = require("express-session");

const {
    router: authRouter,
    requireLogin,
    requireRole
} = require("./auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use("/api/auth", authRouter);
app.use("/api", bloodbankRoutes);
app.use(express.static("public"));


// Test API
app.get("/api/test", (req, res) => {
    res.json({
        message: "Blood Bank Server is working!"
    });
});


// 1. Dashboard statistics
app.get("/api/dashboard", requireRole("staff"), async (req, res) => {
    try {

        const [inventory] = await db.query(`
            SELECT SUM(units) AS total FROM inventory
        `);

        const [donors] = await db.query(`
            SELECT COUNT(*) AS total FROM users
            WHERE role = 'donor'
        `);

        const [pending] = await db.query(`
            SELECT COUNT(*) AS total FROM requests
            WHERE status = 'pending'
        `);

        const [fulfilled] = await db.query(`
            SELECT COUNT(*) AS total FROM requests
            WHERE status = 'fulfilled'
        `);

        res.json({
            totalUnits: Number(inventory[0].total),
            totalDonors: donors[0].total,
            pendingRequests: pending[0].total,
            fulfilledRequests: fulfilled[0].total
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Database error" });
    }
});


// 2. Blood inventory
app.get("/api/inventory", requireLogin, async (req, res) => {
    try {

        const [rows] = await db.query(`
            SELECT blood_group AS \`group\`, units
            FROM inventory
        `);

        res.json(rows);

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Database error" });
    }
});


// 3. Registered donors
app.get("/api/donors", requireRole("staff"), async (req, res) => {
    try {

        const [rows] = await db.query(`
            SELECT id, name, blood_group AS \`group\`, city
            FROM users
            WHERE role = 'donor'
        `);

        res.json(rows);

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Database error" });
    }
});


// 4. Hospital blood requests
app.get("/api/requests", requireRole("staff"), async (req, res) => {
    try {

        const [rows] = await db.query(`
            SELECT
                requests.id,
                users.name AS hospital,
                requests.blood_group AS \`group\`,
                requests.units,
                requests.status,
                requests.created_at
            FROM requests
            JOIN users ON requests.hospital_id = users.id
            ORDER BY requests.id DESC
        `);

        res.json(rows);

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Database error" });
    }
});


// 5. Low-stock alerts
app.get("/api/alerts", requireRole("staff"), async (req, res) => {
    try {

        const [rows] = await db.query(`
            SELECT * FROM alerts
            ORDER BY id DESC
        `);

        res.json(rows);

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Database error" });
    }
});


// Start server (local development only)
app.listen(PORT, "127.0.0.1", () => {
    console.log(`Server running at http://localhost:${PORT}`);
});