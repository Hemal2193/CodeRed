const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("./db");

const router = express.Router();

const bloodGroups = [
    "A+", "A-", "B+", "B-",
    "AB+", "AB-", "O+", "O-"
];


// Register donor or hospital
router.post("/register", async (req, res) => {
    try {

        const {
            name,
            email,
            password,
            role,
            blood_group,
            city
        } = req.body;

        if (!name || !email || typeof password !== "string"
            || password.length < 8) {
            return res.status(400).json({
                message: "Enter valid details and a password of at least 8 characters"
            });
        }

        if (role !== "donor" && role !== "hospital") {
            return res.status(400).json({
                message: "Invalid role"
            });
        }

        if (role === "donor" && !bloodGroups.includes(blood_group)) {
            return res.status(400).json({
                message: "Select a valid blood group"
            });
        }

        const [existing] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(`
            INSERT INTO users
            (name, email, password, role, blood_group, city)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            name,
            email,
            hashedPassword,
            role,
            role === "donor" ? blood_group : null,
            city || null
        ]);

        res.status(201).json({
            message: "Registration successful"
        });

    } catch (error) {
        console.log(error.message);

        res.status(500).json({
            message: "Registration failed"
        });
    }
});


// Login
router.post("/login", async (req, res) => {
    try {

        const { email, password } = req.body;

        if (!email || typeof password !== "string") {
            return res.status(400).json({
                message: "Enter email and password"
            });
        }

        const [rows] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = rows[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        req.session.regenerate((error) => {

            if (error) {
                return res.status(500).json({
                    message: "Login failed"
                });
            }

            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                blood_group: user.blood_group,
                city: user.city
            };

            res.json({
                message: "Login successful",
                user: req.session.user
            });
        });

    } catch (error) {
        console.log(error.message);

        res.status(500).json({
            message: "Login failed"
        });
    }
});


// Get currently logged-in user
router.get("/me", (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            message: "Not logged in"
        });
    }

    res.json(req.session.user);
});


// Logout
router.post("/logout", (req, res) => {

    req.session.destroy((error) => {

        if (error) {
            return res.status(500).json({
                message: "Logout failed"
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message: "Logged out successfully"
        });
    });
});


// Check whether user is logged in
function requireLogin(req, res, next) {

    if (!req.session.user) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    next();
}


// Check whether user has required role
function requireRole(...roles) {

    return (req, res, next) => {

        if (!req.session.user) {
            return res.status(401).json({
                message: "Please login first"
            });
        }

        if (!roles.includes(req.session.user.role)) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        next();
    };
}

module.exports = {
    router,
    requireLogin,
    requireRole
};