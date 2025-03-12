
function getOpportunityId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("opportunity_id");
}

document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("authToken");
    if (!token) {
        alert("Session expired. Please log in again.");
        window.location.href = "login.html";
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        document.getElementById("email").value = payload.email; 
        document.getElementById("opportunityId").value = getOpportunityId();
    } catch (error) {
        console.error("Error decoding token:", error);
        alert("Invalid session. Please log in again.");
        localStorage.removeItem("authToken");
        window.location.href = "login.html";
    }
});
