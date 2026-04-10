let chart;
let hoursChart;
let monthsChart;
let weekdayChart;
let cmpDayChart;
let cmpMonthChart;
let cmpWeekdayChart;
let userSessionsChart;
let liveRefreshTimer;
let userSessionsCurrentPage = 1;
let userSessionsTotalPages = 1;
let userSessionsLastUsername = '';
let lastUserSessionsPayload = null;
let lastHistoryPayload = null;
let statsPrivateAccess = false;
let statsAccessOwner = '';
let statsCanAuth = false;

const HISTORY_DAY_MINUTES = 1440;
const HISTORY_COURSE_SLOTS = [
    { start: 510, end: 690, label: '08:30-11:30' },
    { start: 750, end: 930, label: '12:30-15:30' },
    { start: 930, end: 1110, label: '15:30-18:30' },
    { start: 1110, end: 1290, label: '18:30-21:30' }
];

const HISTORY_MARKERS = [
    { label: '08:30', minute: 510 },
    { label: '11:30', minute: 690 },
    { label: '12:30', minute: 750 },
    { label: '15:30', minute: 930 },
    { label: '18:30', minute: 1110 },
    { label: '21:30', minute: 1290 }
];

const SET1_PALETTE = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999'];

const COLOR_SESSIONS = SET1_PALETTE[1]; // #377eb8 bleu
const COLOR_DUREE    = SET1_PALETTE[0]; // #e41a1c rouge

/**
 * Convertit une couleur hexadécimale en rgba().
 */
