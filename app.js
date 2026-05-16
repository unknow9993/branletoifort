let currentUser = null;
let userData = {};
const ADMIN_USER = "admin";

function toggleAuth(toLogin) {
    document.getElementById('login-card').style.display = toLogin ? 'block' : 'none';
    document.getElementById('register-card').style.display = toLogin ? 'none' : 'block';
}

function handleRegister(e) {
    e.preventDefault();
    const user = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-password').value;
    if(!user || !pass) return;

    if(localStorage.getItem('user_' + user) || user.toLowerCase() === 'admin') {
        alert('Ce pseudo existe déjà ou est interdit !');
        return;
    }

    const defaultData = {
        username: user, password: pass, points: 0, branlettes: 0, ejaculations: 0,
        unlockedBadges: [], equippedBadges: [], unlockedThemes: ['t_orange'], equippedTheme: 't_orange',
        customBgUrl: '', notes: [], registrationDate: new Date().toLocaleDateString()
    };
    localStorage.setItem('user_' + user, JSON.stringify(defaultData));
    alert('Inscription réussie ! Connectez-vous.');
    toggleAuth(true);
}

function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;

    // --- FORCE LOGIN POUR ADMIN AVEC LE MOT DE PASSE : admin123 ---
    if (user.toLowerCase() === 'admin' && pass === 'admin123') {
        let stored = localStorage.getItem('user_admin');
        if (!stored) {
            const adminStructure = {
                username: "admin",
                password: "admin123",
                points: 9999,
                branlettes: 0,
                ejaculations: 0,
                unlockedBadges: ["👑", "🛡️"],
                equippedBadges: ["👑"],
                unlockedThemes: ["t_orange"],
                equippedTheme: "t_orange",
                customBgUrl: "",
                notes: [],
                registrationDate: new Date().toLocaleDateString()
            };
            localStorage.setItem('user_admin', JSON.stringify(adminStructure));
            stored = JSON.stringify(adminStructure);
        }
        
        currentUser = "admin";
        userData = JSON.parse(stored);
        validateUserArrays();

        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';

        const adminBtn = document.getElementById('admin-nav-btn');
        if (adminBtn) adminBtn.style.display = 'flex';

        updateDOMValues();
        loadAdminPanelData();
        switchPage('profil', document.querySelector('.menu-items .menu-btn'));
        return;
    }

    // --- CONNEXION CLASSIQUE POUR LES AUTRES ---
    const stored = localStorage.getItem('user_' + user);
    if(!stored) { alert('Utilisateur inconnu.'); return; }

    const data = JSON.parse(stored);
    if(data.password !== pass) { alert('Mot de passe incorrect.'); return; }

    currentUser = user;
    userData = data;
    validateUserArrays();

    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';

    if(currentUser.toLowerCase() === ADMIN_USER) {
        document.getElementById('admin-nav-btn').style.display = 'flex';
    }

    updateDOMValues();
    switchPage('profil', document.querySelector('.menu-items .menu-btn'));
}

function logout() {
    saveData();
    currentUser = null;
    userData = {};
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('admin-nav-btn').style.display = 'none';
    document.getElementById('auth-container').style.display = 'flex';
}

function validateUserArrays() {
    if(!userData.unlockedBadges) userData.unlockedBadges = [];
    if(!userData.equippedBadges) userData.equippedBadges = [];
}

function saveData() {
    if(currentUser) localStorage.setItem('user_' + currentUser, JSON.stringify(userData));
}

function switchPage(pageId, btnElement) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    
    const targetPage = document.getElementById('page-' + pageId);
    if(targetPage) targetPage.classList.add('active');
    if(btnElement) btnElement.classList.add('active');
    
    document.getElementById('current-page-title').innerText = pageId.toUpperCase();
    if(pageId === 'admin') loadAdminPanelData();
}

function updateDOMValues() {
    document.getElementById('sb-username').innerText = currentUser || "Invité";
    document.getElementById('sb-rank').innerText = (currentUser === 'admin') ? "Créateur Suprême" : "Membre";
}

function loadAdminPanelData() {
    const tbody = document.getElementById('admin-tbody');
    if(!tbody) return;
    tbody.innerHTML = '';

    let usersFound = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('user_')) {
            const uName = key.replace('user_', '');
            try {
                const uData = JSON.parse(localStorage.getItem(key));
                usersFound.push({ username: uName, data: uData });
            } catch(e) {}
        }
    }

    usersFound.forEach(u => {
        const tr = document.createElement('tr');
        tr.style.height = "50px";
        tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
        
        const deleteButtonHtml = (u.username !== 'admin') ? `<button class="btn-logout" onclick="deleteUserFromAdmin('${u.username}')" style="padding: 4px 8px; font-size:0.75rem;">Bannir</button>` : '';

        tr.innerHTML = `
            <td><strong>${u.username}</strong></td>
            <td><input type="number" id="adm-pts-${u.username}" value="${u.data.points || 0}" style="width:70px; background:#000; color:#fff; border:1px solid rgba(255,159,67,0.3); padding:4px; border-radius:6px;"></td>
            <td>
                <button onclick="saveUserFromAdmin('${u.username}')" style="background:var(--success); border:none; color:#000; font-weight:700; padding:4px 8px; border-radius:6px; cursor:pointer; font-size:0.75rem;">Sauver</button>
                ${deleteButtonHtml}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function saveUserFromAdmin(username) {
    const stored = localStorage.getItem('user_' + username); if (!stored) return;
    const data = JSON.parse(stored);
    data.points = parseInt(document.getElementById(`adm-pts-${username}`).value) || 0;
    localStorage.setItem('user_' + username, JSON.stringify(data));
    alert('Données de ' + username + ' sauvegardées.');
}

function deleteUserFromAdmin(username) {
    if (confirm(`Bannir définitivement ${username} ?`)) { 
        localStorage.removeItem('user_' + username); 
        loadAdminPanelData(); 
    }
}
