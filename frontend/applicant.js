function loadApplicants(ngoId) {
    fetch(`http://localhost:3000/api/applicants?ngo_id=${ngoId}`)
        .then(response => response.json())
        .then(data => {
            const list = document.getElementById("applicantsList");
            list.innerHTML = "";

            if (data.length === 0) {
                list.innerHTML = "<li class='list-group-item'>No applicants found.</li>";
                return;
            }

            data.forEach(applicant => {
                const listItem = document.createElement("li");
                listItem.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center");

                listItem.innerHTML = `
                    <span>${applicant.name} - ${applicant.email}</span>
                    <span>Status: <strong>${applicant.status}</strong></span>
                    <div>
                        <button class="btn btn-success btn-sm" onclick="updateStatus(${applicant.id}, 'Accepted')">Accept</button>
                        <button class="btn btn-danger btn-sm ms-2" onclick="updateStatus(${applicant.id}, 'Rejected')">Reject</button>
                    </div>
                `;

                list.appendChild(listItem);
            });
        })
        .catch(error => {
            console.error("Error fetching applicants:", error);
        });
}

function updateStatus(applicantId, status) {
    fetch(`http://localhost:3000/api/applicants/${applicantId}/status`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
    })
    .then(response => response.json())
    .then(data => {
        alert(`Applicant status updated to: ${status}`);
        location.reload(); // Reload to reflect changes
    })
    .catch(error => {
        console.error("Error updating status:", error);
    });
}
