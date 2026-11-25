const db = require("./db");

async function testConnection() {
    try {
        const [rows] = await db.query("SELECT 1 AS result");

        console.log("RDS connected successfully!");
        console.log(rows);

    } catch (error) {
        console.log("Connection failed!");
        console.log(error.message);
    } finally {
        await db.end();
    }
}

testConnection();