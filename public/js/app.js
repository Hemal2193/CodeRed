let currentUser;

const content = document.getElementById("content");

const bloodGroups = [
    "A+", "A-", "B+", "B-",
    "AB+", "AB-", "O+", "O-"
];


// Prevent HTML injection from database values
function escapeHTML(value) {

    const div = document.createElement("div");
    div.textContent = value ?? "";

    return div.innerHTML;
}


// Common API function
async function api(url, method = "GET", body = null) {

    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (body !== null) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch("/api" + url, options);
    const data = await response.json();

    if (response.status === 401) {
        window.location.href = "/login.html";
        throw new Error("Please login");
    }

    if (!response.ok) {
        throw new Error(data.message);
    }

    return data;
}


function showMessage(message, error = false) {

    const element = document.getElementById("message");

    element.textContent = message;
    element.style.color = error ? "red" : "green";
}


function setTitle(title) {
    document.getElementById("pageTitle").textContent = title;
    showMessage("");
}


// Initialize application
async function init() {

    currentUser = await api("/auth/me");

    document.getElementById("userInfo").textContent =
        currentUser.name + " | " + currentUser.role.toUpperCase();

    document.querySelectorAll("[data-role]").forEach(button => {

        button.hidden =
            button.dataset.role !== currentUser.role;
    });

    if (currentUser.role === "staff") {
        await loadDashboard();
    } else {
        await loadInventory();
    }
}


// Blood group dropdown
function bloodOptions() {

    return bloodGroups.map(group => `
        <option value="${group}">${group}</option>
    `).join("");
}


// Dashboard
async function loadDashboard() {

    setTitle("Dashboard");

    const data = await api("/dashboard");

    content.innerHTML = `
        <div class="grid">

            <div class="card">
                <p>Total Blood Units</p>
                <h1>${Number(data.totalUnits)}</h1>
            </div>

            <div class="card">
                <p>Registered Donors</p>
                <h1>${Number(data.totalDonors)}</h1>
            </div>

            <div class="card">
                <p>Pending Requests</p>
                <h1>${Number(data.pendingRequests)}</h1>
            </div>

            <div class="card">
                <p>Fulfilled Requests</p>
                <h1>${Number(data.fulfilledRequests)}</h1>
            </div>

        </div>

        <div class="panel">
            <h3>Blood Inventory Overview</h3>
            <div id="inventoryGrid" class="grid"></div>
        </div>
    `;

    const inventory = await api("/inventory");

    document.getElementById("inventoryGrid").innerHTML =
        renderInventory(inventory);
}


// Render inventory cards
function renderInventory(inventory) {

    return inventory.map(item => `

        <div class="card blood ${item.units < 5 ? "low" : ""}">

            <h2>${escapeHTML(item.group)}</h2>

            <h1>${Number(item.units)}</h1>

            <p>${item.units < 5 ? "Low Stock" : "Available Units"}</p>

        </div>

    `).join("");
}


// Inventory page
async function loadInventory() {

    setTitle("Blood Inventory");

    const inventory = await api("/inventory");

    content.innerHTML = `
        <div class="grid">
            ${renderInventory(inventory)}
        </div>
    `;

    if (currentUser.role === "staff") {

        content.innerHTML += `

            <div class="panel">
                <h3>Add Blood Units</h3>

                <select id="bloodGroup">
                    ${bloodOptions()}
                </select>

                <input id="units" type="number"
                    min="1" placeholder="Units">

                <button onclick="addBlood()">
                    Add Blood
                </button>
            </div>
        `;
    }

    if (currentUser.role === "hospital") {

        content.innerHTML += `

            <div class="panel">
                <h3>Request Blood</h3>

                <select id="bloodGroup">
                    ${bloodOptions()}
                </select>

                <input id="units" type="number"
                    min="1" placeholder="Units">

                <button onclick="requestBlood()">
                    Submit Request
                </button>
            </div>
        `;
    }
}


// Add blood
async function addBlood() {

    try {

        const result = await api("/inventory/add", "POST", {

            blood_group: document.getElementById("bloodGroup").value,
            units: Number(document.getElementById("units").value)
        });

        await loadInventory();

        showMessage(result.message);

    } catch (error) {
        showMessage(error.message, true);
    }
}


// Request blood
async function requestBlood() {

    try {

        const result = await api("/requests", "POST", {

            blood_group: document.getElementById("bloodGroup").value,
            units: Number(document.getElementById("units").value)
        });

        await loadMyRequests();

        showMessage(result.message);

    } catch (error) {
        showMessage(error.message, true);
    }
}


