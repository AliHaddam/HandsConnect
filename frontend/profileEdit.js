document.addEventListener("DOMContentLoaded", async function () {
    const token = localStorage.getItem('token');
    const user_id = localStorage.getItem('user_id');

    // Validate token FIRST
    if (!token || !user_id) {
        alert('Please login first!');
        window.location.href = '/login.html';
        return;
    }

    const editButton = document.getElementById("edit-btn");
    const nameField = document.getElementById("name");
    const emailField = document.getElementById("email");
    const phoneField = document.getElementById("phone");
    const skillsList = document.getElementById("skills");
    const experiencesList = document.getElementById("experiences");
    const uploadPhotoInput = document.getElementById("upload-photo");
    const profilePicture = document.getElementById("profile-picture");
    const profileLink = document.getElementById("profile-link");
if (profileLink) {
    profileLink.href = `profile.html?user_id=${user_id}`;
}


    async function fetchProfile() {
        try {
            const response = await fetch("http://localhost:3000/api/profile", {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            console.log("Profile data received:", data); // Debugging line
    
            nameField.textContent = data.name;
            emailField.textContent = data.email;
            phoneField.textContent = data.phone || 'Not provided';
            profilePicture.src = data.imageUrl || "default.jpg";
    
            skillsList.innerHTML = data.skills.length > 0 ? 
                data.skills.map(skill => `<li class="list-group-item">${skill}</li>`).join("") :
                '<li class="list-group-item text-muted">No skills listed</li>';
    
            experiencesList.innerHTML = data.experiences.length > 0 ? 
                data.experiences.map(exp => `<li class="list-group-item">${exp}</li>`).join("") :
                '<li class="list-group-item text-muted">No experiences listed</li>';
    
        } catch (error) {
            console.error('Profile fetch error:', error);
            alert('Failed to load profile. Please try again later.');
        }
    }
    

    uploadPhotoInput.addEventListener("change", async function () {
        const file = uploadPhotoInput.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        const formData = new FormData();
        formData.append("profilePicture", file);

        try {
            const response = await fetch("http://localhost:3000/api/upload-profile-picture", {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Upload failed');
            }

            profilePicture.src = data.imageUrl;
            uploadPhotoInput.value = ''; // Clear input
            alert('Profile picture updated successfully!');

        } catch (error) {
            console.error('Upload error:', error);
            alert(error.message || 'Failed to upload photo');
        }
    });

    editButton.addEventListener("click", async function () {
        // Get current values
        const currentName = nameField.textContent;
        const currentEmail = emailField.textContent;
        const currentPhone = phoneField.textContent;
        const currentSkills = Array.from(skillsList.children)
            .map(li => li.textContent).join(', ');
        const currentExperiences = Array.from(experiencesList.children)
            .map(li => li.textContent).join(', ');

        // Get new values using prompts
        const newName = prompt("Enter your name:", currentName) || currentName;
        const newEmail = prompt("Enter your email:", currentEmail) || currentEmail;
        const newPhone = prompt("Enter your phone number:", currentPhone) || currentPhone;
        const newSkills = prompt("Enter your skills (comma-separated):", currentSkills) || '';
        const newExperiences = prompt("Enter your past experiences (comma-separated):", currentExperiences) || '';

        // Validate email format
        if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
            alert('Please enter a valid email address');
            return;
        }

        const updatedProfile = {
            name: newName,
            email: newEmail,
            phone: newPhone,
            skills: newSkills.split(',').map(s => s.trim()).filter(s => s),
            experiences: newExperiences.split(',').map(e => e.trim()).filter(e => e)
        };

        try {
            const response = await fetch("http://localhost:3000/api/update-profile", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedProfile)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Update failed');
            }

            await fetchProfile();
            alert('Profile updated successfully!');

        } catch (error) {
            console.error('Update error:', error);
            alert(error.message || 'Failed to update profile');
        }
    });

    // Initial profile load
    await fetchProfile();
});