const DATEDEBUT_COOKIE = 'stats_datedebut';
const DATEFIN_COOKIE   = 'stats_datefin';
const MODE_COOKIE      = 'stats_mode';
const SESSION_COOKIE   = 'stats_session';
const ANNEE_COOKIE     = 'stats_annee';

/**
 * Lit un cookie simple par son nom.
 * @param {string} name
 * @returns {string}
 */
function getCookie(name) {
    const prefix = name + '=';
    const cookies = document.cookie ? document.cookie.split(';') : [];

    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.indexOf(prefix) === 0) {
            return decodeURIComponent(cookie.substring(prefix.length));
        }
    }

    return '';
}

/**
 * Écrit un cookie simple (durée 1 an).
 * @param {string} name
 * @param {string} value
 */
function setCookie(name, value) {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires.toUTCString() + '; path=/; SameSite=Lax';
}

/**
 * Restaure tous les filtres depuis les cookies : mode, session académique, année et intervalle de dates.
 * Retourne le mode actif ('session' ou 'dates') pour que l'appelant puisse adapter l'affichage.
 * @returns {string} mode actif
 */
function restoreFiltersFromCookies() {
    const mode     = getCookie(MODE_COOKIE) || 'session';
    const session  = getCookie(SESSION_COOKIE);
    const annee    = getCookie(ANNEE_COOKIE);
    const datedebut = getCookie(DATEDEBUT_COOKIE);
    const datefin   = getCookie(DATEFIN_COOKIE);

    // Mode : cocher le bon radio
    const radios = document.getElementsByName('modeFiltre');
    for (let i = 0; i < radios.length; i++) {
        radios[i].checked = (radios[i].value === mode);
    }

    // Session académique
    if (session) {
        const sel = document.getElementById('session');
        if (sel) { sel.value = session; }
    }
    if (annee) {
        const inp = document.getElementById('annee');
        if (inp) { inp.value = annee; }
    }

    // Intervalle de dates
    if (datedebut) {
        const inp = document.getElementById('datedebut');
        if (inp) { inp.value = datedebut; }
    }
    if (datefin) {
        const inp = document.getElementById('datefin');
        if (inp) { inp.value = datefin; }
    }

    return mode;
}

/**
 * Enregistre tous les filtres dans les cookies.
 * @param {string} mode      - 'session' ou 'dates'
 * @param {string} session   - 'H', 'E' ou 'A'
 * @param {string} annee     - ex. '2025'
 * @param {string} datedebut - ex. '2025-01-01'
 * @param {string} datefin   - ex. '2025-04-30'
 */
function persistFilters(mode, session, annee, datedebut, datefin) {
    setCookie(MODE_COOKIE,      mode);
    setCookie(SESSION_COOKIE,   session);
    setCookie(ANNEE_COOKIE,     annee);
    setCookie(DATEDEBUT_COOKIE, datedebut);
    setCookie(DATEFIN_COOKIE,   datefin);
}

// Alias rétrocompatibilité (non utilisé en interne, conservé pour sécurité)
function restoreDatesFromCookies() { restoreFiltersFromCookies(); }
function persistSelectedDates(d1, d2) { persistFilters('dates', '', '', d1, d2); }
