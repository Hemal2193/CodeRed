const db = require("./db");
const bcrypt = require("bcryptjs");

async function createStaff() {
    try {

        const password = process.env.STAFF_PASSWORD;

        if (!password || password.length < 8) {
            throw new Error("Set a staff password of at least 8 characters");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(`
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, ?)
        `, [
            "Staff Admin",
            "staff@bloodbank.com",
            hashedPassword,
            "staff"
        ]);

        console.log("Staff account created successfully!");

    } catch (error) {
        console.log(error.message);
    } finally {
        await db.end();
    }
}

createStaff();