function hexToRgba(hex, alpha) {
    const normalized = hex.replace('#', '');
    const value = normalized.length === 3
        ? normalized.split('').map(function (c) { return c + c; }).join('')
        : normalized;
    const num = parseInt(value, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

/**
 * Affiche un message d'erreur utilisateur dans la zone prévue à cet effet.
 * @param {string} message
 */
function setErreur(message) {
    document.getElementById('erreur').textContent = message || '';
}

/**
 * Affiche une erreur dans la section de comparaison.
 */
function setErreurComparaison(message) {
    const el = document.getElementById('erreur-comparaison');
    if (el) {
        el.textContent = message || '';
    }
}

/**
 * Affiche une erreur dans la section des sessions utilisateur.
 */
function setErreurUtilisateur(message) {
    const el = document.getElementById('erreur-utilisateur');
    if (el) {
        el.textContent = message || '';
    }
}

/**
 * Affiche une erreur dans la section d'historique poste.
 */
function setErreurHistorique(message) {
    const el = document.getElementById('erreur-historique');
    if (el) {
        el.textContent = message || '';
    }
}

/**
 * Affiche une erreur dans la section d'acces prive/public.
 */
function setErreurAccess(message) {
    const el = document.getElementById('erreur-access');
    if (el) {
        el.textContent = message || '';
    }
}

/**
 * Met a jour l'etat visuel prive/public des sections sensibles.
 */
function applyAccessMode(access) {
    statsPrivateAccess = !!(access && access.private_access);
    statsAccessOwner = access && access.owner ? String(access.owner) : '';
    statsCanAuth = !!(access && access.can_auth);

    const statusEl = document.getElementById('accessStatus');
    const hintEl = document.getElementById('accessHint');
    const inputEl = document.getElementById('apiKeyInput');
    const btnUnlock = document.getElementById('btnApiUnlock');
    const btnLock = document.getElementById('btnApiLock');
    const userSection = document.getElementById('userSection');
    const userSectionLocked = document.getElementById('userSectionLocked');
    const historyUsernameHeader = document.getElementById('historyUsernameHeader');

    if (statusEl) {
        statusEl.classList.toggle('is-private', statsPrivateAccess);
        statusEl.textContent = statsPrivateAccess
            ? ('Mode privé actif' + (statsAccessOwner ? ' (' + statsAccessOwner + ')' : ''))
            : 'Mode public (anonyme)';
    }

    if (hintEl) {
        hintEl.textContent = statsCanAuth
            ? 'En mode public, les usernames sont masques et la section "Sessions d\'un utilisateur" est indisponible.'
            : 'Mode public strict: aucune cle API configuree sur ce serveur.';
    }

    if (inputEl) {
        inputEl.disabled = !statsCanAuth || statsPrivateAccess;
        if (!statsPrivateAccess) {
            inputEl.value = '';
        }
    }

    if (btnUnlock) {
        btnUnlock.style.display = (statsCanAuth && !statsPrivateAccess) ? '' : 'none';
        btnUnlock.disabled = !statsCanAuth;
    }
    if (btnLock) {
        btnLock.style.display = statsPrivateAccess ? '' : 'none';
    }

    if (userSection && userSectionLocked) {
        userSection.style.display = statsPrivateAccess ? '' : 'none';
        userSectionLocked.style.display = statsPrivateAccess ? 'none' : '';
    }

    if (historyUsernameHeader) {
        historyUsernameHeader.textContent = statsPrivateAccess ? 'Username' : 'Username (masque)';
    }

    // Retour en mode public : rafraîchir les données sensibles déjà chargées
    if (!statsPrivateAccess) {
        if (lastHistoryPayload !== null) {
            chargerHistoriquePoste();
        }
        lastUserSessionsPayload = null;
    }
}

/**
 * Charge l'etat d'acces courant depuis l'API (public/prive).
 */
async function refreshAccessState() {
    const response = await fetch('api.php?action=access', { headers: { 'Accept': 'application/json' } });
    const data = await response.json();
    if (!response.ok || !data.ok) {
        setErreurAccess((data && data.error) ? data.error : 'Impossible de determiner le mode d\'acces.');
        applyAccessMode({ private_access: false, owner: null, can_auth: false });
        return false;
    }
    setErreurAccess('');
    applyAccessMode(data.acces || {});
    return true;
}

/**
 * Tente d'activer le mode prive avec la cle API saisie.
 */
async function unlockPrivateAccess() {
    const input = document.getElementById('apiKeyInput');
    if (!input) { return; }

    const key = String(input.value || '').trim();
    if (!key) {
        setErreurAccess('Veuillez saisir une cle API.');
        return;
    }

    const body = 'api_key=' + encodeURIComponent(key);
    const response = await fetch('api.php?action=auth', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: body
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
        setErreurAccess((data && data.error) ? data.error : 'Cle API invalide.');
        return;
    }

    setErreurAccess('');
    await refreshAccessState();
}

/**
 * Revient en mode public (suppression du cookie d'acces prive).
 */
async function lockPublicAccess() {
    const response = await fetch('api.php?action=logout', { headers: { 'Accept': 'application/json' } });
    const data = await response.json();
    if (!response.ok || !data.ok) {
        setErreurAccess((data && data.error) ? data.error : 'Impossible de revenir en mode public.');
        return;
    }

    setErreurAccess('');
    await refreshAccessState();
}

/**
 * Met à jour l'état de la pagination utilisateur.
 */
function setUserPaging(pagination) {
    const info = document.getElementById('userPagingInfo');
    const btnPrev = document.getElementById('btnUserPrev');
    const btnNext = document.getElementById('btnUserNext');
    if (!info || !btnPrev || !btnNext) { return; }

    info.textContent = 'Page ' + pagination.page + ' / ' + pagination.total_pages + ' (' + pagination.total_rows + ' résultats)';
    btnPrev.disabled = !pagination.has_prev;
    btnNext.disabled = !pagination.has_next;
}

/**
 * Remplit le tableau des sessions d'un utilisateur.
 */
function setTableUtilisateur(rows) {
    const tbody = document.getElementById('tbodyUserSessions');
    if (!tbody) { return; }

    tbody.innerHTML = '';
    rows.forEach(function (row) {
        const derived = row._derived || {};
        const tr = document.createElement('tr');
        const values = [
            row.login || '-',
            row.poste || '-',
            row.last_seen || '-',
            row.logoff || '-',
            derived.duree_min,
            row.session_ouverte ? 'Oui' : 'Non'
        ];
        values.forEach(function (v) {
            const td = document.createElement('td');
            td.textContent = (v == null || v === '') ? '-' : String(v);
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

/**
 * Remplit le tableau de l'historique d'un poste.
 */
function setTableHistorique(rows) {
    const tbody = document.getElementById('tbodyHistorySessions');
    if (!tbody) { return; }

    tbody.innerHTML = '';
    rows.forEach(function (row) {
        const derived = row._derived || {};
        const tr = document.createElement('tr');
        const displayUsername = statsPrivateAccess
            ? (row.username || '-')
            : 'Masque';
        const values = [
            displayUsername,
            row.session_type || '-',
            derived.start_label || '-',
            derived.end_label || '-',
            derived.duree_min,
            row.session_ouverte ? 'Oui' : 'Non'
        ];
        values.forEach(function (v) {
            const td = document.createElement('td');
            td.textContent = (v == null || v === '') ? '-' : String(v);
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

/**
 * Formate une minute de la journée en HH:mm.
 */
function formatMinuteOfDay(minute) {
    if (minute >= 1439) {
        return '23:59';
    }
    if (minute < 0) {
        minute = 0;
    }
    const hours = Math.floor(minute / 60);
    const mins = minute % 60;
    return String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
}

/**
 * Convertit une minute de la journée en pourcentage de largeur.
 */
function minuteToPercent(minute) {
    return (minute / HISTORY_DAY_MINUTES) * 100;
}

/**
 * Parse une date SQL (YYYY-MM-DD HH:mm:ss) en objet Date local.
 */
function parseSqlDateTime(value) {
    if (!value || typeof value !== 'string') {
        return null;
    }

    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) {
        return null;
    }

    return new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        Number(m[6] || 0)
    );
}

/**
 * Dérive les bornes et la durée d'un segment pour la journée demandée.
 */
function deriveHistorySegmentFields(segment, dateJour) {
    const dayStart = parseSqlDateTime(String(dateJour || '') + ' 00:00:00');
    if (!dayStart) {
        return null;
    }

    const dayStartMs = dayStart.getTime();
    const dayEndMs = dayStartMs + (24 * 60 * 60 * 1000);

    const loginDate = parseSqlDateTime(segment.login);
    const endDate = parseSqlDateTime(segment.logoff) || parseSqlDateTime(segment.last_seen) || new Date();

    if (!loginDate || !endDate) {
        return null;
    }

    const clipStartMs = Math.max(loginDate.getTime(), dayStartMs);
    const clipEndMs = Math.min(endDate.getTime(), dayEndMs);
    if (clipEndMs <= clipStartMs) {
        return null;
    }

    let startMinute = Math.floor((clipStartMs - dayStartMs) / 60000);
    let endMinute = Math.ceil((clipEndMs - dayStartMs) / 60000);

    if (startMinute < 0) { startMinute = 0; }
    if (endMinute > 1440) { endMinute = 1440; }
    if (endMinute <= startMinute) { endMinute = Math.min(1440, startMinute + 1); }

    return {
        start_minute: startMinute,
        end_minute: endMinute,
        start_label: formatMinuteOfDay(startMinute),
        end_label: (endMinute >= 1440) ? '23:59' : formatMinuteOfDay(endMinute),
        duree_min: Math.round(((clipEndMs - clipStartMs) / 60000) * 100) / 100
    };
}

/**
 * Enrichit les lignes d'historique poste avec les champs dérivés pour l'affichage.
 */
function enrichHistoryRows(payload) {
    const dateJour = payload && payload.parametres ? payload.parametres.date : '';
    const rows = Array.isArray(payload && payload.donnees) ? payload.donnees : [];

    return rows.map(function (row) {
        const derived = deriveHistorySegmentFields(row, dateJour);
        if (!derived) {
            return null;
        }
        return Object.assign({}, row, {
            session_type: row.session_type === 'rdp' ? 'rdp' : 'console',
            _derived: derived
        });
    }).filter(function (row) {
        return row !== null;
    });
}

/**
 * Dérive la durée d'une session utilisateur.
 */
function deriveUserSessionFields(row) {
    const loginDate = parseSqlDateTime(row.login);
    const endDate = parseSqlDateTime(row.logoff) || parseSqlDateTime(row.last_seen) || new Date();
    if (!loginDate || !endDate) {
        return null;
    }

    const deltaMs = endDate.getTime() - loginDate.getTime();
    const safeDeltaMs = deltaMs < 0 ? 0 : deltaMs;

    return {
        duree_min: Math.round((safeDeltaMs / 60000) * 100) / 100
    };
}

/**
 * Enrichit les sessions utilisateur avec les champs dérivés pour l'interface.
 */
function enrichUserSessionRows(rows) {
    return rows.map(function (row) {
        const derived = deriveUserSessionFields(row);
        return Object.assign({}, row, {
            _derived: derived || { duree_min: 0 }
        });
    });
}

/**
 * Met à jour la ligne de métadonnées de l'historique poste.
 */
function setHistoryMeta(payload) {
    const meta = document.getElementById('historyMeta');
    if (!meta) { return; }

    const resume = payload.resume || {};
    const parametres = payload.parametres || {};
    meta.textContent = [
        parametres.poste || '-',
        parametres.date || '-',
        String(resume.nb_sessions || 0) + ' session(s)',
        'Console: ' + String(resume.nb_sessions_console || 0) + ' (' + String(resume.duree_console_min || 0) + ' min)',
        'RDP: ' + String(resume.nb_sessions_rdp || 0) + ' (' + String(resume.duree_rdp_min || 0) + ' min)'
    ].join(' · ');
}

/**
 * Dessine l'axe horaire de la frise d'historique.
 */
function renderHistoryAxis() {
    const axis = document.getElementById('historyAxis');
    if (!axis) { return; }

    axis.innerHTML = '';

    const ticks = [{ label: '00:00', minute: 0 }]
        .concat(HISTORY_MARKERS)
        .concat([{ label: '23:59', minute: 1439 }]);

    ticks.forEach(function (tick) {
        const label = document.createElement('div');
        label.className = 'history-axis-tick';
        label.style.left = minuteToPercent(tick.minute) + '%';
        label.textContent = tick.label;
        axis.appendChild(label);
    });
}

/**
 * Rend la frise horaire de l'historique d'un poste.
 */
function renderHistoryTimeline(payload) {
    const timeline = document.getElementById('historyTimeline');
    const empty = document.getElementById('historyEmpty');
    if (!timeline || !empty) { return; }

    timeline.innerHTML = '';
    setHistoryMeta(payload);
    renderHistoryAxis();

    HISTORY_COURSE_SLOTS.forEach(function (slot) {
        const band = document.createElement('div');
        band.className = 'history-course-slot';
        band.style.left = minuteToPercent(slot.start) + '%';
        band.style.width = (minuteToPercent(slot.end) - minuteToPercent(slot.start)) + '%';
        band.title = 'Bloc de cours ' + slot.label;
        timeline.appendChild(band);
    });

    HISTORY_MARKERS.forEach(function (jalon) {
        const marker = document.createElement('div');
        marker.className = 'history-course-marker';
        marker.style.left = minuteToPercent(jalon.minute) + '%';
        timeline.appendChild(marker);
    });

    const segments = enrichHistoryRows(payload);
    if (!segments.length) {
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    segments.forEach(function (segment) {
        const derived = segment._derived || {};
        const left = minuteToPercent(derived.start_minute);
        const right = minuteToPercent(derived.end_minute);
        const width = Math.max(right - left, 0.35);
        const displayUsername = statsPrivateAccess
            ? (segment.username || 'Utilisateur inconnu')
            : 'Masque';
        const block = document.createElement('div');
        block.className = 'history-segment history-segment-' + segment.session_type;
        block.style.left = left + '%';
        block.style.width = width + '%';
        block.title = [
            displayUsername,
            (segment.session_type === 'rdp' ? 'RDP' : 'Console'),
            derived.start_label + ' - ' + derived.end_label,
            String(derived.duree_min) + ' min'
        ].join(' · ');

        const title = document.createElement('span');
        title.className = 'history-segment-title';
        title.textContent = statsPrivateAccess
            ? (segment.username || (segment.session_type === 'rdp' ? 'RDP' : 'Console'))
            : (segment.session_type === 'rdp' ? 'RDP' : 'Console');

        const time = document.createElement('span');
        time.className = 'history-segment-time';
        time.textContent = derived.start_label + ' - ' + derived.end_label;

        block.appendChild(title);
        block.appendChild(time);
        timeline.appendChild(block);
    });
}

/**
 * Alimente la liste déroulante des postes pour l'historique.
 */
function setHistoryPostes(postes) {
    const select = document.getElementById('historyPoste');
    if (!select) { return; }

    const currentValue = select.value;
    select.innerHTML = '';

    if (!postes.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Aucun poste disponible';
        select.appendChild(option);
        return;
    }

    postes.forEach(function (poste) {
        const option = document.createElement('option');
        option.value = poste;
        option.textContent = poste;
        select.appendChild(option);
    });

    if (currentValue && postes.indexOf(currentValue) !== -1) {
        select.value = currentValue;
    }
}

/**
 * Charge la liste des postes disponibles pour l'historique.
 */
async function chargerListePostesHistorique() {
    const response = await fetch('api.php?postes=1', { headers: { 'Accept': 'application/json' } });
    const data = await response.json();

    if (!response.ok || !data.ok) {
        setErreurHistorique((data && data.error) ? data.error : 'Erreur lors du chargement de la liste des postes.');
        return false;
    }

    setHistoryPostes(data.donnees || []);
    return (data.donnees || []).length > 0;
}

/**
 * Charge et affiche l'historique d'un poste pour une date.
 */
async function chargerHistoriquePoste() {
    const posteEl = document.getElementById('historyPoste');
    const dateEl = document.getElementById('historyDate');
    if (!posteEl || !dateEl) { return; }

    const poste = String(posteEl.value || '').trim();
    const date = String(dateEl.value || '').trim();
    if (!poste || !date) {
        setErreurHistorique('Veuillez sélectionner un poste et une date.');
        return;
    }

    setErreurHistorique('');

    const url = 'api.php?historiqueposte=1&poste=' + encodeURIComponent(poste) + '&date=' + encodeURIComponent(date);
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await response.json();

    if (!response.ok || !data.ok) {
        setErreurHistorique((data && data.error) ? data.error : 'Erreur lors du chargement de l\'historique du poste.');
        return;
    }

    lastHistoryPayload = data;
    renderHistoryTimeline(data);
    setTableHistorique(enrichHistoryRows(data));
    setJsonView('jsonHistorySessions', data);
}

/**
 * Initialise les contrôles de la section historique d'un poste.
 */
async function initialiserHistoriquePoste() {
    const loaded = await chargerListePostesHistorique();
    const posteEl = document.getElementById('historyPoste');
    const dateEl = document.getElementById('historyDate');

    if (posteEl) {
        posteEl.addEventListener('change', function () {
            chargerHistoriquePoste();
        });
    }

    if (dateEl) {
        dateEl.addEventListener('change', function () {
            chargerHistoriquePoste();
        });
    }

    if (loaded && posteEl && posteEl.value) {
        chargerHistoriquePoste();
    }
}

/**
 * Charge et affiche les sessions d'un utilisateur (avec pagination).
 */
async function chargerSessionsUtilisateur(page) {
    if (!statsPrivateAccess) {
        setErreurUtilisateur('Section disponible uniquement en mode prive.');
        return;
    }

    const input = document.getElementById('userUsername');
    if (!input) { return; }

    let username = String(input.value || '').trim().toLowerCase();
    if (!username) {
        setErreurUtilisateur('Veuillez saisir un username.');
        setTableUtilisateur([]);
        setUserPaging({ page: 1, total_pages: 1, total_rows: 0, has_prev: false, has_next: false });
        return;
    }

    if (username !== userSessionsLastUsername) {
        page = 1;
    }
    if (!page || page < 1) {
        page = 1;
    }

    setErreurUtilisateur('');

    const url = 'api.php?action=utilisateur&username=' + encodeURIComponent(username) + '&page=' + encodeURIComponent(page);
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await response.json();

    if (!response.ok || !data.ok) {
        setErreurUtilisateur((data && data.error) ? data.error : 'Erreur lors du chargement des sessions utilisateur.');
        return;
    }

    userSessionsLastUsername = username;
    userSessionsCurrentPage = (data.pagination && data.pagination.page) ? data.pagination.page : 1;
    userSessionsTotalPages = (data.pagination && data.pagination.total_pages) ? data.pagination.total_pages : 1;
    lastUserSessionsPayload = data;

    const enrichedRows = enrichUserSessionRows(data.donnees || []);

    setTableUtilisateur(enrichedRows);
    setUserSessionsChart(enrichedRows);
    setJsonView('jsonUserSessions', data);
    setUserPaging(data.pagination || { page: 1, total_pages: 1, total_rows: 0, has_prev: false, has_next: false });
}

/**
 * Met à jour les cartes de synthèse en haut de la page.
 * @param {{nb_jours:number, nb_sessions_total:number, duree_totale_heures:number, duree_moyenne_ponderee_min:number}} resume
 */
function setCards(resume) {
    document.getElementById('c_nb_jours').textContent = resume.nb_jours;
    document.getElementById('c_nb_sessions').textContent = resume.nb_sessions_total;
    document.getElementById('c_duree_totale_h').textContent = resume.duree_totale_heures;
    document.getElementById('c_duree_moy_min').textContent = resume.duree_moyenne_ponderee_min;
}

/**
 * Met à jour la section de portrait en direct.
 * @param {{resume:Object, statuts_postes_en_ligne:Object, parametres:Object}} payload
 */
function setRealtime(payload) {
    const resume = payload.resume || {};
    const donnees = payload.donnees || {};
    document.getElementById('rt_postes_en_ligne').textContent = resume.postes_en_ligne != null
        ? String(resume.postes_en_ligne) + ' / ' + String(resume.postes_total)
        : '-';
    const elHorsLigne = document.getElementById('rt_postes_hors_ligne');
    if (elHorsLigne) {
        elHorsLigne.textContent = resume.postes_hors_ligne != null
            ? String(resume.postes_hors_ligne) + ' / ' + String(resume.postes_total)
            : '-';
    }
    document.getElementById('rt_sessions_ouvertes').textContent = resume.sessions_ouvertes != null
        ? resume.sessions_ouvertes
        : '-';
    document.getElementById('rt_taux_occupation').textContent = resume.taux_occupation_postes_en_ligne != null
        ? String(resume.taux_occupation_postes_en_ligne) + ' %'
        : '-';
    document.getElementById('rt_sessions_hors_ligne').textContent = resume.sessions_ouvertes_sur_postes_hors_ligne != null
        ? resume.sessions_ouvertes_sur_postes_hors_ligne
        : '-';

    const ul = document.getElementById('rt_statuts');
    ul.innerHTML = '';
    const statuts = donnees.statuts_postes_en_ligne || payload.statuts_postes_en_ligne || {};
    const keys = Object.keys(statuts);
    if (keys.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Aucun poste en ligne.';
        ul.appendChild(li);
    } else {
        keys.forEach(function (k) {
            const li = document.createElement('li');
            li.textContent = k + ' : ' + statuts[k];
            ul.appendChild(li);
        });
    }

    const ulOff = document.getElementById('rt_statuts_hors_ligne');
    ulOff.innerHTML = '';
    const statutsOff = donnees.statuts_postes_hors_ligne || payload.statuts_postes_hors_ligne || {};
    const keysOff = Object.keys(statutsOff);
    if (keysOff.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Aucun poste hors ligne.';
        ulOff.appendChild(li);
    } else {
        keysOff.forEach(function (k) {
            const li = document.createElement('li');
            li.textContent = k + ' : ' + statutsOff[k];
            ulOff.appendChild(li);
        });
    }

    const asof = (payload.parametres && payload.parametres.asof) ? payload.parametres.asof : '';
    document.getElementById('rt_asof').textContent = asof ? ('Dernière mise à jour : ' + asof) : '';
}

/**
 * Charge les données temps réel.
 */
async function chargerTempsReel() {
    const response = await fetch('api.php?tempsreel=1', { headers: { 'Accept': 'application/json' } });
    const data = await response.json();
    if (!response.ok || !data.ok) {
        setErreur((data && data.error) ? data.error : 'Erreur lors du chargement du portrait en direct.');
        return;
    }
    setRealtime(data);
}

/**
 * Rend un tableau HTML générique à partir d'une définition de colonnes.
 */
function setRowsTable(tbodyId, rows, columns) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) { return; }

    tbody.innerHTML = '';
    rows.forEach(function (row) {
        const tr = document.createElement('tr');
        columns.forEach(function (col) {
            const td = document.createElement('td');
            const rawValue = row[col.key];
            td.textContent = col.format ? col.format(rawValue, row) : String(rawValue != null ? rawValue : '');
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

/**
 * Affiche un payload JSON formaté dans une balise <pre>.
 */
function setJsonView(preId, payload) {
    const pre = document.getElementById(preId);
    if (!pre) { return; }
    pre.textContent = JSON.stringify(payload, null, 2);
}

/**
 * Construit le graphique des durées des sessions utilisateur.
 */
function setUserSessionsChart(rows) {
    const canvas = document.getElementById('userSessionsChart');
    if (!canvas) { return; }

    const labels = rows.map(function (row) {
        const login = String(row.login || '');
        return login.length >= 16 ? login.slice(5, 16) : login;
    });

    const durees = rows.map(function (row) {
        const v = Number(row && row._derived ? row._derived.duree_min : 0);
        return isNaN(v) ? 0 : v;
    });

    if (userSessionsChart) {
        userSessionsChart.destroy();
    }

    userSessionsChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Durée (min)',
                data: durees,
                backgroundColor: hexToRgba(COLOR_SESSIONS, 0.45),
                borderColor: COLOR_SESSIONS,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        maxRotation: 70,
                        minRotation: 40,
                        autoSkip: true,
                        maxTicksLimit: 15
                    }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Minutes' }
                }
            }
        }
    });
}

/**
 * Met à jour le tableau des statistiques journalières.
 */
function setTableParJour(rows) {
    setRowsTable('tbodyStatsDay', rows, [
        { key: 'jour' },
        { key: 'nb_sessions' },
        { key: 'duree_moyenne_min' },
        { key: 'duree_totale_h' }
    ]);
}

/**
 * Met à jour le tableau des statistiques mensuelles.
 */
function setTableParMois(rows) {
    setRowsTable('tbodyStatsMonth', rows, [
        { key: 'mois' },
        { key: 'nb_sessions' },
        { key: 'duree_moyenne_min' },
        { key: 'duree_totale_h' }
    ]);
}

/**
 * Met à jour le tableau des statistiques par jour de semaine.
 */
function setTableParSemaine(rows) {
    setRowsTable('tbodyStatsWeekday', rows, [
        { key: 'jour_semaine' },
        { key: 'nb_sessions' },
        { key: 'duree_moyenne_min' },
        { key: 'duree_totale_h' }
    ]);
}

/**
 * Met à jour le tableau des statistiques horaires.
 */
function setTableParHeure(rows) {
    setRowsTable('tbodyStatsHour', rows, [
        { key: 'heure' },
        { key: 'nb_sessions' },
        { key: 'duree_moyenne_min' },
        { key: 'duree_totale_h' }
    ]);
}

/**
 * Initialise les onglets Graphique / Tableau / JSON.
 */
function initTabs() {
    const tabGroups = document.querySelectorAll('.stats-tabs');
    tabGroups.forEach(function (group) {
        const buttons = group.querySelectorAll('.tab-btn');
        const panels = group.querySelectorAll('.tab-panel');
        buttons.forEach(function (button) {
            button.addEventListener('click', function () {
                const target = button.getAttribute('data-tab');
                buttons.forEach(function (b) {
                    b.classList.toggle('is-active', b === button);
                });
                panels.forEach(function (panel) {
                    panel.classList.toggle('is-active', panel.getAttribute('data-panel') === target);
                });
            });
        });
    });
}

/**
 * Construit le graphique principal par jour.
 * On combine un histogramme (nombre de sessions) et une courbe (durée moyenne).
 * @param {Array<{jour:string, nb_sessions:number, duree_moyenne_min:number}>} rows
 */
function setChart(rows) {
    const labels = rows.map(function (r) { return r.jour; });
    const sessions = rows.map(function (r) { return r.nb_sessions; });
    const dureeMoy = rows.map(function (r) { return r.duree_moyenne_min; });

    if (chart) {
        chart.destroy();
    }

    const ctx = document.getElementById('statsChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Sessions',
                    data: sessions,
                    backgroundColor: hexToRgba(COLOR_SESSIONS, 0.45),
                    borderColor: COLOR_SESSIONS,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Durée moyenne (min)',
                    data: dureeMoy,
                    borderColor: COLOR_DUREE,
                    backgroundColor: hexToRgba(COLOR_DUREE, 0.2),
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { position: 'left', beginAtZero: true, title: { display: true, text: 'Sessions' } },
                y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Minutes' } }
            }
        }
    });
}

/**
 * Construit le graphique des sessions par heure de début.
 * Les 24 heures sont affichées, même si certaines n'ont aucune session.
 * @param {Array<{heure:string, nb_sessions:number, duree_moyenne_min:number}>} rows
 */
function setHoursChart(rows) {
    const labels = rows.map(function (r) { return r.heure; });
    const sessions = rows.map(function (r) { return r.nb_sessions; });
    const dureeMoy = rows.map(function (r) { return r.duree_moyenne_min; });

    if (hoursChart) {
        hoursChart.destroy();
    }

    const ctx = document.getElementById('hoursChart').getContext('2d');
    hoursChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Sessions',
                    data: sessions,
                    backgroundColor: hexToRgba(COLOR_SESSIONS, 0.45),
                    borderColor: COLOR_SESSIONS,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Durée moyenne (min)',
                    data: dureeMoy,
                    borderColor: COLOR_DUREE,
                    backgroundColor: hexToRgba(COLOR_DUREE, 0.2),
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { position: 'left', beginAtZero: true, title: { display: true, text: 'Sessions' } },
                y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Minutes' } }
            }
        }
    });
}

/**
 * Construit le graphique des sessions par mois.
 * @param {Array<{mois:string, nb_sessions:number, duree_moyenne_min:number}>} rows
 */
function setMonthsChart(rows) {
    const labels = rows.map(function (r) { return r.mois; });
    const sessions = rows.map(function (r) { return r.nb_sessions; });
    const dureeMoy = rows.map(function (r) { return r.duree_moyenne_min; });

    if (monthsChart) {
        monthsChart.destroy();
    }

    const ctx = document.getElementById('monthsChart').getContext('2d');
    monthsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Sessions',
                    data: sessions,
                    backgroundColor: hexToRgba(COLOR_SESSIONS, 0.45),
                    borderColor: COLOR_SESSIONS,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Durée moyenne (min)',
                    data: dureeMoy,
                    borderColor: COLOR_DUREE,
                    backgroundColor: hexToRgba(COLOR_DUREE, 0.2),
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { position: 'left', beginAtZero: true, title: { display: true, text: 'Sessions' } },
                y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Minutes' } }
            }
        }
    });
}

