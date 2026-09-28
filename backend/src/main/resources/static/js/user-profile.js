document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const user = await res.json();
            
            const nameEl = document.getElementById('userName');
            const emailEl = document.getElementById('userEmail');
            const avatarEl = document.getElementById('userAvatar');

            if (nameEl) nameEl.textContent = user.fullName;
            if (emailEl) emailEl.textContent = user.email;
            if (avatarEl) avatarEl.textContent = user.avatar;
        }
    } catch (error) {
        console.error("Failed to load user profile:", error);
    }
});
