const express = require("express");
const db = require("./db");
const { requireRole } = require("./auth");

const router = express.Router();

const bloodGroups = [
    "A+", "A-", "B+", "B-",
    "AB+", "AB-", "O+", "O-"
];


// 1. Staff adds blood units
router.post("/inventory/add", requireRole("staff"), async (req, res) => {
    try {

        const { blood_group, units } = req.body;

        if (!bloodGroups.includes(blood_group) ||
            !Number.isInteger(units) || units <= 0 || units > 10000) {

            return res.status(400).json({
                message: "Invalid blood group or units"
            });
        }

        await db.query(`
            UPDATE inventory
            SET units = units + ?
            WHERE blood_group = ?
        `, [units, blood_group]);

        res.json({
            message: "Blood units added successfully"
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Unable to update inventory" });
    }
});


// 2. Hospital creates a blood request
router.post("/requests", requireRole("hospital"), async (req, res) => {
    try {

        const { blood_group, units } = req.body;
        const hospital_id = req.session.user.id;

        if (!bloodGroups.includes(blood_group) ||
            !Number.isInteger(units) || units <= 0 || units > 10000) {

            return res.status(400).json({
                message: "Invalid blood group or units"
            });
        }

        await db.query(`
            INSERT INTO requests
            (hospital_id, blood_group, units)
            VALUES (?, ?, ?)
        `, [hospital_id, blood_group, units]);

        res.status(201).json({
            message: "Blood request submitted successfully"
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Unable to submit request" });
    }
});


// 3. Hospital views its own requests
router.get("/my-requests", requireRole("hospital"), async (req, res) => {
    try {

        const [rows] = await db.query(`
            SELECT * FROM requests
            WHERE hospital_id = ?
            ORDER BY id DESC
        `, [req.session.user.id]);

        res.json(rows);

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Database error" });
    }
});


// 4. Staff fulfils a blood request
router.post("/requests/:id/fulfill", requireRole("staff"), async (req, res) => {

    let connection;

    try {

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [requests] = await connection.query(`
            SELECT * FROM requests
            WHERE id = ?
            FOR UPDATE
        `, [req.params.id]);

        if (requests.length === 0 ||
            requests[0].status !== "pending") {

            await connection.rollback();

            return res.status(400).json({
                message: "Invalid or already processed request"
            });
        }

        const request = requests[0];

        const [result] = await connection.query(`
            UPDATE inventory
            SET units = units - ?
            WHERE blood_group = ?
            AND units >= ?
        `, [
            request.units,
            request.blood_group,
            request.units
        ]);

        if (result.affectedRows === 0) {

            await connection.rollback();

            return res.status(400).json({
                message: "Insufficient blood stock"
            });
        }

        await connection.query(`
            UPDATE requests
            SET status = 'fulfilled'
            WHERE id = ?
        `, [request.id]);

        await connection.commit();

        res.json({
            message: "Request fulfilled successfully"
        });

    } catch (error) {

        if (connection) {
            await connection.rollback();
        }

        console.log(error.message);

        res.status(500).json({
            message: "Unable to fulfill request"
        });

    } finally {

        if (connection) {
            connection.release();
        }
    }
});


// 5. Staff rejects a blood request
router.post("/requests/:id/reject", requireRole("staff"), async (req, res) => {
    try {

        const [result] = await db.query(`
            UPDATE requests
            SET status = 'rejected'
            WHERE id = ?
            AND status = 'pending'
        `, [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(400).json({
                message: "Invalid or already processed request"
            });
        }

        res.json({
            message: "Request rejected successfully"
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Unable to reject request" });
    }
});

module.exports = router;