/**
 * Construit le graphique des sessions par jour de semaine (lundi -> dimanche).
 * @param {Array<{jour_semaine:string, nb_sessions:number, duree_moyenne_min:number}>} rows
 */
function setWeekdayChart(rows) {
    const labels = rows.map(function (r) { return r.jour_semaine; });
    const sessions = rows.map(function (r) { return r.nb_sessions; });
    const dureeMoy = rows.map(function (r) { return r.duree_moyenne_min; });

    if (weekdayChart) {
        weekdayChart.destroy();
    }

    const ctx = document.getElementById('weekdayChart').getContext('2d');
    weekdayChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Sessions',
                    data: sessions,
                    backgroundColor: hexToRgba(COLOR_SESSIONS, 0.45),
                    borderColor: COLOR_SESSIONS,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Durée moyenne (min)',
                    data: dureeMoy,
                    borderColor: COLOR_DUREE,
                    backgroundColor: hexToRgba(COLOR_DUREE, 0.2),
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { position: 'left', beginAtZero: true, title: { display: true, text: 'Sessions' } },
                y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Minutes' } }
            }
        }
    });
}

/**
 * Retourne le libellé court d'une session académique.
 */
function getSessionShortLabel(session) {
    if (session === 'H') { return 'Hiver'; }
    if (session === 'E') { return 'Été'; }
    return 'Automne';
}

