import { db, saveDb } from './db.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div class="container my-5">
      <div class="row justify-content-center">
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card shadow">
            <div class="card-header bg-primary text-white">
              <h2 class="mb-0"><i class="bi bi-person-lock"></i> Thynktech Login</h2>
            </div>
            <div class="card-body">
              <form id="loginForm" autocomplete="off">
                <div class="mb-3">
                  <input type="text" class="form-control" id="username" placeholder="Username" required autofocus>
                </div>
                <div class="mb-3">
                  <input type="password" class="form-control" id="password" placeholder="Password" required>
                </div>
                <button type="submit" class="btn btn-primary w-100"><i class="bi bi-box-arrow-in-right"></i> Login</button>
              </form>
              <div id="loginError" class="alert alert-danger mt-3 d-none"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('loginForm').onsubmit = function(e) {
    e.preventDefault();
    const username = this.username.value.trim();
    const password = this.password.value;
    const user = db.users.find(u => u.username === username && u.password === password);
    if (user) {
      db.currentUser = user;
      saveDb();
      if (user.role && user.role.toLowerCase() === "admin") {
        window.location.hash = "#admin-dashboard";
      } else {
        window.location.hash = "#user-dashboard";
      }
    } else {
      const err = document.getElementById("loginError");
      err.textContent = "Invalid username or password!";
      err.classList.remove("d-none");
    }
  }
}