// Donors page
async function loadDonors() {

    setTitle("Registered Donors");

    const donors = await api("/donors");

    content.innerHTML = `

        <div class="panel">
            <table>
                <tr>
                    <th>Name</th>
                    <th>Blood Group</th>
                    <th>City</th>
                </tr>

                ${donors.map(donor => `
                    <tr>
                        <td>${escapeHTML(donor.name)}</td>
                        <td>${escapeHTML(donor.group)}</td>
                        <td>${escapeHTML(donor.city)}</td>
                    </tr>
                `).join("")}

            </table>

            ${donors.length === 0 ? "<p>No donors registered.</p>" : ""}
        </div>
    `;
}


// Staff requests page
async function loadRequests() {

    setTitle("Blood Requests");

    const requests = await api("/requests");

    content.innerHTML = `

        <div class="panel">
            <table>
                <tr>
                    <th>Hospital</th>
                    <th>Blood Group</th>
                    <th>Units</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>

                ${requests.map(request => `
                    <tr>

                        <td>${escapeHTML(request.hospital)}</td>

                        <td>${escapeHTML(request.group)}</td>

                        <td>${Number(request.units)}</td>

                        <td class="${escapeHTML(request.status)}">
                            ${escapeHTML(request.status)}
                        </td>

                        <td>

                            ${request.status === "pending" ? `

                                <button class="approve"
                                    onclick="processRequest(${Number(request.id)}, 'fulfill')">
                                    Fulfill
                                </button>

                                <button
                                    onclick="processRequest(${Number(request.id)}, 'reject')">
                                    Reject
                                </button>

                            ` : "-"}

                        </td>

                    </tr>
                `).join("")}

            </table>

            ${requests.length === 0 ? "<p>No blood requests.</p>" : ""}
        </div>
    `;
}


// Process request
async function processRequest(id, action) {

    try {

        const result = await api(
            "/requests/" + id + "/" + action,
            "POST"
        );

        await loadRequests();

        showMessage(result.message);

    } catch (error) {
        showMessage(error.message, true);
    }
}


// Hospital requests page
async function loadMyRequests() {

    setTitle("My Requests");

    const requests = await api("/my-requests");

    content.innerHTML = `

        <div class="panel">
            <table>
                <tr>
                    <th>Request ID</th>
                    <th>Blood Group</th>
                    <th>Units</th>
                    <th>Status</th>
                </tr>

                ${requests.map(request => `
                    <tr>
                        <td>${Number(request.id)}</td>
                        <td>${escapeHTML(request.blood_group)}</td>
                        <td>${Number(request.units)}</td>
                        <td class="${escapeHTML(request.status)}">
                            ${escapeHTML(request.status)}
                        </td>
                    </tr>
                `).join("")}

            </table>

            ${requests.length === 0 ? "<p>No requests submitted.</p>" : ""}
        </div>
    `;
}


// Alerts page
async function loadAlerts() {

    setTitle("Low Stock Alerts");

    const alerts = await api("/alerts");

    content.innerHTML = `

        <div class="panel">
            <table>
                <tr>
                    <th>Blood Group</th>
                    <th>Units</th>
                    <th>Message</th>
                    <th>Date</th>
                </tr>

                ${alerts.map(alert => `
                    <tr>
                        <td>${escapeHTML(alert.blood_group)}</td>
                        <td>${Number(alert.units)}</td>
                        <td>${escapeHTML(alert.message)}</td>
                        <td>${escapeHTML(new Date(alert.created_at).toLocaleString())}</td>
                    </tr>
                `).join("")}

            </table>

            ${alerts.length === 0 ? "<p>No alerts generated yet.</p>" : ""}
        </div>
    `;
}


// Profile page
function loadProfile() {

    setTitle("My Profile");

    content.innerHTML = `

        <div class="panel">

            <p><b>Name:</b> ${escapeHTML(currentUser.name)}</p>

            <p><b>Email:</b> ${escapeHTML(currentUser.email)}</p>

            <p><b>Role:</b> ${escapeHTML(currentUser.role)}</p>

            <p><b>City:</b> ${escapeHTML(currentUser.city || "-")}</p>

            <p><b>Blood Group:</b> ${escapeHTML(currentUser.blood_group || "-")}</p>

        </div>
    `;
}


// Logout
async function logout() {

    await api("/auth/logout", "POST");

    window.location.href = "/login.html";
}


// Handle unexpected API errors
window.addEventListener("unhandledrejection", event => {

    showMessage(event.reason?.message || "Something went wrong", true);

    event.preventDefault();
});


init();