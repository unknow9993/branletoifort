let currentUser = null;
let userData = {};

// États Système
let chronoInterval = null;
let chronoSeconds = 0;
let isChronoRunning = false;

// Base de Données Statique Locale (Boutique, Défis, Thèmes et Succès d'origine)
const SHOP_BADGES = [
    { id: "b_gold", name: "Médaille d'Or", emoji: "🥇", cost: 50 },
    { id: "b_fire", name: "En Feu", emoji: "🔥", cost: 150 },
    { id: "b_diamond", name: "Diamant Brut", emoji: "💎", cost: 500 },
    { id: "b_sigma", name: "Sigma Wolf", emoji: "🐺", cost: 1000 },
    { id: "b_god", name: "Divinité Absolue", emoji: "🌌", cost: 5000 }
];

const SHOP_THEMES = [
    { id: "t_orange", name: "Ambre Crépusculaire (Défaut)", gradient: "radial-gradient(circle at 50% 30%, #301500 0%, #0d0500 50%, #000000 100%)", cost: 0 },
    { id: "t_neon", name: "Cyberpunk Néon", gradient: "radial-gradient(circle at 50% 30%, #001f3f 0%, #000f1f 50%, #000000 100%)", cost: 100 },
    { id: "t_emerald", name: "Matrice Émeraude", gradient: "radial-gradient(circle at 50% 30%, #0a2f1d 0%, #03140b 50%, #000000 100%)", cost: 250 },
    { id: "t_void", name: "Le Vide Absolu", gradient: "linear-gradient(180deg, #050505 0%, #000000 100%)", cost: 600 }
];

const SHOP_AURAS = [
    { id: "au_orange", name: "Aura de Feu Orangée", class: "aura-orange", cost: 150 },
    { id: "au_purple", name: "Aura Mystique Violette", class: "aura-purple", cost: 400 },
    { id: "au_god", name: "Émanation Divine Éclatante", class: "aura-god", cost: 1200 }
];

const SYSTEM_CHALLENGES = [
    { id: "ch_1", title: "Premier pas", desc: "Atteindre 1 branlette au compteur.", targetType: "branlettes", targetVal: 1, points: 10, type: "daily" },
    { id: "ch_2", title: "Contrôle Absolu", desc: "Passer plus de 10 minutes (600s) au chrono de rétention.", targetType: "chrono", targetVal: 600, points: 40, type: "epic" },
    { id: "ch_3", title: "Grand Sage", desc: "Atteindre un capital total de 200 points.", targetType: "points", targetVal: 200, points: 100, type: "hidden" }
];

const SYSTEM_ACHIEVEMENTS = [
    { id: "ac_1", title: "Dépucelage Système", desc: "Créer un compte sur l'Édition Légendaire.", icon: "🌱" },
    { id: "ac_2", title: "Banquier du Plaisir", desc: "Posséder plus de 500 points en réserve.", icon: "🪙" },
    { id: "ac_3", title: "Zéro Absolu", desc: "Avoir au moins 5 éjaculations enregistrées.", icon: "🌊" }
];

// AUTHENTICATION MANAGEMENT
function toggleAuth(toLogin) {
    document.getElementById('login-card').style.display = toLogin ? 'block' : 'none';
    document.getElementById('register-card').style.display = toLogin ? 'none' : 'block';
}

function handleRegister(event) {
    event.preventDefault();
    const user = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-password').value;
    if(!user || !pass) return;

    if(localStorage.getItem('user_' + user) || user.toLowerCase() === 'admin') {
        alert("Ce pseudonyme est déjà pris ou interdit.");
        return;
    }

    const defaultStructure = {
        username: user, password: pass, points: 20, branlettes: 0, ejaculations: 0,
        unlockedBadges: [], equippedBadges: [], unlockedThemes: ["t_orange"], equippedTheme: "t_orange",
        equippedAura: "", customBgUrl: "", avatarImg: "", notes: "", chronoTime: 0,
        history: [{ action: "Création du profil de combat.", date: new Date().toLocaleString() }],
        claimedChallenges: [], unlockedAchievements: ["ac_1"]
    };

    localStorage.setItem('user_' + user, JSON.stringify(defaultStructure));
    pushGlobalActivity(user, "A rejoint la communauté légendaire !");
    alert("Compte créé avec succès ! Connectez-vous.");
    toggleAuth(true);
}

