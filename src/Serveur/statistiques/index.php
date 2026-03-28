<?php
require_once(dirname(__FILE__).'/../LAB_config.php');

$today = date('Y-m-d');
$monthAgo = date('Y-m-d', strtotime('-30 days'));

$currentMonth = (int)date('m');
if ($currentMonth <= 4)     { $defaultSession = 'H'; }
elseif ($currentMonth <= 8) { $defaultSession = 'E'; }
else                        { $defaultSession = 'A'; }
$defaultAnnee = date('Y');
?>
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Statistiques - <?php echo htmlspecialchars($LaboNom, ENT_QUOTES, 'UTF-8'); ?></title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="statistiques.css" />
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #222; }
        h1 { margin-top: 0; }
        .filtres { display: flex; gap: 12px; align-items: end; flex-wrap: wrap; margin-bottom: 8px; }
        .filtres label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
        button { padding: 8px 14px; cursor: pointer; }
        .mode-selector { display: flex; gap: 20px; align-items: center; width: 100%; margin-bottom: 4px; font-size: 14px; }
        .mode-selector label { flex-direction: row; gap: 6px; cursor: pointer; }
        .zone-filtre { display: flex; gap: 12px; align-items: end; flex-wrap: wrap; }
        #annee { width: 80px; padding: 3px 6px; font-size: 14px; }
        select { padding: 3px 6px; font-size: 14px; }
        .periode-titre { margin-bottom: 14px; color: #555; font-style: italic; font-size: 13px; min-height: 18px; }
        .cartes { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin: 14px 0 20px; }
        .carte { border: 1px solid #ddd; padding: 10px; border-radius: 8px; background: #fafafa; }
        .carte .titre { font-size: 13px; color: #555; }
        .carte .valeur { font-size: 22px; font-weight: bold; margin-top: 4px; }
        .zone-graphe { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
        .zone-graphe h2 { margin-top: 0; font-size: 18px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
        .erreur { color: #b00020; margin-bottom: 12px; }
        details { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; background: #fafafa; }
        summary { cursor: pointer; font-weight: bold; margin-bottom: 10px; }
    </style>
</head>
<body>
    <h1>En direct</h1>

    <div class="zone-graphe">
        <div class="cartes">
            <div class="carte carte-online">
                <div class="titre">Postes en ligne</div>
                <div id="rt_postes_en_ligne" class="valeur">-</div>
                <ul id="rt_statuts" class="rt-statuts-list"></ul>
            </div>
            <div class="carte carte-offline">
                <div class="titre">Postes hors ligne</div>
                <div id="rt_postes_hors_ligne" class="valeur">-</div>
                <ul id="rt_statuts_hors_ligne" class="rt-statuts-list"></ul>
            </div>
            <div class="carte"><div class="titre">Sessions ouvertes</div><div id="rt_sessions_ouvertes" class="valeur">-</div></div>
            <div class="carte"><div class="titre">Taux occupation (postes en ligne)</div><div id="rt_taux_occupation" class="valeur">-</div></div>
            <div class="carte"><div class="titre">Sessions ouvertes sur poste hors ligne</div><div id="rt_sessions_hors_ligne" class="valeur">-</div></div>
        </div>
        <small id="rt_asof"></small>
    </div>

    <h1>Statistiques des sessions</h1>

    <div class="filtres">
        <!-- Sélecteur de mode -->
        <div class="mode-selector">
            <label><input type="radio" name="modeFiltre" value="session" checked> Par session académique</label>
            <label><input type="radio" name="modeFiltre" value="dates"> Par intervalle de dates</label>
        </div>

        <!-- Mode : session académique -->
        <div id="zone-session" class="zone-filtre">
            <label>Session
                <select id="session">
                    <option value="H"<?php echo $defaultSession === 'H' ? ' selected' : ''; ?>>Hiver (janv. – avr.)</option>
                    <option value="E"<?php echo $defaultSession === 'E' ? ' selected' : ''; ?>>Été (mai – août)</option>
                    <option value="A"<?php echo $defaultSession === 'A' ? ' selected' : ''; ?>>Automne (sept. – déc.)</option>
                </select>
            </label>
            <label>Année
                <input type="number" id="annee" value="<?php echo $defaultAnnee; ?>" min="2000" max="2100" />
            </label>
            <button type="button" id="btnSessionPrev" title="Session précédente">&lt;</button>
            <button type="button" id="btnSessionNext" title="Session suivante">&gt;</button>
        </div>

        <!-- Mode : intervalle de dates -->
        <div id="zone-dates" class="zone-filtre" style="display:none">
            <label>Date début
                <input type="date" id="datedebut" value="<?php echo $monthAgo; ?>" />
            </label>
            <label>Date fin
                <input type="date" id="datefin" value="<?php echo $today; ?>" />
            </label>
            <button id="btnCharger">Charger</button>
        </div>
    </div>
    <div id="periode-titre" class="periode-titre"></div>

    <div id="erreur" class="erreur"></div>

    <div class="cartes">
        <div class="carte"><div class="titre">Jours analysés</div><div id="c_nb_jours" class="valeur">-</div></div>
        <div class="carte"><div class="titre">Sessions totales</div><div id="c_nb_sessions" class="valeur">-</div></div>
        <div class="carte"><div class="titre">Durée totale (heures)</div><div id="c_duree_totale_h" class="valeur">-</div></div>
        <div class="carte"><div class="titre">Durée moyenne (minutes)</div><div id="c_duree_moy_min" class="valeur">-</div></div>
    </div>

    <div class="zone-graphe">
        <h2>Sessions par jour</h2>
        <canvas id="statsChart" height="90"></canvas>
    </div>

    <div class="zone-graphe">
        <h2>Sessions par mois</h2>
        <canvas id="monthsChart" height="90"></canvas>
    </div>

    <div class="zone-graphe">
        <h2>Sessions par jour de semaine</h2>
        <canvas id="weekdayChart" height="90"></canvas>
    </div>

    <div class="zone-graphe">
        <h2>Sessions par heure de début</h2>
        <canvas id="hoursChart" height="90"></canvas>
    </div>

    <details>
        <summary>Afficher les données détaillées</summary>
        <table>
            <thead>
                <tr>
                    <th>Jour</th>
                    <th>Nombre de sessions</th>
                    <th>Durée moyenne (min)</th>
                    <th>Durée totale (heures)</th>
                </tr>
            </thead>
            <tbody id="tbodyStats"></tbody>
        </table>
    </details>

    <h1>Comparaison de sessions</h1>

    <div class="zone-graphe">
        <div class="comp-ctrl">
            <label>Session
                <select id="cmpSession">
                    <option value="H">Hiver (janv. – avr.)</option>
                    <option value="E">Été (mai – août)</option>
                    <option value="A">Automne (sept. – déc.)</option>
                </select>
            </label>
            <div>
                <label>Années à comparer</label>
                <div id="cmpYears"></div>
            </div>
            <button type="button" id="btnComparerSessions" style="align-self:end">Comparer</button>
        </div>
        <div id="erreur-comparaison" class="erreur"></div>
    </div>

    <div class="zone-graphe">
        <h2>Comparaison par jour (sessions)</h2>
        <canvas id="cmpDayChart" height="90"></canvas>
    </div>

    <div class="zone-graphe">
        <h2>Comparaison par mois (sessions)</h2>
        <canvas id="cmpMonthChart" height="90"></canvas>
    </div>

    <div class="zone-graphe">
        <h2>Comparaison par jour de semaine (sessions)</h2>
        <canvas id="cmpWeekdayChart" height="90"></canvas>
    </div>

    <script src="statistiques-cookies.js"></script>
    <script src="statistiques.js"></script>
</body>
</html>
