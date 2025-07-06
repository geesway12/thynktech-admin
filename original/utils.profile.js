// utils.profile.js - Reusable profile update logic for admin and users
// Usage: renderProfile(root, options)
// options: { dashboardHash, getUser, updateUser, fieldLabels }

export function renderProfile(root, options) {
  const { dashboardHash = '#dashboard', getUser, updateUser, fieldLabels = {} } = options;
  const user = getUser();
  if (!user) {
    root.innerHTML = '<div class="alert alert-danger">No user logged in.</div>';
    return;
  }
  // Default field labels
  const labels = {
    username: fieldLabels.username || 'Username',
    fullName: fieldLabels.fullName || 'Full Name',
    contact: fieldLabels.contact || 'Contact',
    currentPassword: fieldLabels.currentPassword || 'Current Password',
    newPassword: fieldLabels.newPassword || 'New Password',
  };
  root.innerHTML = `
    <div class="container my-4">
      <div class="card shadow mx-auto" style="max-width:400px;">
        <div class="card-body">
          <h4 class="mb-3"><i class="bi bi-person-circle"></i> Update Profile</h4>
          <form id="profileForm" autocomplete="off">
            <div class="mb-3">
              <label class="form-label">${labels.username}</label>
              <input class="form-control" value="${user.username}" readonly>
            </div>
            <div class="mb-3">
              <label class="form-label">${labels.fullName}</label>
              <input class="form-control" id="fullName" value="${user.fullName || user.name || ''}" placeholder="${labels.fullName}" required>
            </div>
            <div class="mb-3">
              <label class="form-label">${labels.contact}</label>
              <input class="form-control" id="contact" value="${user.contact || user.phone || ''}" placeholder="${labels.contact}">
            </div>
            <hr>
            <h6>Change Password</h6>
            <div class="mb-2">
              <label class="form-label">${labels.currentPassword}</label>
              <input type="password" class="form-control" id="currentPassword" autocomplete="current-password">
            </div>
            <div class="mb-2">
              <label class="form-label">${labels.newPassword}</label>
              <input type="password" class="form-control" id="newPassword" autocomplete="new-password">
            </div>
            <div class="d-flex justify-content-between mt-3">
              <button class="btn btn-primary">Save Changes</button>
              <a href="${dashboardHash}" class="btn btn-secondary">Cancel</a>
            </div>
            <div id="profileMsg" class="mt-2 small"></div>
          </form>
        </div>
      </div>
    </div>
  `;
  document.getElementById('profileForm').onsubmit = function(e) {
    e.preventDefault();
    const fullName = this.fullName.value.trim();
    const contact = this.contact.value.trim();
    const currentPassword = this.currentPassword.value;
    const newPassword = this.newPassword.value;
    let msg = '';
    // Update profile fields
    if ('fullName' in user) user.fullName = fullName;
    if ('name' in user) user.name = fullName;
    if ('contact' in user) user.contact = contact;
    if ('phone' in user) user.phone = contact;
    // Password change logic
    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        msg = 'Both current and new password are required to change password.';
        this.querySelector('#profileMsg').textContent = msg;
        this.querySelector('#profileMsg').className = 'text-danger mt-2 small';
        return;
      }
      if (user.password !== currentPassword) {
        msg = 'Current password is incorrect.';
        this.querySelector('#profileMsg').textContent = msg;
        this.querySelector('#profileMsg').className = 'text-danger mt-2 small';
        return;
      }
      user.password = newPassword;
      user.lastPasswordChange = Date.now();
      msg = 'Password updated! ';
    }
    updateUser(user);
    this.querySelector('#profileMsg').textContent = msg + 'Profile updated!';
    this.querySelector('#profileMsg').className = 'text-success mt-2 small';
    setTimeout(() => {
      window.location.hash = dashboardHash;
    }, 1200);
  };
}

export function isPasswordExpired(user) {
  if (!user) return false;
  const last = user.lastPasswordChange || 0;
  return (Date.now() - last) / 86400000 > 30;
}