function handleLogin(event) {
    event.preventDefault();
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;

    // --- ACCÈS FORCE POUR LE COMPTE ADMIN AVEC LES DEUX MOTS DE PASSE COMPATIBLES ---
    if (user.toLowerCase() === 'admin' && (pass === 'admin' || pass === 'admin123')) {
        let stored = localStorage.getItem('user_admin');
        if (!stored) {
            const adminStructure = {
                username: "admin", password: "admin123", points: 9999, branlettes: 0, ejaculations: 0,
                unlockedBadges: ["👑", "🛡️"], equippedBadges: ["👑"], unlockedThemes: ["t_orange", "t_neon"], equippedTheme: "t_orange",
                equippedAura: "aura-god", customBgUrl: "", avatarImg: "", notes: "Session Admin globale.", chronoTime: 0,
                history: [{ action: "Initialisation sécurisée de l'administrateur.", date: new Date().toLocaleString() }],
                claimedChallenges: [], unlockedAchievements: ["ac_1"]
            };
            localStorage.setItem('user_admin', JSON.stringify(adminStructure));
            stored = JSON.stringify(adminStructure);
        }
        currentUser = "admin";
        userData = JSON.parse(stored);
        enterApplication();
        return;
    }

    // CONNEXION NORMALISÉE
    const stored = localStorage.getItem('user_' + user);
    if(!stored) { alert("Nom d'utilisateur introuvable."); return; }

    const data = JSON.parse(stored);
    if(data.password !== pass) { alert("Mot de passe incorrect."); return; }

    currentUser = user;
    userData = data;
    enterApplication();
}

function enterApplication() {
    validateUserArrays();
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';

    if(currentUser === 'admin') {
        document.getElementById('admin-nav-btn').style.display = 'flex';
    } else {
        document.getElementById('admin-nav-btn').style.display = 'none';
    }

    // Chargement de l'état système
    chronoSeconds = userData.chronoTime || 0;
    updateChronoDisplay();
    if(chronoSeconds > 0) toggleChrono(); // relance si nécessaire

    applyCurrentTheme();
    applyAuraClasses();
    updateDOMValues();
    
    // Charger la première page par défaut
    switchPage('profil', document.querySelector('.menu-items .menu-btn'));
}

function logout() {
    if(isChronoRunning) toggleChrono();
    saveData();
    currentUser = null;
    userData = {};
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('auth-container').style.display = 'flex';
}

function validateUserArrays() {
    if(!userData.unlockedBadges) userData.unlockedBadges = [];
    if(!userData.equippedBadges) userData.equippedBadges = [];
    if(!userData.unlockedThemes) userData.unlockedThemes = ["t_orange"];
    if(!userData.claimedChallenges) userData.claimedChallenges = [];
    if(!userData.unlockedAchievements) userData.unlockedAchievements = [];
    if(!userData.history) userData.history = [];
}

function saveData() {
    if(!currentUser) return;
    userData.chronoTime = chronoSeconds;
    userData.notes = document.getElementById('user-journal').value;
    localStorage.setItem('user_' + currentUser, JSON.stringify(userData));
}

// MANAGEMENT NAVIGATION DES PAGES
function switchPage(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));

    document.getElementById('page-' + pageId).classList.add('active');
    if(btn) btn.classList.add('active');

    document.getElementById('current-page-title').innerText = pageId.replace('-', ' ');

    // Triggers spécifiques de rechargement de données
    if(pageId === 'challenges') loadChallenges();
    if(pageId === 'boutique') loadShopData();
    if(pageId === 'comm') loadCommunityData();
    if(pageId === 'histoire') loadHistoryTimeline();
    if(pageId === 'admin-panel') loadAdminPanelData();
}

