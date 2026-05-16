// Configuration Initiale
        const ADMIN_USER = "zzhhr";
        let currentUser = null;
        let userData = {};
        let currentLeadType = 'points';

        // Base de Données des Éléments Cosmetiques de la Boutique
        const SHOP_ITEMS = {
            badges: [
                { id: 'b_soldat', name: 'Soldat du Poignet', icon: '🪖', cost: 10 },
                { id: 'b_fureur', name: 'Fureur Tactile', icon: '🔥', cost: 50 },
                { id: 'b_maitre', name: 'Grand Maître', icon: '👑', cost: 150 },
                { id: 'b_infini', name: 'Énergie Infinie', icon: '🌌', cost: 500 }
            ],
            themes: [
                { id: 't_orange', name: 'Friction Solaire (Orange)', icon: '☀️', cost: 0, css: 'radial-gradient(circle at 50% 30%, #4a2000 0%, #110700 45%, #000000 100%)' },
                { id: 't_cyber', name: 'Néon Cyberpunk', icon: '🌆', cost: 30, css: 'linear-gradient(135deg, #0f0c20 0%, #06040a 100%)' },
                { id: 't_abysse', name: 'Abysse Aquatique', icon: '🌊', cost: 80, css: 'radial-gradient(circle at 50% 30%, #002b3d 0%, #000b14 50%, #000000 100%)' },
                { id: 't_custom', name: 'Arrière-plan Personnalisé', icon: '🖼️', cost: 200, css: 'custom' }
            ]
        };

        // Configuration des succès passifs (Nouveauté)
        const ACHIEVEMENTS_CONFIG = [
            { id: 'ach_1', name: 'Premier Pas', desc: 'Faire monter son compteur de branlettes pour la première fois.', icon: '👶', check: u => u.branlettes > 0 },
            { id: 'ach_5', name: 'Régulier', desc: 'Atteindre 15 branlettes.', icon: '🏃', check: u => u.branlettes >= 15 },
            { id: 'ach_10', name: 'Explosif', desc: 'Atteindre 10 éjaculations.', icon: '💥', check: u => u.ejaculations >= 10 },
            { id: 'ach_god', name: 'Dieu de la Friction', desc: 'Atteindre une aura épique (50 éjaculations).', icon: '⚡', check: u => u.ejaculations >= 50 }
        ];

        // Rangs Dynamiques selon les points
        function getRank(pts) {
            if (pts >= 1000) return "🌌 Divinité Suprême";
            if (pts >= 500) return "👑 Seigneur Légendaire";
            if (pts >= 200) return "⚔️ Paladin d'Élite";
            if (pts >= 50) return "🪖 Soldat d'Arme";
            return "🌱 Novice";
        }

        // --- AUTHENTICATION ---
       function handleLogin(e) {
            e.preventDefault();
            const user = document.getElementById('login-username').value.trim();
            const pass = document.getElementById('login-password').value;

            // --- DEBUT DE LA CORRECTION : FORCE-LOGIN POUR L'ADMIN ---
            if (user.toLowerCase() === 'admin' && pass === 'admin') {
                let stored = localStorage.getItem('user_admin');
                if (!stored) {
                    // Si le compte admin n'existe pas encore dans ce navigateur, on le crée
                    const adminStructure = {
                        username: "admin",
                        password: "admin",
                        points: 999,
                        branlettes: 0,
                        ejaculations: 0,
                        unlockedBadges: ["👑", "🔥", "🛡️"],
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

                // On force l'activation du bouton admin
                const adminBtn = document.getElementById('admin-nav-btn');
                if (adminBtn) adminBtn.style.display = 'flex';

                applyCurrentTheme();
                updateDOMValues();
                switchPage('profil', document.querySelector('.menu-items .menu-btn'));
                
                // On vide les champs du formulaire
                document.getElementById('login-username').value = '';
                document.getElementById('login-password').value = '';
                return; // On stoppe la fonction ici pour l'admin
            }
            // --- FIN DE LA CORRECTION ---

            // SCRIPT DE CONNEXION NORMAL POUR LES AUTRES UTILISATEURS
            const stored = localStorage.getItem('user_' + user);
            if(!stored) { alert('Utilisateur inconnu.'); return; }

            const data = JSON.parse(stored);
            if(data.password !== pass) { alert('Mot de passe incorrect.'); return; }

            currentUser = user;
            userData = data;
            validateUserArrays();

            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';

            // Affichage du bouton admin si le pseudo correspond à la variable globale ADMIN_USER
            if(currentUser === ADMIN_USER) {
                document.getElementById('admin-nav-btn').style.display = 'flex';
            }

            applyCurrentTheme();
            updateDOMValues();
            switchPage('profil', document.querySelector('.menu-items .menu-btn'));
        }

        // --- NAVIGATION DES PAGES ---
        function switchPage(pageId, btnElement) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
            
            document.getElementById('page-' + pageId).classList.add('active');
            if(btnElement) btnElement.classList.add('active');

            // Chargement ciblé des données
            if(pageId === 'challenges') loadChallenges();
            if(pageId === 'comm') loadCommunityData();
            if(pageId === 'profil-view') loadMyProfileData();
            if(pageId === 'boutique') loadShopData();
            if(pageId === 'admin-panel') loadAdminPanelData();
        }

        function switchCustomTab(tabId, btn) {
            const container = btn.closest('.badges-section');
            container.querySelectorAll('.custom-tab-btn').forEach(b => b.classList.remove('active'));
            container.querySelectorAll('.custom-panel').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById('custom-panel-' + tabId).classList.add('active');
        }

        // --- THEMES ET ETATS VISUELS (AURA) ---
        function applyCurrentTheme() {
            const themeId = userData.equippedTheme;
            const themeObj = SHOP_ITEMS.themes.find(t => t.id === themeId);
            if(themeObj) {
                if(themeObj.css === 'custom' && userData.customBgUrl) {
                    document.body.style.background = `url('${userData.customBgUrl}')`;
                } else {
                    document.body.style.background = themeObj.css;
                }
                document.body.style.backgroundSize = "cover";
                document.body.style.backgroundAttachment = "fixed";
            }
        }

        // Gère l'application de l'aura selon le nombre d'éjaculations
        function applyAuraClasses(element) {
            if (!element) return;
            element.classList.remove('has-aura', 'has-aura-epic');
            if (userData.ejaculations >= 50) {
                element.classList.add('has-aura-epic');
            } else if (userData.ejaculations >= 20) {
                element.classList.add('has-aura');
            }
        }

        // --- UPDATE GLOBAL DU DOM INDIVIDUEL ---
        function updateDOMValues() {
            const rankStr = getRank(userData.points);
            
            // Sidebar
            document.getElementById('side-name').innerText = userData.username;
            document.getElementById('side-rank').innerText = rankStr;
            document.getElementById('side-pts').innerText = userData.points;
            document.getElementById('side-ejaculations').innerText = userData.ejaculations;

            let badgesHtml = userData.equippedBadges.map(bid => {
                let found = SHOP_ITEMS.badges.find(b => b.id === bid);
                return found ? `<span>${found.icon}</span>` : '';
            }).join('');
            document.getElementById('side-badges').innerHTML = badgesHtml;

            // Page Compteurs
            document.getElementById('val-branlettes').innerText = userData.branlettes;
            document.getElementById('val-ejaculations').innerText = userData.ejaculations;
        }

        // --- COMPTEURS ---
        function updateCount(type, val) {
            if(type === 'branlettes') {
                userData.branlettes = Math.max(0, userData.branlettes + val);
                if(val > 0) userData.points += 1; // +1 point par friction
            } else if(type === 'ejaculations') {
                userData.ejaculations = Math.max(0, userData.ejaculations + val);
                if(val > 0) {
                    userData.points += 2; // +2 points par éjaculation
                    const noteText = document.getElementById('session-note').value.trim();
                    if(noteText) {
                        userData.notes.unshift({ text: noteText, date: new Date().toLocaleTimeString() });
                        if(userData.notes.length > 5) userData.notes.pop();
                        document.getElementById('session-note').value = "";
                    }
                }
            }
            saveData();
            updateDOMValues();
        }

        // --- GESTION DU CHRONO ---
        let chronoInterval = null;
        let chronoStartTime = 0;
        let chronoElapsedTime = 0;

        function toggleChrono() {
            const btn = document.getElementById('btn-chrono-toggle');
            if(!chronoInterval) {
                chronoStartTime = Date.now() - chronoElapsedTime;
                chronoInterval = setInterval(updateChronoDisplay, 10);
                btn.innerText = "STOP";
                btn.style.background = "rgba(255, 71, 87, 0.15)";
                btn.style.borderColor = "var(--danger)";
                btn.style.color = "var(--danger)";
            } else {
                clearInterval(chronoInterval);
                chronoInterval = null;
                btn.innerText = "START";
                btn.style.background = "rgba(255, 159, 67, 0.15)";
                btn.style.borderColor = "var(--primary)";
                btn.style.color = "var(--primary)";
            }
        }

        function resetChrono() {
            clearInterval(chronoInterval);
            chronoInterval = null;
            chronoElapsedTime = 0;
            document.getElementById('chrono-display').innerText = "00:00:00.00";
            const btn = document.getElementById('btn-chrono-toggle');
            btn.innerText = "START";
            btn.style.background = "rgba(255, 159, 67, 0.15)";
            btn.style.borderColor = "var(--primary)";
            btn.style.color = "var(--primary)";
        }

        function updateChronoDisplay() {
            chronoElapsedTime = Date.now() - chronoStartTime;
            let totalCentis = Math.floor(chronoElapsedTime / 10);
            let centis = totalCentis % 100;
            let totalSecs = Math.floor(totalCentis / 100);
            let secs = totalSecs % 60;
            let totalMins = Math.floor(totalSecs / 60);
            let mins = totalMins % 60;
            let hours = Math.floor(totalMins / 60);

            document.getElementById('chrono-display').innerText = 
                (hours < 10 ? "0" + hours : hours) + ":" +
                (mins < 10 ? "0" + mins : mins) + ":" +
                (secs < 10 ? "0" + secs : secs) + "." +
                (centis < 10 ? "0" + centis : centis);
        }

        // --- ONGLETS DEFIS ---
        function loadChallenges() {
            const container = document.getElementById('challenges-container');
            const list = [
                { id: 'ch_daily', title: 'Friction du Matin', desc: 'Atteindre un total de 5 branlettes pour s\'échauffer.', target: 5, current: userData.branlettes, reward: '10 PTS', points: 10, tag: 'daily' },
                { id: 'ch_epic', title: 'Le Marathonien', desc: 'Franchir la barre symbolique des 30 éjaculations.', target: 30, current: userData.ejaculations, reward: '100 PTS', points: 100, tag: 'epic' }
            ];

            container.innerHTML = list.map(c => {
                let pct = Math.min(100, Math.floor((c.current / c.target) * 100));
                let isReady = c.current >= c.target;
                let claimKey = `claimed_${currentUser}_${c.id}`;
                let isClaimed = localStorage.getItem(claimKey) === 'true';

                let btnHtml = `<button class="btn-claim ready" onclick="claimChallenge('${c.id}', ${c.points})">Réclamer</button>`;
                if(isClaimed) btnHtml = `<button class="btn-claim claimed">Obtenu</button>`;
                else if(!isReady) btnHtml = `<button class="btn-claim">En cours</button>`;

                return `
                    <div class="challenge-card">
                        <div class="challenge-info">
                            <span class="challenge-tag ${c.tag}">${c.tag}</span>
                            <div class="challenge-title">${c.title}</div>
                            <div class="challenge-desc">${c.desc}</div>
                            <div class="progress-container">
                                <div class="progress-bar" style="width: ${pct}%"></div>
                            </div>
                            <span class="progress-text">${c.current} / ${c.target} (${pct}%)</span>
                            <div class="challenge-reward">Récompense : ${c.reward}</div>
                        </div>
                        ${btnHtml}
                    </div>
                `;
            }).join('');
        }

        function claimChallenge(id, pts) {
            localStorage.setItem(`claimed_${currentUser}_${id}`, 'true');
            userData.points += pts;
            saveData();
            updateDOMValues();
            loadChallenges();
        }

        // --- GESTION DU PROFIL INDIVIDUEL ---
        function loadMyProfileData() {
            document.getElementById('my-profile-name').innerText = userData.username;
            document.getElementById('my-profile-rank').innerText = getRank(userData.points);
            document.getElementById('prof-stat-pts').innerText = userData.points;
            document.getElementById('prof-stat-br').innerText = userData.branlettes;
            document.getElementById('prof-stat-ej').innerText = userData.ejaculations;

            const avContainer = document.getElementById('my-profile-avatar');
            applyAuraClasses(avContainer);

            // Rendu Grille Inventaire des Badges
            const bGrid = document.getElementById('badges-inventory-grid');
            bGrid.innerHTML = SHOP_ITEMS.badges.map(b => {
                const isUnlocked = userData.unlockedBadges.includes(b.id);
                const isEquipped = userData.equippedBadges.includes(b.id);
                let classes = "badge-item";
                if(isUnlocked) classes += " unlocked";
                if(isEquipped) classes += " equipped";

                return `
                    <div class="${classes}" onclick="toggleEquipBadge('${b.id}')">
                        <span class="badge-icon">${b.icon}</span>
                        <span>${b.name}</span>
                    </div>
                `;
            }).join('');

            // Rendu Grille Inventaire des Thèmes
            const tGrid = document.getElementById('themes-inventory-grid');
            tGrid.innerHTML = SHOP_ITEMS.themes.map(t => {
                const isUnlocked = userData.unlockedThemes.includes(t.id);
                const isEquipped = userData.equippedTheme === t.id;
                let cardClass = "theme-preview-card";
                if(!isUnlocked) cardClass += " locked";
                if(isEquipped) cardClass += " equipped";

                let actionBtnText = isEquipped ? "Équipé" : (isUnlocked ? "Équiper" : "Bloqué");
                let uploadBtnHtml = (t.id === 't_custom' && isUnlocked) ? `<button class="btn-upload-bg-mini" onclick="event.stopPropagation(); triggerCustomBgUpload()">Upload</button>` : '';

                return `
                    <div class="${cardClass}">
                        <div class="theme-miniature" style="background: ${t.css === 'custom' ? (userData.customBgUrl ? `url('${userData.customBgUrl}') center/cover` : '#222') : t.css}">
                            ${t.icon}
                            ${!isUnlocked ? `<span class="lock-indicator">🔒</span>` : ''}
                        </div>
                        <div class="theme-preview-info">
                            <div class="theme-preview-name">${t.name}</div>
                            ${uploadBtnHtml}
                            <button class="btn-preview-action" ${(!isUnlocked || isEquipped) ? 'disabled' : ''} onclick="equipTheme('${t.id}')">${actionBtnText}</button>
                        </div>
                    </div>
                `;
            }).join('');

            // Rendu Grille Succès Passifs
            const achGrid = document.getElementById('my-achievements-grid');
            achGrid.innerHTML = ACHIEVEMENTS_CONFIG.map(ach => {
                const isUnlocked = ach.check(userData);
                return `
                    <div class="ach-card ${isUnlocked ? 'unlocked' : ''}">
                        <div class="ach-icon">${isUnlocked ? ach.icon : '🔒'}</div>
                        <div class="ach-info">
                            <h4>${ach.name}</h4>
                            <p>${ach.desc}</p>
                        </div>
                    </div>
                `;
            }).join('');

            // Remplissage des badges du profil
            let badgesHtml = userData.equippedBadges.map(bid => {
                let found = SHOP_ITEMS.badges.find(b => b.id === bid);
                return found ? `<span>${found.icon}</span>` : '';
            }).join('');
            document.getElementById('my-profile-badges').innerHTML = badgesHtml;
        }

        function toggleEquipBadge(id) {
            if(!userData.unlockedBadges.includes(id)) return;
            const idx = userData.equippedBadges.indexOf(id);
            if(idx > -1) {
                userData.equippedBadges.splice(idx, 1);
            } else {
                if(userData.equippedBadges.length >= 3) { alert('Maximum 3 badges équipés !'); return; }
                userData.equippedBadges.push(id);
            }
            saveData();
            loadMyProfileData();
            updateDOMValues();
        }

        function equipTheme(id) {
            if(!userData.unlockedThemes.includes(id)) return;
            userData.equippedTheme = id;
            saveData();
            applyCurrentTheme();
            loadMyProfileData();
        }

        // Upload images virtuelles
        function triggerAvatarUpload() { document.getElementById('avatar-upload-input').click(); }
        function handleAvatarUpload(input) {
            if(input.files && input.files[0]) {
                alert('Avatar sauvegardé localement sur votre profil !');
                loadMyProfileData();
            }
        }
        function triggerCustomBgUpload() { document.getElementById('custom-bg-upload-input').click(); }
        function handleCustomBgUpload(input) {
            if(input.files && input.files[0]) {
                userData.customBgUrl = "https://picsum.photos/1920/1080"; // Simulé pour l'exemple
                saveData();
                applyCurrentTheme();
                loadMyProfileData();
            }
        }

        // --- BOUTIQUE ---
        function loadShopData() {
            const bList = document.getElementById('shop-badges-list');
            bList.innerHTML = SHOP_ITEMS.badges.map(b => {
                const isOwned = userData.unlockedBadges.includes(b.id);
                return `
                    <div class="shop-item">
                        <div class="shop-info">
                            <span class="shop-icon">${b.icon}</span>
                            <div class="shop-details"><h4>${b.name}</h4><p>Cosmétique Honorifique</p></div>
                        </div>
                        <div>
                            <span class="shop-cost" style="margin-right:15px;">${b.cost} PTS</span>
                            <button class="btn-buy" ${isOwned ? 'disabled' : ''} onclick="buyItem('badges', '${b.id}', ${b.cost})">${isOwned ? 'Possédé' : 'Acheter'}</button>
                        </div>
                    </div>
                `;
            }).join('');

            const tList = document.getElementById('shop-themes-list');
            tList.innerHTML = SHOP_ITEMS.themes.map(t => {
                const isOwned = userData.unlockedThemes.includes(t.id);
                return `
                    <div class="shop-item">
                        <div class="shop-info">
                            <span class="shop-icon">${t.icon}</span>
                            <div class="shop-details"><h4>${t.name}</h4><p>Fond d'écran d'application</p></div>
                        </div>
                        <div>
                            <span class="shop-cost" style="margin-right:15px;">${t.cost} PTS</span>
                            <button class="btn-buy" ${isOwned ? 'disabled' : ''} onclick="buyItem('themes', '${t.id}', ${t.cost})">${isOwned ? 'Possédé' : 'Acheter'}</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function buyItem(type, id, cost) {
            if(userData.points < cost) { alert('Points insuffisants !'); return; }
            userData.points -= cost;
            if(type === 'badges') userData.unlockedBadges.push(id);
            if(type === 'themes') userData.unlockedThemes.push(id);
            saveData();
            updateDOMValues();
            loadShopData();
        }

        // --- COMMUNAUTÉ & INTERACTION ---
        function loadCommunityData() {
            const filter = document.getElementById('user-search').value.toLowerCase();
            const gList = document.getElementById('global-user-list');

            let keys = Object.keys(localStorage).filter(k => k.startsWith('user_'));
            let allUsers = keys.map(k => JSON.parse(localStorage.getItem(k)));

            // Filtrage liste des membres
            let filteredUsers = allUsers.filter(u => u.username.toLowerCase().includes(filter));
            gList.innerHTML = filteredUsers.map(u => {
                return `
                    <div class="user-card-item">
                        <div class="user-card-info">
                            <div class="user-card-avatar">😈</div>
                            <div class="user-card-details">
                                <div class="username-click" onclick="openUserProfileMondal('${u.username}')">${u.username}</div>
                                <div class="sub">${getRank(u.points)}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Rendu Leaderboard trié
            allUsers.sort((a,b) => b[currentLeadType] - a[currentLeadType]);
            const thScore = document.getElementById('lead-th-score');
            thScore.innerText = currentLeadType === 'points' ? 'Points' : 'Éjaculations';

            const tbody = document.getElementById('leaderboard-body');
            tbody.innerHTML = allUsers.map((u, index) => {
                let rClass = index === 0 ? "top1" : (index === 1 ? "top2" : (index === 2 ? "top3" : ""));
                let val = currentLeadType === 'points' ? u.points : u.ejaculations;
                return `
                    <tr>
                        <td class="lead-rank-num ${rClass}">${index + 1}</td>
                        <td>
                            <div class="lead-user-cell">
                                <span style="font-weight:bold; cursor:pointer;" onclick="openUserProfileMondal('${u.username}')">${u.username}</span>
                            </div>
                        </td>
                        <td style="text-align: right; font-weight: bold; color: var(--primary);">${val}</td>
                    </tr>
                `;
            }).join('');
        }

        function switchLeaderboard(type) {
            currentLeadType = type;
            document.getElementById('tab-lead-pts').classList.toggle('active', type === 'points');
            document.getElementById('tab-lead-ej').classList.toggle('active', type === 'ejaculations');
            loadCommunityData();
        }

        function openUserProfileMondal(username) {
            const stored = localStorage.getItem('user_' + username);
            if(!stored) return;
            const u = JSON.parse(stored);

            document.getElementById('modal-name').innerText = u.username;
            document.getElementById('modal-rank').innerText = getRank(u.points);
            document.getElementById('modal-stat-pts').innerText = u.points;
            document.getElementById('modal-stat-br').innerText = u.branlettes || 0;
            document.getElementById('modal-stat-ej').innerText = u.ejaculations || 0;

            // Rendu succès passifs dans la modale communautaire
            const modalAchGrid = document.getElementById('modal-achievements-container');
            modalAchGrid.innerHTML = ACHIEVEMENTS_CONFIG.map(ach => {
                const isUnlocked = ach.check(u);
                return `
                    <div class="ach-card ${isUnlocked ? 'unlocked' : ''}" style="padding:0.5rem; gap:10px; margin:0;">
                        <div class="ach-icon" style="font-size:1.2rem;">${isUnlocked ? ach.icon : '🔒'}</div>
                        <div class="ach-info">
                            <h4 style="font-size:0.75rem;">${ach.name}</h4>
                        </div>
                    </div>
                `;
            }).join('');

            // Notes de session
            const logsContainer = document.getElementById('modal-logs-container');
            if(u.notes && u.notes.length > 0) {
                logsContainer.innerHTML = u.notes.map(n => `<div class="log-item"><span>[${n.date}]</span> ${n.text}</div>`).join('');
            } else {
                logsContainer.innerHTML = `<div class="log-item" style="color:var(--text-muted);">Aucune note publique rédigée.</div>`;
            }

            document.getElementById('profile-modal').classList.add('active');
        }

        function closeModal(e) {
            document.getElementById('profile-modal').classList.remove('active');
        }

        // --- MODULE PANEL ADMIN ---
        function loadAdminPanelData() {
            if(currentUser !== ADMIN_USER) return;
            const tbody = document.getElementById('admin-table-body');
            tbody.innerHTML = "";

            let keys = Object.keys(localStorage).filter(k => k.startsWith('user_'));
            keys.forEach(k => {
                const u = JSON.parse(localStorage.getItem(k));
                const tr = document.createElement('tr');
                let deleteButtonHtml = u.username !== ADMIN_USER ? `<button class="btn-admin-action" onclick="deleteUserFromAdmin('${u.username}')">Bannir</button>` : '';
                
                tr.innerHTML = `
                    <td><strong>${u.username}</strong></td>
                    <td><input type="number" class="admin-input" id="adm-pts-${u.username}" value="${u.points || 0}"></td>
                    <td><input type="number" class="admin-input" id="adm-br-${u.username}" value="${u.branlettes || 0}"></td>
                    <td><input type="number" class="admin-input" id="adm-ej-${u.username}" value="${u.data ? (u.data.ejaculations || 0) : (u.ejaculations || 0)}"></td>
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
            alert('Données mises à jour.');
            if (username === currentUser) { userData = data; validateUserArrays(); applyCurrentTheme(); updateDOMValues(); }
        }

        function deleteUserFromAdmin(username) {
            if (confirm(`Bannir définitivement ${username} ?`)) { localStorage.removeItem('user_' + username); loadAdminPanelData(); }
        }