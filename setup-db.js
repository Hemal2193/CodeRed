const db = require("./db");

async function setupDatabase() {
    try {

        // 1. Users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('donor', 'hospital', 'staff') NOT NULL,
                blood_group VARCHAR(3),
                city VARCHAR(100)
            )
        `);

        console.log("Users table created");


        // 2. Blood inventory table
        await db.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                blood_group VARCHAR(3) PRIMARY KEY,
                units INT NOT NULL DEFAULT 0,
                CHECK (units >= 0)
            )
        `);

        console.log("Inventory table created");


        // 3. Hospital requests table
        await db.query(`
            CREATE TABLE IF NOT EXISTS requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                hospital_id INT NOT NULL,
                blood_group VARCHAR(3) NOT NULL,
                units INT NOT NULL,
                status ENUM('pending', 'fulfilled', 'rejected')
                    DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CHECK (units > 0),
                FOREIGN KEY (hospital_id) REFERENCES users(id),
                FOREIGN KEY (blood_group) REFERENCES inventory(blood_group)
            )
        `);

        console.log("Requests table created");


        // 4. Low-stock alerts table
        await db.query(`
            CREATE TABLE IF NOT EXISTS alerts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                blood_group VARCHAR(3) NOT NULL,
                units INT NOT NULL,
                message VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (blood_group) REFERENCES inventory(blood_group)
            )
        `);

        console.log("Alerts table created");


        // Insert initial blood inventory
        await db.query(`
            INSERT IGNORE INTO inventory (blood_group, units)
            VALUES
                ('A+', 25),
                ('A-', 8),
                ('B+', 18),
                ('B-', 5),
                ('AB+', 12),
                ('AB-', 3),
                ('O+', 30),
                ('O-', 4)
        `);

        console.log("Initial blood inventory inserted");

        console.log("\nDatabase setup completed successfully!");

    } catch (error) {
        console.log(error.message);
    } finally {
        await db.end();
    }
}

setupDatabase();