// Tab Switching
const tabs = document.querySelectorAll('.auth-tab');
const forms = document.querySelectorAll('.auth-form');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // Remove active class from all tabs and forms
        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(f => f.classList.remove('active'));

        // Add active class to clicked tab
        tab.classList.add('active');

        // Show corresponding form
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

// Login Form Submission
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;

    // Store login state (for demo purposes)
    if (rememberMe) {
        localStorage.setItem('projexUser', JSON.stringify({ email }));
    }

    // Show success notification
    showNotification('Login successful! Redirecting...', 'success');

    // Redirect to dashboard after 1 second
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
});

// Register Form Submission
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    const acceptTerms = document.getElementById('accept-terms').checked;

    // Validate passwords match
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    // Validate terms accepted
    if (!acceptTerms) {
        showNotification('Please accept the Terms & Conditions', 'error');
        return;
    }

    // Validate password strength
    if (password.length < 8) {
        showNotification('Password must be at least 8 characters', 'error');
        return;
    }

    // Store user data (for demo purposes)
    localStorage.setItem('projexUser', JSON.stringify({ name, email }));

    // Show success notification
    showNotification('Account created! Redirecting...', 'success');

    // Redirect to dashboard after 1 second
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
});

// Social Login Buttons
document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const provider = btn.classList.contains('google') ? 'Google' :
                        btn.classList.contains('github') ? 'GitHub' : 'Apple';

        showNotification(`${provider} login coming soon!`, 'info');
    });
});

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 30px;
        right: 30px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#22C55E' : type === 'error' ? '#EF4444' : '#3B82F6'};
        color: white;
        border-radius: 12px;
        font-weight: 600;
        font-size: 15px;
        z-index: 10000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: slideInFromRight 0.4s ease-out;
        font-family: 'Poppins', sans-serif;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInFromRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutToRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
        notification.style.animation = 'slideOutToRight 0.4s ease-out';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

// Input Focus Effects
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', () => {
        input.parentElement.classList.add('focused');
    });

    input.addEventListener('blur', () => {
        input.parentElement.classList.remove('focused');
    });
});

// Add smooth hover effects to feature items
const featureItems = document.querySelectorAll('.feature-item');
featureItems.forEach((item, index) => {
    item.style.animationDelay = `${index * 0.1}s`;
});

// Password strength indicator
const registerPassword = document.getElementById('register-password');
if (registerPassword) {
    registerPassword.addEventListener('input', (e) => {
        const password = e.target.value;
        const strength = calculatePasswordStrength(password);

        // You can add a visual indicator here if desired
        if (password.length > 0) {
            let color = strength < 40 ? '#EF4444' : strength < 70 ? '#F59E0B' : '#22C55E';
            registerPassword.style.borderColor = color;
        } else {
            registerPassword.style.borderColor = '#E5E7EB';
        }
    });
}

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

// Check if user is already logged in
const user = localStorage.getItem('projexUser');
if (user && window.location.pathname.includes('intro.html')) {
    const userData = JSON.parse(user);
    showNotification(`Welcome back, ${userData.name || 'User'}!`, 'info');
}

// Add entrance animations on load
window.addEventListener('load', () => {
    document.querySelector('.hero-section').style.opacity = '1';
    document.querySelector('.auth-section').style.opacity = '1';
});
