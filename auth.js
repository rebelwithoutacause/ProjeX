// Authentication Manager
class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        // Always show landing page on refresh/page load
        this.showLandingPage();
        this.attachEventListeners();
    }

    showLandingPage() {
        document.getElementById('landing-page').style.display = 'block';
        document.getElementById('main-app').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('landing-page').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
    }

    attachEventListeners() {
        // Tab Switching
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                tabs.forEach(t => t.classList.remove('active'));
                forms.forEach(f => f.classList.remove('active'));

                tab.classList.add('active');

                const targetForm = document.getElementById(`${targetTab}-form`);
                if (targetForm) {
                    targetForm.classList.add('active');
                }
            });
        });

        // Switch links
        document.querySelectorAll('[data-switch]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = link.dataset.switch;
                const tab = document.querySelector(`.auth-tab[data-tab="${targetTab}"]`);
                if (tab) {
                    tab.click();
                }
            });
        });

        // Login Form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailLogin();
        });

        // Register Form
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailRegister();
        });

        // Demo Button
        document.getElementById('demo-btn').addEventListener('click', () => {
            this.handleDemoLogin();
        });
    }

    handleEmailLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        const username = email.split('@')[0];

        // Store auth state
        localStorage.setItem('projexAuth', 'true');
        localStorage.setItem('projexUser', JSON.stringify({
            email,
            provider: 'email',
            name: username
        }));

        // Check if settings exist, if not create default ones
        const existingSettings = localStorage.getItem('projexSettings');
        if (!existingSettings) {
            localStorage.setItem('projexSettings', JSON.stringify({
                username: username,
                role: 'Project Manager',
                theme: 'dark',
                notifications: true,
                sound: true
            }));
        }

        if (rememberMe) {
            localStorage.setItem('projexRemember', 'true');
        }

        this.showNotification('Login successful! Welcome back!', 'success');
        setTimeout(() => {
            this.showMainApp();
            // Update user profile display
            const settings = JSON.parse(localStorage.getItem('projexSettings'));
            this.updateUserProfile(settings.username, settings.role);
            // Reload taskManager if it exists
            if (window.taskManager) {
                window.taskManager.loadSettings();
            }
        }, 1000);
    }

    handleEmailRegister() {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;
        const acceptTerms = document.getElementById('accept-terms').checked;

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match!', 'error');
            return;
        }

        if (!acceptTerms) {
            this.showNotification('Please accept the Terms & Conditions', 'error');
            return;
        }

        if (password.length < 8) {
            this.showNotification('Password must be at least 8 characters', 'error');
            return;
        }

        // Store auth state
        localStorage.setItem('projexAuth', 'true');
        localStorage.setItem('projexUser', JSON.stringify({
            name,
            email,
            provider: 'email'
        }));

        // Set default settings
        localStorage.setItem('projexSettings', JSON.stringify({
            username: name,
            role: 'Project Manager',
            theme: 'dark',
            notifications: true,
            sound: true
        }));

        this.showNotification('Account created successfully!', 'success');
        setTimeout(() => {
            this.showMainApp();
            // Update user profile display
            this.updateUserProfile(name, 'Project Manager');
            if (window.taskManager) {
                window.taskManager.loadSettings();
            }
        }, 1000);
    }

    updateUserProfile(username, role) {
        const userNameEl = document.querySelector('.user-name');
        const userRoleEl = document.querySelector('.user-role');
        const avatarEl = document.querySelector('.avatar');

        if (userNameEl) userNameEl.textContent = username;
        if (userRoleEl) userRoleEl.textContent = role;
        if (avatarEl) avatarEl.textContent = username.charAt(0).toUpperCase();
    }

    handleDemoLogin() {
        localStorage.setItem('projexAuth', 'true');
        localStorage.setItem('projexUser', JSON.stringify({
            name: 'Guest',
            email: 'guest@projex.com',
            provider: 'guest',
            isGuest: true
        }));

        localStorage.setItem('projexSettings', JSON.stringify({
            username: 'Guest',
            role: 'Visitor',
            theme: 'dark',
            notifications: false,
            sound: true
        }));

        this.showNotification('Welcome, Guest!', 'info');
        setTimeout(() => {
            this.showMainApp();
            // Update user profile display for Guest
            this.updateUserProfile('Guest', 'Visitor');
            if (window.taskManager) {
                window.taskManager.init();
                window.taskManager.loadSettings();
                window.taskManager.applyGuestRestrictions();
            }
        }, 800);
    }

    logout() {
        localStorage.removeItem('projexAuth');
        localStorage.removeItem('projexRemember');
        this.showNotification('Logged out successfully', 'info');
        this.showLandingPage();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'notification';

        // Use retro brown theme colors for landing page notifications
        const bgColor = type === 'success'
            ? '#d4a574'  // Tan for success
            : type === 'error'
            ? '#c74440'  // Red for error
            : '#8b7355'; // Brown for info

        notification.style.cssText = `
            position: fixed;
            top: 30px;
            right: 30px;
            padding: 16px 24px;
            background: ${bgColor};
            color: #f5f5dc;
            border: 2px solid #6b5744;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            z-index: 10000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3), 4px 4px 0px rgba(0, 0, 0, 0.2);
            animation: slideInFromRight 0.4s ease-out;
            font-family: 'Courier New', monospace;
            letter-spacing: 0.5px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInFromRight {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutToRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        if (!document.querySelector('style[data-notification-styles]')) {
            style.setAttribute('data-notification-styles', 'true');
            document.head.appendChild(style);
        }

        setTimeout(() => {
            notification.style.animation = 'slideOutToRight 0.4s ease-out';
            setTimeout(() => notification.remove(), 400);
        }, 3000);
    }
}

// Initialize authentication on page load
let authManager;
window.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});

// Password strength indicator
const registerPassword = document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('register-password');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            const password = e.target.value;
            const strength = calculatePasswordStrength(password);

            if (password.length > 0) {
                let color = strength < 40 ? '#EF4444' : strength < 70 ? '#F59E0B' : '#22C55E';
                passwordInput.style.borderColor = color;
            } else {
                passwordInput.style.borderColor = '';
            }
        });
    }
});

function calculatePasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 15;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
    return strength;
}
