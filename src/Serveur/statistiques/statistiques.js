let chart;
let hoursChart;
let monthsChart;
let weekdayChart;
let cmpDayChart;
let cmpMonthChart;
let cmpWeekdayChart;
let liveRefreshTimer;
let userSessionsCurrentPage = 1;
let userSessionsTotalPages = 1;
let userSessionsLastUsername = '';

const SET1_PALETTE = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999'];

const COLOR_SESSIONS = SET1_PALETTE[1]; // #377eb8 bleu
const COLOR_DUREE    = SET1_PALETTE[0]; // #e41a1c rouge

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

function setErreurComparaison(message) {
    const el = document.getElementById('erreur-comparaison');
    if (el) {
        el.textContent = message || '';
    }
}

function setErreurUtilisateur(message) {
    const el = document.getElementById('erreur-utilisateur');
    if (el) {
        el.textContent = message || '';
    }
}

function setUserPaging(pagination) {
    const info = document.getElementById('userPagingInfo');
    const btnPrev = document.getElementById('btnUserPrev');
    const btnNext = document.getElementById('btnUserNext');
    if (!info || !btnPrev || !btnNext) { return; }

    info.textContent = 'Page ' + pagination.page + ' / ' + pagination.total_pages + ' (' + pagination.total_rows + ' résultats)';
    btnPrev.disabled = !pagination.has_prev;
    btnNext.disabled = !pagination.has_next;
}