/**
 * Retourne les mois de référence d'une session académique.
 */
function getMonthSlotsForSession(session) {
    if (session === 'H') {
        return [
            { num: '01', label: 'Janv' },
            { num: '02', label: 'Févr' },
            { num: '03', label: 'Mars' },
            { num: '04', label: 'Avr' }
        ];
    }
    if (session === 'E') {
        return [
            { num: '05', label: 'Mai' },
            { num: '06', label: 'Juin' },
            { num: '07', label: 'Juil' },
            { num: '08', label: 'Août' }
        ];
    }
    return [
        { num: '09', label: 'Sept' },
        { num: '10', label: 'Oct' },
        { num: '11', label: 'Nov' },
        { num: '12', label: 'Déc' }
    ];
}

/**
 * Met à jour l'état des boutons +/- des lignes de comparaison.
 */
function updateCmpYearButtons() {
    const container = document.getElementById('cmpYears');
    const rows = container.querySelectorAll('.cmp-year-row');
    rows.forEach(function (row, index) {
        const btnMinus = row.querySelector('.cmp-btn-minus');
        const btnPlus  = row.querySelector('.cmp-btn-plus');
        if (btnMinus) { btnMinus.disabled = rows.length <= 2; }
        if (btnPlus)  { btnPlus.style.display = (index === rows.length - 1 && rows.length < 5) ? '' : 'none'; }
    });
}

