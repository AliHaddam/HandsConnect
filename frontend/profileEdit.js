 document.addEventListener("DOMContentLoaded", async function () {
    const editButton = document.getElementById("edit-btn");
    const nameField = document.getElementById("name");
    const emailField = document.getElementById("email");
    const phoneField = document.getElementById("phone");
    const skillsList = document.getElementById("skills");
    const experiencesList = document.getElementById("experiences");
    const uploadPhotoInput = document.getElementById("upload-photo");
    const profilePicture = document.getElementById("profile-picture");

    async function fetchProfile() {
        const response = await fetch("http://localhost:5000/profile");
        const data = await response.json();
        
        nameField.textContent = data.name;
        emailField.textContent = data.email;
        phoneField.textContent = data.phone;
        profilePicture.src = data.imageUrl || "default.jpg";

        skillsList.innerHTML = data.skills.map(skill => `<li class="list-group-item">${skill}</li>`).join("");
        experiencesList.innerHTML = data.experiences.map(exp => `<li class="list-group-item">${exp}</li>`).join("");
    }

    uploadPhotoInput.addEventListener("change", function () {
        const file = uploadPhotoInput.files[0];
        if (file) {
            const formData = new FormData();
            formData.append("profilePicture", file);

            fetch("http://localhost:5000/upload-profile-picture", {
                method: "POST",
                body: formData,
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    profilePicture.src = data.imageUrl;
                }
            });
        }
    });

    editButton.addEventListener("click", async function () {
        const newName = prompt("Enter your name:", nameField.textContent);
        const newEmail = prompt("Enter your email:", emailField.textContent);
        const newPhone = prompt("Enter your phone number:", phoneField.textContent);
        const newSkills = prompt("Enter your skills (comma-separated):", "");
        const newExperiences = prompt("Enter your past experiences (comma-separated):", "");

        const updatedProfile = {
            name: newName,
            email: newEmail,
            phone: newPhone,
            skills: newSkills.split(",").map(skill => skill.trim()),
            experiences: newExperiences.split(",").map(exp => exp.trim())
        };

        await fetch("http://localhost:5000/update-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedProfile)
        });

        fetchProfile();
    });

    fetchProfile();
});  