// MANAGEMENT DES COMPTEURS & ACTIONS
function updateCount(type, val) {
    if(!userData[type] && userData[type] !== 0) userData[type] = 0;
    userData[type] += val;
    if(userData[type] < 0) userData[type] = 0;

    // Gain de points symbolique pour les incrémentations
    if(val > 0) {
        userData.points += 5;
        userData.history.unshift({ action: `Incrémentation de ${type} (+1).`, date: new Date().toLocaleString() });
    }

    checkAchievementsTriggers();
    updateDOMValues();
    saveData();
}

// SCRIPT DU CHRONOMÈTRE
function toggleChrono() {
    const btn = document.getElementById('chrono-btn');
    const circle = document.getElementById('chrono-display');

    if(!isChronoRunning) {
        isChronoRunning = true;
        btn.innerText = "Mettre en Pause";
        btn.style.borderColor = "var(--danger)";
        circle.classList.add('running');
        chronoInterval = setInterval(() => {
            chronoSeconds++;
            updateChronoDisplay();
            if(chronoSeconds % 10 === 0) saveData(); // Sauvegarde automatique toutes les 10 secondes
        }, 1000);
    } else {
        isChronoRunning = false;
        btn.innerText = "Reprendre la Session";
        btn.style.borderColor = "var(--primary)";
        circle.classList.remove('running');
        clearInterval(chronoInterval);
        saveData();
    }
}

function resetChrono() {
    if(confirm("Voulez-vous réinitialiser votre temps de rétention à zéro ?")) {
        chronoSeconds = 0;
        updateChronoDisplay();
        if(isChronoRunning) toggleChrono();
        userData.history.unshift({ action: "Réinitialisation du chronomètre de rétention.", date: new Date().toLocaleString() });
        saveData();
    }
}