/**
 * Retourne la session par défaut pour la comparaison.
 */
function getDefaultComparisonSession() {
    const sessionEl = document.getElementById('session');
    const sessionValue = sessionEl ? sessionEl.value : 'H';
    if (sessionValue === 'H' || sessionValue === 'E' || sessionValue === 'A') {
        return sessionValue;
    }
    return 'H';
}

/**
 * Crée une ligne session/année dans le panneau de comparaison.
 */
function renderComparisonYearRow(sessionValue, yearValue) {
    const container = document.getElementById('cmpYears');
    if (container.querySelectorAll('.cmp-year-row').length >= 5) { return; }

    const row = document.createElement('div');
    row.className = 'cmp-year-row';

    const select = document.createElement('select');
    const options = [
        { value: 'H', label: 'Hiver (janv. – avr.)' },
        { value: 'E', label: 'Été (mai – août)' },
        { value: 'A', label: 'Automne (sept. – déc.)' }
    ];
    options.forEach(function (opt) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
    });
    select.value = (sessionValue === 'H' || sessionValue === 'E' || sessionValue === 'A') ? sessionValue : getDefaultComparisonSession();

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '2000';
    input.max = '2100';
    input.value = String(yearValue || '');

    const btnMinus = document.createElement('button');
    btnMinus.type = 'button';
    btnMinus.textContent = '–';
    btnMinus.title = 'Supprimer cette année';
    btnMinus.className = 'cmp-btn-minus';
    btnMinus.addEventListener('click', function () {
        container.removeChild(row);
        updateCmpYearButtons();
    });

    const btnPlus = document.createElement('button');
    btnPlus.type = 'button';
    btnPlus.textContent = '+';
    btnPlus.title = 'Ajouter une année';
    btnPlus.className = 'cmp-btn-plus';
    btnPlus.addEventListener('click', function () {
        renderComparisonYearRow(getDefaultComparisonSession(), new Date().getFullYear());
    });

    row.appendChild(select);
    row.appendChild(input);
    row.appendChild(btnMinus);
    row.appendChild(btnPlus);
    container.appendChild(row);

    updateCmpYearButtons();
}

/**
 * Lit et valide les paires session/année de comparaison.
 */
