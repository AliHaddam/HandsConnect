// Check if the user has a valid token
const token = localStorage.getItem("authToken");

if (!token) {
    alert("You must be logged in to access this page.");
    window.location.href = "login.html";
} else {
    try {
        // Decode the JWT token
        const payload = JSON.parse(atob(token.split(".")[1]));

        // Check if the token has expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (payload.exp < currentTime) {
            alert("Session expired. Please log in again.");
            localStorage.removeItem("authToken");
            window.location.href = "login.html";
        } else {
            document.addEventListener("DOMContentLoaded", function () {
                const userEmail = document.getElementById("userEmail");
                if (userEmail) {
                    userEmail.textContent = payload.email;
                }
            });
        }
    } catch (error) {
        console.error("Error decoding token:", error);
        alert("Invalid session. Please log in again.");
        localStorage.removeItem("authToken");
        window.location.href = "login.html";
    }
}

function logout() {
    localStorage.removeItem("authToken");
    alert("You have been logged out.");
    window.location.href = "login.html";
}

// Fetch and display opportunities
function loadOpportunities() {
    fetch("http://localhost:3000/api/opportunities")
        .then(response => response.json())
        .then(data => {
            const list = document.getElementById("opportunitiesList");
            list.innerHTML = "";

            if (data.length === 0) {
                list.innerHTML = "<li class='list-group-item'>No opportunities available.</li>";
            } else {
                data.forEach(opportunity => {
                    const listItem = document.createElement("li");
                    listItem.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center");

                    // Opportunity details
                    listItem.innerHTML = `
                        <span>${opportunity.title} - ${new Date(opportunity.date).toDateString()} - ${opportunity.location}</span>
                        <button class="btn btn-danger btn-sm" onclick="deleteOpportunity(${opportunity.id})">Delete</button>
                    `;

                    list.appendChild(listItem);
                });
            }
        })
        .catch(error => {
            console.error("Error fetching opportunities:", error);
        });
}

// Delete an opportunity
function deleteOpportunity(id) {
    if (!confirm("Are you sure you want to delete this opportunity?")) return;

    fetch(`http://localhost:3000/api/opportunities/${id}`, { method: "DELETE" })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            loadOpportunities(); // Refresh the list
        })
        .catch(error => console.error("Error deleting opportunity:", error));
}

// Upload file
function uploadFile() {
    const fileInput = document.getElementById("fileInput");
    if (!fileInput.files.length) {
        alert("Please select a file to upload.");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        document.getElementById("uploadStatus").innerText = `File uploaded: ${data.filename}`;
        fileInput.value = "";
        fetchFiles();
    })
    .catch(error => console.error("Error uploading file:", error));
}

// Fetch and display uploaded files
function fetchFiles() {
    fetch("http://localhost:3000/api/files")
        .then(response => response.json())
        .then(files => {
            const fileList = document.getElementById("fileList");
            fileList.innerHTML = "";

            if (files.length === 0) {
                fileList.innerHTML = "<li class='list-group-item'>No uploaded files.</li>";
                return;
            }

            files.forEach(file => {
                const listItem = document.createElement("li");
                listItem.className = "list-group-item d-flex justify-content-between align-items-center";
                listItem.innerHTML = `
                    <a href="http://localhost:3000/uploads/${file}" target="_blank">${file}</a>
                    <button class="btn btn-danger btn-sm" onclick="deleteFile('${file}')">Delete</button>
                `;
                fileList.appendChild(listItem);
            });
        })
        .catch(error => console.error("Error fetching files:", error));
}

// Delete a file
function deleteFile(filename) {
    if (!confirm("Are you sure you want to delete this file?")) return;

    fetch(`http://localhost:3000/api/files/${filename}`, { method: "DELETE" })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            fetchFiles();
        })
        .catch(error => console.error("Error deleting file:", error));
}

// Function to handle preview
function showPreview() {
    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const date = document.getElementById("date").value;
    const location = document.getElementById("location").value;

    if (!title || !description || !date || !location) {
        alert("Please fill in all fields before previewing.");
        return;
    }

    localStorage.setItem("opportunityPreview", JSON.stringify({ title, description, date, location }));

    window.location.href = "preview.html";
}

// Load data when the page loads
document.addEventListener("DOMContentLoaded", () => {
    loadOpportunities();
    fetchFiles();
});