function updateChronoDisplay() {
    const hrs = Math.floor(chronoSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((chronoSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (chronoSeconds % 60).toString().padStart(2, '0');
    document.getElementById('chrono-display').innerText = `${hrs}:${mins}:${secs}`;
}

// COMPILATION ET DOM UPDATE
function updateDOMValues() {
    document.getElementById('sb-username').innerText = userData.username || "";
    document.getElementById('sb-rank').innerText = (currentUser === 'admin') ? "Créateur Suprême" : "Membre Actif";
    document.getElementById('sb-pts').innerText = userData.points || 0;
    document.getElementById('sb-br').innerText = userData.branlettes || 0;
    document.getElementById('sb-ej').innerText = userData.ejaculations || 0;

    document.getElementById('p-username').innerText = userData.username || "";
    document.getElementById('p-rank').innerText = (currentUser === 'admin') ? "Créateur Suprême" : "Grade Compétiteur";
    document.getElementById('p-points').innerText = userData.points || 0;
    document.getElementById('p-branlettes').innerText = userData.branlettes || 0;
    document.getElementById('p-ejaculations').innerText = userData.ejaculations || 0;

    document.getElementById('c-br-val').innerHTML = `${userData.branlettes || 0}<span>fois</span>`;
    document.getElementById('c-ej-val').innerHTML = `${userData.ejaculations || 0}<span>fois</span>`;

    document.getElementById('user-journal').value = userData.notes || "";

    // Affichage des badges équipés dans la barre
    const bSub = document.getElementById('sb-badges');
    bSub.innerHTML = '';
    if(userData.equippedBadges) {
        userData.equippedBadges.forEach(b => {
            const s = document.createElement('span'); s.innerText = b; bSub.appendChild(s);
        });
    }

    // Gestion de la miniature d'avatar
    const avatarZone = document.getElementById('profile-avatar-zone');
    if(userData.avatarImg) {
        avatarZone.innerHTML = `<img src="${userData.avatarImg}">`;
    } else {
        avatarZone.innerHTML = `<span id="avatar-emoji-placeholder">🧙‍♂️</span>`;
    }
}

// LOGIQUE DES DEFIS & SUCCÈS
function loadChallenges() {
    const box = document.getElementById('challenges-box');
    box.innerHTML = '';

    SYSTEM_CHALLENGES.forEach(c => {
        let currentProgress = 0;
        if(c.targetType === 'branlettes') currentProgress = userData.branlettes || 0;
        if(c.targetType === 'ejaculations') currentProgress = userData.ejaculations || 0;
        if(c.targetType === 'points') currentProgress = userData.points || 0;
        if(c.targetType === 'chrono') currentProgress = chronoSeconds;

        let pct = Math.min(100, Math.floor((currentProgress / c.targetVal) * 100));
        const isClaimed = userData.claimedChallenges.includes(c.id);
        const isReady = pct >= 100 && !isClaimed;

        const card = document.createElement('div');
        card.className = "challenge-card";
        card.innerHTML = `
            <div class="challenge-info">
                <span class="challenge-tag ${c.type}">${c.type}</span>
                <div class="challenge-title">${c.title}</div>
                <div class="challenge-desc">${c.desc}</div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${pct}%"></div>
                </div>
                <span class="progress-text">${currentProgress} / ${c.targetVal} (${pct}%)</span>
                <div class="challenge-reward">🎁 +${c.points} Points Récompense</div>
            </div>
            <button class="btn-claim ${isClaimed ? 'claimed' : (isReady ? 'ready' : '')}" 
                onclick="claimChallenge('${c.id}', ${isReady})">
                ${isClaimed ? 'Réclamé' : (isReady ? 'Réclamer' : 'En cours')}
            </button>
        `;
        box.appendChild(card);
    });

    // Remplissage des Succès
    const achBox = document.getElementById('achievements-box');
    achBox.innerHTML = '';
    SYSTEM_ACHIEVEMENTS.forEach(a => {
        const isUnlocked = userData.unlockedAchievements.includes(a.id);
        const card = document.createElement('div');
        card.className = `ach-card ${isUnlocked ? 'unlocked' : ''}`;
        card.innerHTML = `
            <div class="ach-icon">${a.icon}</div>
            <div class="ach-info">
                <h4>${a.title}</h4>
                <p>${a.desc}</p>
            </div>
        `;
        achBox.appendChild(card);
    });
}

function claimChallenge(id, isReady) {
    if(!isReady) return;
    const c = SYSTEM_CHALLENGES.find(x => x.id === id);
    if(!c) return;

    userData.claimedChallenges.push(id);
    userData.points += c.points;
    userData.history.unshift({ action: `Récompense obtenue : Défi "${c.title}" (+${c.points} pts).`, date: new Date().toLocaleString() });
    
    updateDOMValues();
    loadChallenges();
    saveData();
}

function checkAchievementsTriggers() {
    if((userData.points >= 500) && !userData.unlockedAchievements.includes('ac_2')) {
        userData.unlockedAchievements.push('ac_2');
    }
    if((userData.ejaculations >= 5) && !userData.unlockedAchievements.includes('ac_3')) {
        userData.unlockedAchievements.push('ac_3');
    }
}

// LOGIQUE BOUTIQUE DE PERSONNALISATION
function loadShopData() {
    document.getElementById('shop-wallet-pts').innerText = `${userData.points || 0} Points`;

    // Grille des Badges
    const bGrid = document.getElementById('shop-badges-grid'); bGrid.innerHTML = '';
    SHOP_BADGES.forEach(b => {
        const isUnlocked = userData.unlockedBadges.includes(b.id);
        const isEquipped = userData.equippedBadges.includes(b.emoji);

        const div = document.createElement('div');
        div.className = `badge-item ${isUnlocked ? 'unlocked' : ''} ${isEquipped ? 'equipped' : ''}`;
        div.innerHTML = `
            <span class="badge-icon">${b.emoji}</span>
            <strong>${b.name}</strong>
            <div style="font-size:0.75rem; margin-top:6px; color:var(--primary);">${isUnlocked ? (isEquipped ? 'Équipé' : 'Possédé') : b.cost + ' Pts'}</div>
        `;
        div.onclick = () => buyOrEquipBadge(b);
        bGrid.appendChild(div);
    });

    // Grille des Thèmes
    const tGrid = document.getElementById('shop-themes-grid'); tGrid.innerHTML = '';
    SHOP_THEMES.forEach(t => {
        const isUnlocked = userData.unlockedThemes.includes(t.id);
        const isEquipped = userData.equippedTheme === t.id;

        const card = document.createElement('div');
        card.className = `theme-preview-card ${isEquipped ? 'equipped' : ''}`;
        card.innerHTML = `
            <div class="theme-miniature" style="background: ${t.gradient}">🎨</div>
            <div class="theme-preview-info">
                <div class="theme-preview-name">${t.name}</div>
                <button class="btn-preview-action">${isUnlocked ? (isEquipped ? 'Actif' : 'Activer') : t.cost + ' Pts'}</button>
            </div>
        `;
        card.onclick = () => buyOrEquipTheme(t);
        tGrid.appendChild(card);
    });

    // Liste des Auras
    const auList = document.getElementById('shop-auras-list'); auList.innerHTML = '';
    SHOP_AURAS.forEach(a => {
        const isUnlocked = userData.unlockedBadges.includes(a.id); // Mutualisé dans le tableau unlockedBadges
        const isEquipped = userData.equippedAura === a.class;

        const item = document.createElement('div');
        item.className = "shop-item";
        item.innerHTML = `
            <div class="shop-info">
                <span class="shop-icon">✨</span>
                <div class="shop-details">
                    <h4>${a.name}</h4>
                    <p>Déclenche une animation néon pulsante autour de votre avatar.</p>
                </div>
            </div>
            <button class="btn-buy ${isEquipped ? 'equipped' : ''}">${isUnlocked ? (isEquipped ? 'Active' : 'Équiper') : a.cost + ' Pts'}</button>
        `;
        item.onclick = () => buyOrEquipAura(a);
        auList.appendChild(item);
    });
}

function switchCustomTab(tabId, btn) {
    document.querySelectorAll('.custom-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.custom-tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('sub-panel-' + tabId).classList.add('active');
    if(btn) btn.classList.add('active');
}

function buyOrEquipBadge(b) {
    if(!userData.unlockedBadges.includes(b.id)) {
        if(userData.points < b.cost) { alert("Points insuffisants."); return; }
        userData.points -= b.cost;
        userData.unlockedBadges.push(b.id);
        userData.history.unshift({ action: `Achat du badge honorifique : ${b.name}.`, date: new Date().toLocaleString() });
    } else {
        const idx = userData.equippedBadges.indexOf(b.emoji);
        if(idx > -1) {
            userData.equippedBadges.splice(idx, 1); // Déséquiper
        } else {
            if(userData.equippedBadges.length >= 3) { alert("Maximum 3 badges simultanés !"); return; }
            userData.equippedBadges.push(b.emoji);
        }
    }
    updateDOMValues(); loadShopData(); saveData();
}

function buyOrEquipTheme(t) {
    if(!userData.unlockedThemes.includes(t.id)) {
        if(userData.points < t.cost) { alert("Points insuffisants."); return; }
        userData.points -= t.cost;
        userData.unlockedThemes.push(t.id);
    }
    userData.equippedTheme = t.id;
    applyCurrentTheme(); updateDOMValues(); loadShopData(); saveData();
}

function buyOrEquipAura(a) {
    if(!userData.unlockedBadges.includes(a.id)) {
        if(userData.points < a.cost) { alert("Points insuffisants."); return; }
        userData.points -= a.cost;
        userData.unlockedBadges.push(a.id);
    }
    userData.equippedAura = (userData.equippedAura === a.class) ? "" : a.class; // Toggle équipe
    applyAuraClasses(); updateDOMValues(); loadShopData(); saveData();
}

function applyCurrentTheme() {
    const currentThemeId = userData.equippedTheme || "t_orange";
    const found = SHOP_THEMES.find(x => x.id === currentThemeId);
    if(found) {
        document.body.style.background = found.gradient;
        document.body.style.backgroundAttachment = "fixed";
        document.body.style.backgroundSize = "cover";
    }
    if(userData.customBgUrl) {
        document.body.style.background = `url(${userData.customBgUrl}) no-repeat center center fixed`;
        document.body.style.backgroundSize = "cover";
    }
}

function applyAuraClasses() {
    const av = document.getElementById('profile-avatar-zone');
    if(!av) return;
    av.className = "avatar-main"; // reset
    if(userData.equippedAura) {
        av.classList.add('has-aura', userData.equippedAura);
    }
}

// LOGIQUE DES SUPPORTS MULTIMÉDIAS (AVATAR & BG CUSTOM)
function triggerAvatarUpload() { document.getElementById('avatar-file-input').click(); }
function handleAvatarUpload(e) {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        userData.avatarImg = evt.target.result;
        updateDOMValues(); saveData();
    };
    reader.readAsDataURL(file);
}

function triggerCustomBgUpload() { document.getElementById('bg-file-input').click(); }
function handleCustomBgUpload(e) {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        userData.customBgUrl = evt.target.result;
        applyCurrentTheme(); saveData();
    };
    reader.readAsDataURL(file);
}

// LOGIQUE COMMUNAUTÉ & INTERACTION
function switchLeaderboard(showLeaderboard) {
    document.getElementById('btn-tab-leaderboard').classList.toggle('active', showLeaderboard);
    document.getElementById('btn-tab-profiles').classList.toggle('active', !showLeaderboard);
    document.getElementById('comm-leaderboard-panel').style.display = showLeaderboard ? 'block' : 'none';
    document.getElementById('comm-profiles-panel').style.display = showLeaderboard ? 'none' : 'block';
}

function getAllLocalUsers() {
    let list = [];
    for(let i=0; i<localStorage.length; i++) {
        const key = localStorage.key(i);
        if(key.startsWith('user_')) {
            try {
                list.push(JSON.parse(localStorage.getItem(key)));
            } catch(e){}
        }
    }
    return list;
}

function loadCommunityData() {
    const users = getAllLocalUsers();

    // Remplissage Classement Trié par Points des utilisateurs
    const tbody = document.getElementById('leaderboard-tbody'); tbody.innerHTML = '';
    users.sort((a,b) => (b.points || 0) - (a.points || 0));

    users.forEach((u, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${index+1}</strong></td>
            <td><span style="cursor:pointer; text-decoration:underline; color:var(--primary);" onclick="openUserProfileModal('${u.username}')">${u.username}</span></td>
            <td>${u.username === 'admin' ? 'Créateur Suprême' : 'Compétiteur'}</td>
            <td>${u.branlettes || 0}</td>
            <td>${u.ejaculations || 0}</td>
            <td><strong style="color:var(--primary);">${u.points || 0} Pts</strong></td>
        `;
        tbody.appendChild(tr);
    });

    // Remplissage Vue Découverte des profils
    const grid = document.getElementById('profiles-discover-box'); grid.innerHTML = '';
    users.forEach(u => {
        const card = document.createElement('div');
        card.className = "discover-card";
        card.innerHTML = `
            <div style="font-size:2.5rem; margin-bottom:10px;">${u.avatarImg ? `<img src="${u.avatarImg}" style="width:60px; height:60px; border-radius:50%; object-fit:cover;">` : '👤'}</div>
            <h4>${u.username}</h4>
            <div style="font-size:0.8rem; color:var(--primary); margin:5px 0;">${u.points || 0} Points</div>
            <p style="font-size:0.75rem; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${u.notes || 'Pas de note de session.'}</p>
        `;
        card.onclick = () => openUserProfileModal(u.username);
        grid.appendChild(card);
    });
}

function openUserProfileModal(username) {
    const targetData = JSON.parse(localStorage.getItem('user_' + username));
    if(!targetData) return;

    const area = document.getElementById('modal-content-area');
    area.innerHTML = `
        <div style="text-align:center;">
            <div style="font-size:4rem; margin-bottom:1rem;">${targetData.avatarImg ? `<img src="${targetData.avatarImg}" style="width:100px; height:100px; border-radius:50%; border:3px solid var(--primary); object-fit:cover;">` : '🧙‍♂️'}</div>
            <h2>Fiche de ${targetData.username}</h2>
            <p style="color:var(--primary); text-transform:uppercase; font-size:0.8rem; font-weight:700; margin-bottom:1.5rem;">Statut Système Distant</p>
            
            <div class="stats-row" style="margin-bottom:1.5rem;">
                <div class="stat-card" style="padding:1rem;"><div class="val" style="font-size:1.6rem;">${targetData.points || 0}</div><div class="lbl" style="font-size:0.6rem;">Points</div></div>
                <div class="stat-card" style="padding:1rem;"><div class="val" style="font-size:1.6rem;">${targetData.branlettes || 0}</div><div class="lbl" style="font-size:0.6rem;">Branlettes</div></div>
                <div class="stat-card" style="padding:1rem;"><div class="val" style="font-size:1.6rem;">${targetData.ejaculations || 0}</div><div class="lbl" style="font-size:0.6rem;">Fluides</div></div>
            </div>

            <div style="text-align:left; background:rgba(0,0,0,0.4); padding:1rem; border-radius:12px; font-size:0.9rem;">
                <strong>Pensées du jour :</strong>
                <p style="color:var(--text-muted); margin-top:6px; font-style:italic;">"${targetData.notes || 'Aucun écrit disponible dans son journal.'}"</p>
            </div>
        </div>
    `;
    document.getElementById('profile-modal').style.display = 'flex';
}

function closeModal() { document.getElementById('profile-modal').style.display = 'none'; }

// TIMELINE D'HISTORIQUE
function loadHistoryTimeline() {
    const box = document.getElementById('history-timeline-box'); box.innerHTML = '';
    if(!userData.history || userData.history.length === 0) {
        box.innerHTML = `<p style="color:var(--text-muted);">Aucune action enregistrée pour le moment.</p>`;
        return;
    }
    userData.history.forEach(h => {
        const div = document.createElement('div');
        div.className = "timeline-item";
        div.innerHTML = `
            <span>${h.action}</span>
            <span class="timeline-date">${h.date}</span>
        `;
        box.appendChild(div);
    });
}

// CORE INTERNE ET ACTIVITES GLOBALES (SIMULATION RESEAU LOCAL VIA STORAGE)
function pushGlobalActivity(user, msg) {
    let globalActs = JSON.parse(localStorage.getItem('sys_global_activities')) || [];
    globalActs.unshift({ user, msg, date: new Date().toLocaleTimeString() });
    localStorage.setItem('sys_global_activities', JSON.stringify(globalActs.slice(0, 30)));
}

// PANEL ADMINISTRATEUR DE GESTION
function loadAdminPanelData() {
    const tbody = document.getElementById('admin-tbody'); tbody.innerHTML = '';
    const allUsers = getAllLocalUsers();

    allUsers.forEach(u => {
        const tr = document.createElement('tr');
        const deleteButtonHtml = (u.username !== 'admin') ? `<button class="btn-logout" onclick="deleteUserFromAdmin('${u.username}')" style="padding:4px 8px; font-size:0.75rem;">Bannir</button>` : '';
        
        tr.innerHTML = `
            <td><strong>${u.username}</strong></td>
            <td><input type="number" class="admin-input" id="adm-pts-${u.username}" value="${u.points || 0}"></td>
            <td><input type="number" class="admin-input" id="adm-br-${u.username}" value="${u.branlettes || 0}"></td>
            <td><input type="number" class="admin-input" id="adm-ej-${u.username}" value="${u.ejaculations || 0}"></td>
            <td>
                <button class="btn-admin-save" onclick="saveUserFromAdmin('${u.username}')">Sauver</button>
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
    data.branlettes = parseInt(document.getElementById(`adm-br-${username}`).value) || 0;
    data.ejaculations = parseInt(document.getElementById(`adm-ej-${username}`).value) || 0;
    
    localStorage.setItem('user_' + username, JSON.stringify(data));
    alert('Données de ' + username + ' mises à jour à l\'instant.');
    
    if (username === currentUser) { 
        userData = data; validateUserArrays(); applyCurrentTheme(); updateDOMValues(); 
    }
}

function deleteUserFromAdmin(username) {
    if (confirm(`Bannir définitivement l'utilisateur ${username} ?`)) { 
        localStorage.removeItem('user_' + username); 
        loadAdminPanelData(); 
    }
}

// Initialisation globale au chargement
window.onload = function() {
    // Si déjà connecté (session persistante)
    if(currentUser) {
        updateDOMValues();
    } else {
        document.getElementById('main-app').style.display = 'none';
        document.getElementById('auth-container').style.display = 'flex';
    }
};