function setTableUtilisateur(rows) {
    const tbody = document.getElementById('tbodyUserSessions');
    if (!tbody) { return; }

    tbody.innerHTML = '';
    rows.forEach(function (row) {
        const tr = document.createElement('tr');
        const values = [
            row.login || '-',
            row.poste || '-',
            row.last_seen || '-',
            row.logoff || '-',
            row.duree_min,
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

async function chargerSessionsUtilisateur(page) {
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

    setTableUtilisateur(data.donnees || []);
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
    const statuts = payload.statuts_postes_en_ligne || {};
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
    const statutsOff = payload.statuts_postes_hors_ligne || {};
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

function setJsonView(preId, payload) {
    const pre = document.getElementById(preId);
    if (!pre) { return; }
    pre.textContent = JSON.stringify(payload, null, 2);
}

function setTableParJour(rows) {
    setRowsTable('tbodyStatsDay', rows, [
        { key: 'jour' },
        { key: 'nb_sessions' },
        { key: 'duree_moyenne_min' },
        { key: 'duree_totale_h' }
    ]);
}

function setTableParMois(rows) {
    setRowsTable('tbodyStatsMonth', rows, [
        { key: 'mois' },
        { key: 'nb_sessions' },
        { key: 'duree_moyenne_min' },
        { key: 'duree_totale_h' }
    ]);
}

function setTableParSemaine(rows) {
    setRowsTable('tbodyStatsWeekday', rows, [
        { key: 'jour_semaine' },
        { key: 'nb_sessions' },
        { key: 'duree_moyenne_min' },
        { key: 'duree_totale_h' }
    ]);
}

function setTableParHeure(rows) {
    setRowsTable('tbodyStatsHour', rows, [
        { key: 'heure' },
        { key: 'nb_sessions' },
        { key: 'duree_moyenne_min' },
        { key: 'duree_totale_h' }
    ]);
}

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

function getSessionShortLabel(session) {
    if (session === 'H') { return 'Hiver'; }
    if (session === 'E') { return 'Été'; }
    return 'Automne';
}

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

function renderComparisonYearRow(value) {
    const container = document.getElementById('cmpYears');
    if (container.querySelectorAll('.cmp-year-row').length >= 5) { return; }

    const row = document.createElement('div');
    row.className = 'cmp-year-row';

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '2000';
    input.max = '2100';
    input.value = String(value || '');

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
        renderComparisonYearRow(new Date().getFullYear());
    });

    row.appendChild(input);
    row.appendChild(btnMinus);
    row.appendChild(btnPlus);
    container.appendChild(row);

    updateCmpYearButtons();
}

function getComparisonYears() {
    const inputs = document.querySelectorAll('#cmpYears .cmp-year-row input');
    const years = [];
    inputs.forEach(function (input) {
        const val = parseInt(input.value, 10);
        if (!isNaN(val)) {
            years.push(val);
        }
    });

    if (years.length < 2 || years.length > 5) {
        return { ok: false, error: 'Veuillez saisir 2 à 5 années valides.' };
    }

    for (let i = 0; i < years.length; i++) {
        if (years[i] < 2000 || years[i] > 2100) {
            return { ok: false, error: 'Les années doivent être entre 2000 et 2100.' };
        }
    }

    const unique = Array.from(new Set(years));
    if (unique.length !== years.length) {
        return { ok: false, error: 'Veuillez choisir des années différentes.' };
    }

    years.sort(function (a, b) { return a - b; });
    return { ok: true, years: years };
}

function dayKeyFromIsoDate(isoDate) {
    return isoDate.slice(5, 10);
}

function dayLabelFromKey(mmdd) {
    const month = mmdd.slice(0, 2);
    const day = mmdd.slice(3, 5);
    return day + '/' + month;
}

function setComparisonDayChart(seriesList) {
    const keySet = new Set();
    seriesList.forEach(function (serie) {
        serie.parjour.forEach(function (row) {
            keySet.add(dayKeyFromIsoDate(row.jour));
        });
    });

    const dayKeys = Array.from(keySet).sort();
    const labels = dayKeys.map(dayLabelFromKey);

    const datasets = seriesList.map(function (serie, index) {
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

    if (cmpDayChart) {
        cmpDayChart.destroy();
    }

    const ctx = document.getElementById('cmpDayChart').getContext('2d');
    cmpDayChart = new Chart(ctx, {
        type: 'line',
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

function setComparisonMonthChart(seriesList, session) {
    const monthSlots = getMonthSlotsForSession(session);
    const labels = monthSlots.map(function (slot) { return slot.label; });

    const datasets = seriesList.map(function (serie, index) {
        const color = SET1_PALETTE[index % SET1_PALETTE.length];
        const values = {};
        serie.parmois.forEach(function (row) {
            const monthNum = row.mois.slice(5, 7);
            values[monthNum] = row.nb_sessions;
        });

        return {
            type: 'bar',
            label: serie.label,
            data: monthSlots.map(function (slot) { return values[slot.num] || 0; }),
            backgroundColor: hexToRgba(color, 0.5),
            borderColor: color,
            borderWidth: 1
        };
    });

    if (cmpMonthChart) {
        cmpMonthChart.destroy();
    }

    const ctx = document.getElementById('cmpMonthChart').getContext('2d');
    cmpMonthChart = new Chart(ctx, {
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

async function chargerComparaison() {
    setErreurComparaison('');

    const cmpSession = document.getElementById('cmpSession').value;
    const yearsCheck = getComparisonYears();
    if (!yearsCheck.ok) {
        setErreurComparaison(yearsCheck.error);
        return;
    }

    const years = yearsCheck.years;
    const requests = [];
    years.forEach(function (year) {
        const base = 'session=' + encodeURIComponent(cmpSession) + '&annee=' + encodeURIComponent(year);
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

    const seriesList = years.map(function (year, index) {
        const offset = index * 3;
        return {
            year: year,
            label: getSessionShortLabel(cmpSession) + ' ' + year,
            parjour: payloads[offset].donnees,
            parmois: payloads[offset + 1].donnees,
            parsemaine: payloads[offset + 2].donnees
        };
    });

    setComparisonDayChart(seriesList);
    setComparisonMonthChart(seriesList, cmpSession);
    setComparisonWeekdayChart(seriesList);

    // Persister la session et les années de la comparaison
    setCookie('stats_cmp_session', cmpSession);
    const currentInputs = document.querySelectorAll('#cmpYears .cmp-year-row input');
    const yearValues = [];
    currentInputs.forEach(function (inp) {
        const v = parseInt(inp.value, 10);
        if (!isNaN(v)) { yearValues.push(v); }
    });
    setCookie('stats_cmp_years', yearValues.join(','));
}

function initialiserComparaison() {
    const cmpSessionEl = document.getElementById('cmpSession');
    const sessionEl = document.getElementById('session');
    const currentYear = new Date().getFullYear();

    // Restaurer session de comparaison depuis cookie
    const savedCmpSession = getCookie('stats_cmp_session');
    if (savedCmpSession && cmpSessionEl) {
        cmpSessionEl.value = savedCmpSession;
    } else if (sessionEl && cmpSessionEl) {
        cmpSessionEl.value = sessionEl.value;
    }

    // Restaurer les années de comparaison depuis cookie
    const savedYears = getCookie('stats_cmp_years');
    const years = savedYears
        ? savedYears.split(',').map(function (y) { return parseInt(y, 10); }).filter(function (y) { return y >= 2000 && y <= 2100; })
        : [currentYear - 1, currentYear];
    years.forEach(function (y) { renderComparisonYearRow(y); });

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
 * En mode session, on envoie session+annee et l'API calcule les bornes.
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
 * En mode session, les paramètres session+annee sont envoyés directement à l'API.
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

// 1. Restaurer les filtres sauvegardés (retourne le mode actif)
const modeInitial = restoreFiltersFromCookies();

// 2. Afficher la zone correspondante
applierModeActif(modeInitial);

// 2b. Initialiser les onglets Graphique / Tableau / JSON
initTabs();

// 3. Écouter les changements de mode
document.getElementsByName('modeFiltre').forEach(function (radio) {
    radio.addEventListener('change', function () {
        applierModeActif(this.value);
        // Décale le chargement au tick suivant pour laisser le navigateur
        // appliquer le changement de mode avant la lecture des filtres.
        setTimeout(charger, 0);
    });
});

// 4. Bouton charger
document.getElementById('btnCharger').addEventListener('click', charger);

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

// 8. Rafraîchissement périodique du portrait en direct (toutes les 30s)
if (liveRefreshTimer) {
    clearInterval(liveRefreshTimer);
}
liveRefreshTimer = setInterval(function () {
    chargerTempsReel();
}, 30000);