function getComparisonPairs() {
    const rows = document.querySelectorAll('#cmpYears .cmp-year-row');
    const pairs = [];

    rows.forEach(function (row) {
        const sessionEl = row.querySelector('select');
        const yearEl = row.querySelector('input');
        const session = sessionEl ? sessionEl.value : '';
        const year = yearEl ? parseInt(yearEl.value, 10) : NaN;
        if ((session === 'H' || session === 'E' || session === 'A') && !isNaN(year)) {
            pairs.push({ session: session, year: year });
        }
    });

    if (pairs.length < 2 || pairs.length > 5) {
        return { ok: false, error: 'Veuillez saisir 2 à 5 combinaisons session/année valides.' };
    }

    for (let i = 0; i < pairs.length; i++) {
        if (pairs[i].year < 2000 || pairs[i].year > 2100) {
            return { ok: false, error: 'Les années doivent être entre 2000 et 2100.' };
        }
    }

    const uniqueKeys = pairs.map(function (p) { return p.session + ':' + p.year; });
    if (new Set(uniqueKeys).size !== uniqueKeys.length) {
        return { ok: false, error: 'Veuillez choisir des combinaisons session/année différentes.' };
    }

    return { ok: true, pairs: pairs };
}

/**
 * Extrait la clé MM-DD d'une date ISO YYYY-MM-DD.
 */
function dayKeyFromIsoDate(isoDate) {
    return isoDate.slice(5, 10);
}

/**
 * Convertit une clé MM-DD en libellé jj/mm.
 */
function dayLabelFromKey(mmdd) {
    const month = mmdd.slice(0, 2);
    const day = mmdd.slice(3, 5);
    return day + '/' + month;
}

/**
 * Construit le graphique comparatif par jour.
 */
function setComparisonDayChart(seriesList, overlayBySession) {
    let labels = [];
    let datasets = [];
    let chartOptions = {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Sessions' } }
        }
    };

    if (overlayBySession) {
        let maxLen = 0;
        seriesList.forEach(function (serie) {
            if (serie.parjour.length > maxLen) {
                maxLen = serie.parjour.length;
            }
        });

        labels = Array.from({ length: maxLen }, function (_, idx) {
            return 'Jour ' + (idx + 1);
        });

        datasets = seriesList.map(function (serie, index) {
            const color = SET1_PALETTE[index % SET1_PALETTE.length];
            const values = Array.from({ length: maxLen }, function (_, idx) {
                return (serie.parjour[idx] && typeof serie.parjour[idx].nb_sessions === 'number')
                    ? serie.parjour[idx].nb_sessions
                    : 0;
            });
            const realDates = Array.from({ length: maxLen }, function (_, idx) {
                return (serie.parjour[idx] && serie.parjour[idx].jour) ? serie.parjour[idx].jour : '';
            });

            return {
                type: 'line',
                label: serie.label,
                data: values,
                realDates: realDates,
                borderColor: color,
                backgroundColor: hexToRgba(color, 0.2),
                pointRadius: 2,
                pointHoverRadius: 4,
                tension: 0.2
            };
        });

        chartOptions.plugins = {
            tooltip: {
                callbacks: {
                    afterLabel: function (context) {
                        const ds = context.dataset || {};
                        const idx = context.dataIndex;
                        const realDate = ds.realDates && ds.realDates[idx] ? ds.realDates[idx] : '';
                        return realDate ? ('Date réelle: ' + realDate) : '';
                    }
                }
            }
        };
    } else {
        const keySet = new Set();
        seriesList.forEach(function (serie) {
            serie.parjour.forEach(function (row) {
                keySet.add(dayKeyFromIsoDate(row.jour));
            });
        });

        const dayKeys = Array.from(keySet).sort();
        labels = dayKeys.map(dayLabelFromKey);

        datasets = seriesList.map(function (serie, index) {
            const color = SET1_PALETTE[index % SET1_PALETTE.length];
            const values = {};
            serie.parjour.forEach(function (row) {
                values[dayKeyFromIsoDate(row.jour)] = row.nb_sessions;
            });

            return {
                type: 'line',
                label: serie.label,
                data: dayKeys.map(function (k) { return values[k] || 0; }),
                borderColor: color,
                backgroundColor: hexToRgba(color, 0.2),
                pointRadius: 2,
                pointHoverRadius: 4,
                tension: 0.2
            };
        });
    }

    if (cmpDayChart) {
        cmpDayChart.destroy();
    }

    const ctx = document.getElementById('cmpDayChart').getContext('2d');
    cmpDayChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: chartOptions
    });
}

/**
 * Construit le graphique comparatif par mois.
 */
function setComparisonMonthChart(seriesList, overlayBySession) {
    let labels = [];
    let datasets = [];
    let chartOptions = {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Sessions' } }
        }
    };

    if (overlayBySession) {
        let maxLen = 0;
        seriesList.forEach(function (serie) {
            if (serie.parmois.length > maxLen) {
                maxLen = serie.parmois.length;
            }
        });
        labels = Array.from({ length: maxLen }, function (_, idx) {
            return 'Mois ' + (idx + 1);
        });

        datasets = seriesList.map(function (serie, index) {
            const color = SET1_PALETTE[index % SET1_PALETTE.length];
            const values = Array.from({ length: maxLen }, function (_, idx) {
                return (serie.parmois[idx] && typeof serie.parmois[idx].nb_sessions === 'number')
                    ? serie.parmois[idx].nb_sessions
                    : 0;
            });
            const realMonths = Array.from({ length: maxLen }, function (_, idx) {
                return (serie.parmois[idx] && serie.parmois[idx].mois) ? serie.parmois[idx].mois : '';
            });

            return {
                type: 'bar',
                label: serie.label,
                data: values,
                realMonths: realMonths,
                backgroundColor: hexToRgba(color, 0.5),
                borderColor: color,
                borderWidth: 1
            };
        });

        chartOptions.plugins = {
            tooltip: {
                callbacks: {
                    afterLabel: function (context) {
                        const ds = context.dataset || {};
                        const idx = context.dataIndex;
                        const realMonth = ds.realMonths && ds.realMonths[idx] ? ds.realMonths[idx] : '';
                        return realMonth ? ('Mois réel: ' + realMonth) : '';
                    }
                }
            }
        };
    } else {
        const monthKeys = new Set();
        seriesList.forEach(function (serie) {
            serie.parmois.forEach(function (row) {
                monthKeys.add(row.mois);
            });
        });

        labels = Array.from(monthKeys).sort();

        datasets = seriesList.map(function (serie, index) {
            const color = SET1_PALETTE[index % SET1_PALETTE.length];
            const values = {};
            serie.parmois.forEach(function (row) {
                values[row.mois] = row.nb_sessions;
            });

            return {
                type: 'bar',
                label: serie.label,
                data: labels.map(function (monthKey) { return values[monthKey] || 0; }),
                backgroundColor: hexToRgba(color, 0.5),
                borderColor: color,
                borderWidth: 1
            };
        });
    }

    if (cmpMonthChart) {
        cmpMonthChart.destroy();
    }

    const ctx = document.getElementById('cmpMonthChart').getContext('2d');
    cmpMonthChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: datasets },
        options: chartOptions
    });
}

/**
 * Construit le graphique comparatif par jour de semaine.
 */
function setComparisonWeekdayChart(seriesList) {
    const labels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    const datasets = seriesList.map(function (serie, index) {
        const color = SET1_PALETTE[index % SET1_PALETTE.length];
        const values = {};
        serie.parsemaine.forEach(function (row) {
            values[row.jour_semaine_idx] = row.nb_sessions;
        });

        return {
            type: 'bar',
            label: serie.label,
            data: labels.map(function (_, idx) { return values[idx] || 0; }),
            backgroundColor: hexToRgba(color, 0.5),
            borderColor: color,
            borderWidth: 1
        };
    });

    if (cmpWeekdayChart) {
        cmpWeekdayChart.destroy();
    }

    const ctx = document.getElementById('cmpWeekdayChart').getContext('2d');
    cmpWeekdayChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Sessions' } }
            }
        }
    });
}

