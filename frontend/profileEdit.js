document.addEventListener("DOMContentLoaded", async function () {
    const token = localStorage.getItem('token');
    const user_id = localStorage.getItem('user_id');

    console.log("Stored Token:", token);
    console.log("Token Expiration:", token ? JSON.parse(atob(token.split('.')[1])).exp : "No token");

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
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Handle empty response
        if (response.status === 204) { // No Content
            throw new Error('Profile data not available');
        }

        const responseText = await response.text();
        
        // Handle empty response body
        if (!responseText) {
            throw new Error('Empty response from server');
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse response:', responseText);
            throw new Error('Invalid server response format');
        }

        console.log("Profile data:", data);

        // Update DOM elements...
        nameField.textContent = data.name || 'Not provided';
        emailField.textContent = data.email || 'Not provided';
        phoneField.textContent = data.phone || 'Not provided';
        profilePicture.src = data.imageUrl;
    
            skillsList.innerHTML = data.skills.length > 0 ? 
                data.skills.map(skill => `<li class="list-group-item">${skill}</li>`).join("") :
                '<li class="list-group-item text-muted">No skills listed</li>';
    
            experiencesList.innerHTML = data.experiences.length > 0 ? 
                data.experiences.map(exp => `<li class="list-group-item">${exp}</li>`).join("") :
                '<li class="list-group-item text-muted">No experiences listed</li>';
    
        } catch (error) {
            console.error('Profile fetch error:', error);
            alert(error.message);
            // Optional: Redirect to login on authentication errors
            if (error.message.includes('Unauthorized')) {
                window.location.href = '/login.html';
            }
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

    if (token) {
        const tokenExp = JSON.parse(atob(token.split('.')[1])?.exp);
        if (tokenExp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          window.location.href = '/login.html';
          return;
        }
      }
    // Initial profile load
    await fetchProfile();
});