/**
 * Charge les données de comparaison et met à jour les 3 graphiques.
 */
async function chargerComparaison() {
    setErreurComparaison('');
    const overlayBySession = !!(document.getElementById('cmpOverlayDays') && document.getElementById('cmpOverlayDays').checked);

    const pairsCheck = getComparisonPairs();
    if (!pairsCheck.ok) {
        setErreurComparaison(pairsCheck.error);
        return;
    }

    const pairs = pairsCheck.pairs;
    const requests = [];
    pairs.forEach(function (pair) {
        const base = 'session=' + encodeURIComponent(pair.session) + '&annee=' + encodeURIComponent(pair.year);
        requests.push(fetch('api.php?parjour=1&' + base, { headers: { 'Accept': 'application/json' } }));
        requests.push(fetch('api.php?parmois=1&' + base, { headers: { 'Accept': 'application/json' } }));
        requests.push(fetch('api.php?parsemaine=1&' + base, { headers: { 'Accept': 'application/json' } }));
    });

    const responses = await Promise.all(requests);
    const payloads = await Promise.all(responses.map(function (res) { return res.json(); }));

    for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok || !payloads[i].ok) {
            setErreurComparaison((payloads[i] && payloads[i].error) ? payloads[i].error : 'Erreur lors du chargement de la comparaison.');
            return;
        }
    }

    const seriesList = pairs.map(function (pair, index) {
        const offset = index * 3;
        return {
            year: pair.year,
            session: pair.session,
            label: getSessionShortLabel(pair.session) + ' ' + pair.year,
            parjour: payloads[offset].donnees,
            parmois: payloads[offset + 1].donnees,
            parsemaine: payloads[offset + 2].donnees
        };
    });

    setComparisonDayChart(seriesList, overlayBySession);
    setComparisonMonthChart(seriesList, overlayBySession);
    setComparisonWeekdayChart(seriesList);

    const pairValues = pairs.map(function (p) { return p.session + ':' + p.year; });
    setCookie('stats_cmp_pairs', pairValues.join(','));
    setCookie('stats_cmp_overlay', overlayBySession ? '1' : '0');
}

/**
 * Initialise la section de comparaison inter-sessions.
 */
function initialiserComparaison() {
    const currentYear = new Date().getFullYear();

    const savedPairs = getCookie('stats_cmp_pairs');
    const pairs = [];
    if (savedPairs) {
        savedPairs.split(',').forEach(function (raw) {
            const trimmed = String(raw || '').trim();
            const parts = trimmed.split(':');
            if (parts.length !== 2) { return; }
            const s = parts[0];
            const y = parseInt(parts[1], 10);
            if ((s === 'H' || s === 'E' || s === 'A') && !isNaN(y) && y >= 2000 && y <= 2100) {
                pairs.push({ session: s, year: y });
            }
        });
    }

    if (pairs.length >= 2) {
        pairs.forEach(function (p) {
            renderComparisonYearRow(p.session, p.year);
        });
    } else {
        const defaultSession = getDefaultComparisonSession();
        renderComparisonYearRow(defaultSession, currentYear - 1);
        renderComparisonYearRow(defaultSession, currentYear);
    }

    const overlayEl = document.getElementById('cmpOverlayDays');
    const savedOverlay = getCookie('stats_cmp_overlay');
    if (overlayEl) {
        overlayEl.checked = (savedOverlay === '1');
    }

    document.getElementById('btnComparerSessions').addEventListener('click', function () {
        chargerComparaison();
    });

    chargerComparaison();
}

// ---------------------------------------------------------------------------
// Gestion des modes de filtrage
// ---------------------------------------------------------------------------

/**
 * Retourne le mode de filtrage actif : 'session' ou 'dates'.
 * @returns {string}
 */
function getActiveMode() {
    const selected = document.querySelector('input[name="modeFiltre"]:checked');
    return selected ? selected.value : 'session';
}

/**
 * Calcule les dates de début/fin et un libellé lisible pour une session académique.
 * @param {string} session - 'H', 'E' ou 'A'
 * @param {string|number} annee
 * @returns {{datedebut: string, datefin: string, label: string}}
 */
function getSessionDates(session, annee) {
    const y = parseInt(annee, 10);
    switch (session) {
        case 'H': return { datedebut: y + '-01-01', datefin: y + '-04-30', label: 'Hiver ' + y + '\u2002· ' + '1 janvier – 30 avril ' + y };
        case 'E': return { datedebut: y + '-05-01', datefin: y + '-08-31', label: '\u00c9t\u00e9 '   + y + '\u2002· ' + '1 mai – 31 août ' + y };
        case 'A': return { datedebut: y + '-09-01', datefin: y + '-12-31', label: 'Automne ' + y + '\u2002· ' + '1 septembre – 31 décembre ' + y };
        default:  return { datedebut: y + '-01-01', datefin: y + '-12-31', label: String(y) };
    }
}

/**
 * Lit les champs actifs et retourne les dates ainsi qu'un libellé de la période.
 * @returns {{datedebut: string, datefin: string, label: string, session: string, annee: string}}
 */
function getDatesEtLabel() {
    const mode = getActiveMode();
    if (mode === 'session') {
        const session = document.getElementById('session').value;
        const annee   = document.getElementById('annee').value;
        return Object.assign(getSessionDates(session, annee), { session: session, annee: annee });
    }
    const datedebut = document.getElementById('datedebut').value;
    const datefin   = document.getElementById('datefin').value;
    return { datedebut: datedebut, datefin: datefin, label: datedebut + ' – ' + datefin, session: '', annee: '' };
}

/**
 * Affiche ou masque les zones de filtres selon le mode sélectionné.
 * @param {string} mode - 'session' ou 'dates'
 */
function applierModeActif(mode) {
    document.getElementById('zone-session').style.display = mode === 'session' ? 'flex' : 'none';
    document.getElementById('zone-dates').style.display   = mode === 'dates'   ? 'flex' : 'none';
}

/**
 * Déplace la session académique d'un cran (-1 ou +1) puis recharge les stats.
 * Ordre : Hiver -> Été -> Automne -> Hiver (année + 1).
 * @param {number} delta
 */
function deplacerSession(delta) {
    const sessionOrder = ['H', 'E', 'A'];
    const sessionEl = document.getElementById('session');
    const anneeEl = document.getElementById('annee');
    let idx = sessionOrder.indexOf(sessionEl.value);
    if (idx < 0) {
        idx = 0;
        sessionEl.value = 'H';
    }

    let annee = parseInt(anneeEl.value, 10);
    if (isNaN(annee)) {
        annee = new Date().getFullYear();
    }

    idx += delta;
    if (idx > 2) {
        idx = 0;
        annee += 1;
    } else if (idx < 0) {
        idx = 2;
        annee -= 1;
    }

    sessionEl.value = sessionOrder[idx];
    anneeEl.value = String(annee);

    charger();
}

// ---------------------------------------------------------------------------

/**
 * Construit les paramètres d'URL pour l'API selon le mode actif.
 * En mode session, on envoie session+année et l'API calcule les bornes.
 * En mode dates, on envoie datedebut+datefin comme avant.
 * @returns {{params: string, datedebut: string, datefin: string, label: string}|null}
 */
function getApiParams() {
    const mode = getActiveMode();
    if (mode === 'session') {
        const session = document.getElementById('session').value;
        const annee   = document.getElementById('annee').value;
        if (!session || !annee) { return null; }
        const { datedebut, datefin, label } = getSessionDates(session, annee);
        return { params: 'session=' + encodeURIComponent(session) + '&annee=' + encodeURIComponent(annee), datedebut: datedebut, datefin: datefin, label: label };
    }
    const datedebut = document.getElementById('datedebut').value;
    const datefin   = document.getElementById('datefin').value;
    if (!datedebut || !datefin) { return null; }
    return { params: 'datedebut=' + encodeURIComponent(datedebut) + '&datefin=' + encodeURIComponent(datefin), datedebut: datedebut, datefin: datefin, label: datedebut + ' – ' + datefin };
}

/**
 * Charge simultanément les données par jour, par mois, par jour de semaine et par heure.
 * Les réponses proviennent de l'API JSON locale `api.php`.
 * En mode session, les paramètres session+année sont envoyés directement à l'API.
 * En mode dates, les paramètres datedebut+datefin sont envoyés.
 */
async function charger() {
    setErreur('');

    await chargerTempsReel();

    const apiParams = getApiParams();
    if (!apiParams) {
        setErreur('Veuillez remplir tous les champs de filtre.');
        return;
    }
    const { params, datedebut, datefin, label } = apiParams;

    document.getElementById('periode-titre').textContent = label;

    const { session, annee } = getDatesEtLabel();
    persistFilters(getActiveMode(), session, annee, datedebut, datefin);

    const urlParJour  = 'api.php?parjour=1&'  + params;
    const urlParMois  = 'api.php?parmois=1&'  + params;
    const urlParSemaine = 'api.php?parsemaine=1&' + params;
    const urlParHeure = 'api.php?parheure=1&' + params;

    const responses = await Promise.all([
        fetch(urlParJour,  { headers: { 'Accept': 'application/json' } }),
        fetch(urlParMois,  { headers: { 'Accept': 'application/json' } }),
        fetch(urlParSemaine, { headers: { 'Accept': 'application/json' } }),
        fetch(urlParHeure, { headers: { 'Accept': 'application/json' } })
    ]);
    const dataParJour  = await responses[0].json();
    const dataParMois  = await responses[1].json();
    const dataParSemaine = await responses[2].json();
    const dataParHeure = await responses[3].json();

    if (!responses[0].ok || !dataParJour.ok) {
        setErreur((dataParJour  && dataParJour.error)  ? dataParJour.error  : 'Erreur lors du chargement des statistiques par jour.');
        return;
    }

    if (!responses[1].ok || !dataParMois.ok) {
        setErreur((dataParMois && dataParMois.error) ? dataParMois.error : 'Erreur lors du chargement des statistiques par mois.');
        return;
    }

    if (!responses[2].ok || !dataParSemaine.ok) {
        setErreur((dataParSemaine && dataParSemaine.error) ? dataParSemaine.error : 'Erreur lors du chargement des statistiques par jour de semaine.');
        return;
    }

    if (!responses[3].ok || !dataParHeure.ok) {
        setErreur((dataParHeure && dataParHeure.error) ? dataParHeure.error : 'Erreur lors du chargement des statistiques par heure.');
        return;
    }

    setCards(dataParJour.resume);
    setTableParJour(dataParJour.donnees);
    setTableParMois(dataParMois.donnees);
    setTableParSemaine(dataParSemaine.donnees);
    setTableParHeure(dataParHeure.donnees);
    setJsonView('jsonStatsDay', dataParJour.donnees);
    setJsonView('jsonStatsMonth', dataParMois.donnees);
    setJsonView('jsonStatsWeekday', dataParSemaine.donnees);
    setJsonView('jsonStatsHour', dataParHeure.donnees);
    setChart(dataParJour.donnees);
    setMonthsChart(dataParMois.donnees);
    setWeekdayChart(dataParSemaine.donnees);
    setHoursChart(dataParHeure.donnees);
}

// ---------------------------------------------------------------------------
// Initialisation de l'interface
// ---------------------------------------------------------------------------

async function initialiserApplication() {
    // 1. Restaurer les filtres sauvegardés (retourne le mode actif)
    const modeInitial = restoreFiltersFromCookies();

    // 2. Afficher la zone correspondante
    applierModeActif(modeInitial);

    // 2b. Initialiser les onglets Graphique / Tableau / JSON
    initTabs();

    // 2c. Charger l'etat d'acces public/prive
    await refreshAccessState();

    // 3. Écouter les changements de mode
    document.getElementsByName('modeFiltre').forEach(function (radio) {
        radio.addEventListener('change', function () {
            applierModeActif(this.value);
            setTimeout(charger, 0);
        });
    });

    // 4. Bouton charger
    document.getElementById('btnCharger').addEventListener('click', charger);

    // 4a. Controles d'acces API
    const btnApiUnlock = document.getElementById('btnApiUnlock');
    const btnApiLock = document.getElementById('btnApiLock');
    const apiKeyInput = document.getElementById('apiKeyInput');

    if (btnApiUnlock) {
        btnApiUnlock.addEventListener('click', function () {
            unlockPrivateAccess();
        });
    }
    if (btnApiLock) {
        btnApiLock.addEventListener('click', function () {
            lockPublicAccess();
        });
    }
    if (apiKeyInput) {
        apiKeyInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                unlockPrivateAccess();
            }
        });
    }

    // 4b. Sessions par utilisateur
    document.getElementById('btnUserLoad').addEventListener('click', function () {
        chargerSessionsUtilisateur(1);
    });
    document.getElementById('userUsername').addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            chargerSessionsUtilisateur(1);
        }
    });
    document.getElementById('btnUserPrev').addEventListener('click', function () {
        if (userSessionsCurrentPage > 1) {
            chargerSessionsUtilisateur(userSessionsCurrentPage - 1);
        }
    });
    document.getElementById('btnUserNext').addEventListener('click', function () {
        if (userSessionsCurrentPage < userSessionsTotalPages) {
            chargerSessionsUtilisateur(userSessionsCurrentPage + 1);
        }
    });
    setUserPaging({ page: 1, total_pages: 1, total_rows: 0, has_prev: false, has_next: false });

    // 5. Navigation session (mode session académique)
    document.getElementById('btnSessionPrev').addEventListener('click', function () {
        deplacerSession(-1);
    });
    document.getElementById('btnSessionNext').addEventListener('click', function () {
        deplacerSession(1);
    });

    // 6. Recharger automatiquement en mode session académique
    document.getElementById('session').addEventListener('change', function () {
        if (getActiveMode() === 'session') {
            charger();
        }
    });
    document.getElementById('annee').addEventListener('change', function () {
        if (getActiveMode() === 'session') {
            charger();
        }
    });

    // 7. Chargement initial
    charger();

    // 7b. Initialisation des graphes de comparaison
    initialiserComparaison();

    // 7c. Historique d'un poste
    initialiserHistoriquePoste();

    // 8. Rafraîchissement périodique du portrait en direct (toutes les 30s)
    if (liveRefreshTimer) {
        clearInterval(liveRefreshTimer);
    }
    liveRefreshTimer = setInterval(function () {
        chargerTempsReel();
    }, 30000);
}

initialiserApplication();
