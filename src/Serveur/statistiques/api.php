<?php
require_once(dirname(__FILE__).'/../LAB_config.php');

header('Content-Type: application/json; charset=utf-8');

// ---------------------------------------------------------------------------
// Configuration / garde-fous
// ---------------------------------------------------------------------------
$tableSessionsName = isset($tableSessions) ? $tableSessions : 'sessions';
$tablePostesName = isset($tablePostes) ? $tablePostes : (isset($table) ? $table : 'IsThereAnyFreeDesktop');
$heartbeatTimeout = isset($heartbeatTimeoutSeconds) ? (int)$heartbeatTimeoutSeconds : 300;
if ($heartbeatTimeout < 1) {
    $heartbeatTimeout = 300;
}

// ---------------------------------------------------------------------------
// Résolution de l'action demandée
// ---------------------------------------------------------------------------
$action = '';
switch (true) {
    case isset($_GET['action']):
        $action = strtolower(trim($_GET['action']));
        break;
    case isset($_GET['parjour']):
        $action = 'parjour';
        break;
    case isset($_GET['parheure']):
        $action = 'parheure';
        break;
    case isset($_GET['parmois']):
        $action = 'parmois';
        break;
    case isset($_GET['parsemaine']):
        $action = 'parsemaine';
        break;
    case isset($_GET['tempsreel']):
        $action = 'tempsreel';
        break;
    case isset($_GET['utilisateur']):
        $action = 'utilisateur';
        break;
}

// Réponse d'accueil quand l'API est appelée sans paramètre.
if (empty($_GET)) {
    echo json_encode(array(
        'ok' => true,
        'message' => 'API statistiques prête.',
        'actions' => array('parjour', 'parheure', 'parmois', 'parsemaine', 'tempsreel', 'utilisateur'),
        'usage' => array(
            '?tempsreel=1',
            '?parjour=1&datedebut=YYYY-MM-DD&datefin=YYYY-MM-DD',
            '?parmois=1&session=H|E|A&annee=YYYY',
            '?parsemaine=1&session=H|E|A&annee=YYYY',
            '?parheure=1&session=H|E|A&annee=YYYY',
            '?action=utilisateur&username=nom.utilisateur&page=1'
        )
    ));
    exit();
}

// ---------------------------------------------------------------------------
// Endpoint temps réel : portrait des postes + sessions ouvertes
// ---------------------------------------------------------------------------
if ($action === 'tempsreel') {
    try {
        $reqPostes = $bdd->prepare("SELECT poste, statut, last_seen FROM ".$tablePostesName." WHERE (poste LIKE 'LABOVI%') OR (reserve IS NOT NULL) ORDER BY poste");
        $reqPostes->execute();
        $postes = $reqPostes->fetchAll(PDO::FETCH_ASSOC);

        $totalPostes = count($postes);
        $onlineTotal = 0;
        $offlineTotal = 0;
        $statutsOnline = array();
        $statutsOffline = array();
        $onlinePostesSet = array();
        $nowTs = time();

        foreach ($postes as $poste) {
            $lastSeenTs = null;
            if (!empty($poste['last_seen'])) {
                $lastSeenTs = strtotime($poste['last_seen']);
            }
            $isOnline = $lastSeenTs && (($nowTs - $lastSeenTs) <= $heartbeatTimeout);
            $statut = isset($poste['statut']) ? strtolower(trim((string)$poste['statut'])) : 'inconnu';
            if ($statut === '') {
                $statut = 'inconnu';
            }

            if ($isOnline) {
                $onlineTotal++;
                $onlinePostesSet[strtolower($poste['poste'])] = true;
                if (!isset($statutsOnline[$statut])) {
                    $statutsOnline[$statut] = 0;
                }
                $statutsOnline[$statut]++;
            } else {
                $offlineTotal++;
                if (!isset($statutsOffline[$statut])) {
                    $statutsOffline[$statut] = 0;
                }
                $statutsOffline[$statut]++;
            }
        }

        ksort($statutsOnline);
        ksort($statutsOffline);

        $reqSessions = $bdd->prepare("SELECT poste FROM ".$tableSessionsName." WHERE logoff IS NULL");
        $reqSessions->execute();
        $openSessionsRows = $reqSessions->fetchAll(PDO::FETCH_ASSOC);

        $openSessionsTotal = count($openSessionsRows);
        $openSessionsOnOfflinePostes = 0;
        $openSessionsDistinctPostes = array();
        foreach ($openSessionsRows as $session) {
            $posteKey = strtolower((string)$session['poste']);
            $openSessionsDistinctPostes[$posteKey] = true;
            if (!isset($onlinePostesSet[$posteKey])) {
                $openSessionsOnOfflinePostes++;
            }
        }

        $occupiedOnline = isset($statutsOnline['oqp']) ? (int)$statutsOnline['oqp'] : 0;
        $occupancyRateOnline = $onlineTotal > 0 ? round(($occupiedOnline / $onlineTotal) * 100, 2) : 0.0;

        echo json_encode(array(
            'ok' => true,
            'action' => 'tempsreel',
            'parametres' => array(
                'tablePostes' => $tablePostesName,
                'tableSessions' => $tableSessionsName,
                'heartbeatTimeoutSeconds' => $heartbeatTimeout,
                'asof' => date('Y-m-d H:i:s')
            ),
            'resume' => array(
                'postes_total' => $totalPostes,
                'postes_en_ligne' => $onlineTotal,
                'postes_hors_ligne' => $offlineTotal,
                'sessions_ouvertes' => $openSessionsTotal,
                'postes_distincts_avec_session_ouverte' => count($openSessionsDistinctPostes),
                'sessions_ouvertes_sur_postes_hors_ligne' => $openSessionsOnOfflinePostes,
                'postes_occupes_en_ligne' => $occupiedOnline,
                'taux_occupation_postes_en_ligne' => $occupancyRateOnline
            ),
            'statuts_postes_en_ligne' => $statutsOnline,
            'statuts_postes_hors_ligne' => $statutsOffline
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'ok' => false,
            'error' => 'Erreur serveur lors du calcul des statistiques temps réel.'
        ));
    }
    exit();
}

// ---------------------------------------------------------------------------
// Endpoint utilisateur : sessions d'un username (pagination 25/page)
// ---------------------------------------------------------------------------
if ($action === 'utilisateur') {
    $username = isset($_GET['username']) ? strtolower(trim($_GET['username'])) : '';
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    if ($page < 1) { $page = 1; }
    $pageSize = 25;

    if ($username === '') {
        http_response_code(400);
        echo json_encode(array(
            'ok' => false,
            'error' => 'Paramètre username requis.'
        ));
        exit();
    }

    try {
        $sqlCount = "SELECT COUNT(*) FROM ".$tableSessionsName." WHERE LOWER(username) = :username";
        $reqCount = $bdd->prepare($sqlCount);
        $reqCount->execute(array(':username' => $username));
        $totalRows = (int)$reqCount->fetchColumn();
        $totalPages = $totalRows > 0 ? (int)ceil($totalRows / $pageSize) : 1;
        if ($page > $totalPages) {
            $page = $totalPages;
        }
        $offset = ($page - 1) * $pageSize;

        $sql = "
            SELECT
                id,
                poste,
                username,
                login,
                last_seen,
                logoff,
                ROUND(GREATEST(TIMESTAMPDIFF(SECOND, login, COALESCE(logoff, last_seen, NOW())), 0) / 60, 2) AS duree_min
            FROM ".$tableSessionsName."
            WHERE LOWER(username) = :username
            ORDER BY login DESC, id DESC
            LIMIT :limit OFFSET :offset
        ";

        $req = $bdd->prepare($sql);
        $req->bindValue(':username', $username, PDO::PARAM_STR);
        $req->bindValue(':limit', $pageSize, PDO::PARAM_INT);
        $req->bindValue(':offset', $offset, PDO::PARAM_INT);
        $req->execute();
        $rows = $req->fetchAll(PDO::FETCH_ASSOC);

        $donnees = array();
        foreach ($rows as $row) {
            $donnees[] = array(
                'id' => (int)$row['id'],
                'poste' => $row['poste'],
                'username' => $row['username'],
                'login' => $row['login'],
                'last_seen' => $row['last_seen'],
                'logoff' => $row['logoff'],
                'duree_min' => (float)$row['duree_min'],
                'session_ouverte' => $row['logoff'] === null
            );
        }

        echo json_encode(array(
            'ok' => true,
            'action' => 'utilisateur',
            'parametres' => array(
                'username' => $username,
                'page' => $page,
                'page_size' => $pageSize,
                'tableSessions' => $tableSessionsName
            ),
            'pagination' => array(
                'page' => $page,
                'page_size' => $pageSize,
                'total_rows' => $totalRows,
                'total_pages' => $totalPages,
                'has_prev' => $page > 1,
                'has_next' => $page < $totalPages
            ),
            'donnees' => $donnees
        ));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            'ok' => false,
            'error' => 'Erreur serveur lors du chargement des sessions utilisateur.'
        ));
    }
    exit();
}

$datedebut = isset($_GET['datedebut']) ? trim($_GET['datedebut']) : '';
$datefin   = isset($_GET['datefin'])   ? trim($_GET['datefin'])   : '';

// ---------------------------------------------------------------------------
// Résolution session académique (alternative à datedebut/datefin)
// Accepte : session=H|hiver, E|ete|été, A|automne + annee=YYYY
// ---------------------------------------------------------------------------
$sessionParam = isset($_GET['session']) ? strtolower(trim($_GET['session'])) : '';
$anneeParam   = isset($_GET['annee'])   ? (int)trim($_GET['annee'])           : 0;

if ($sessionParam !== '' && $anneeParam >= 2000 && $anneeParam <= 2100) {
    $sessionNorm = null;
    if ($sessionParam === 'h' || $sessionParam === 'hiver') {
        $sessionNorm = 'H';
        $datedebut = $anneeParam.'-01-01';
        $datefin   = $anneeParam.'-04-30';
    } elseif ($sessionParam === 'e' || $sessionParam === 'ete' || $sessionParam === 'été') {
        $sessionNorm = 'E';
        $datedebut = $anneeParam.'-05-01';
        $datefin   = $anneeParam.'-08-31';
    } elseif ($sessionParam === 'a' || $sessionParam === 'automne') {
        $sessionNorm = 'A';
        $datedebut = $anneeParam.'-09-01';
        $datefin   = $anneeParam.'-12-31';
    } else {
        http_response_code(400);
        echo json_encode(array(
            'ok'    => false,
            'error' => 'Valeur de session invalide. Utiliser H/hiver, E/ete ou A/automne.'
        ));
        exit();
    }
    $sessionParam = $sessionNorm;
} else {
    $sessionParam = null;
    // Valeurs par défaut si ni session ni dates fournies
    if ($datedebut === '') { $datedebut = date('Y-m-d'); }
    if ($datefin   === '') { $datefin   = $datedebut; }
}

$isValidDate = function ($value) {
    $dt = DateTime::createFromFormat('Y-m-d', $value);
    return $dt && $dt->format('Y-m-d') === $value;
};

if (!$isValidDate($datedebut) || !$isValidDate($datefin)) {
    http_response_code(400);
    echo json_encode(array(
        'ok' => false,
        'error' => 'Format de date invalide. Utiliser YYYY-MM-DD.'
    ));
    exit();
}

if ($datedebut > $datefin) {
    http_response_code(400);
    echo json_encode(array(
        'ok' => false,
        'error' => 'datedebut doit être inférieur ou égal à datefin.'
    ));
    exit();
}

// Validation explicite des actions statistiques (hors temps réel déjà traité).
if (($action !== 'parjour') && ($action !== 'parheure') && ($action !== 'parmois') && ($action !== 'parsemaine')) {
    http_response_code(400);
    echo json_encode(array(
        'ok' => false,
        'error' => 'Action non reconnue. Utiliser ?parjour, ?parheure, ?parmois, ?parsemaine ou ?action=parjour/parheure/parmois/parsemaine.'
    ));
    exit();
}

try {
    switch ($action) {
    // -----------------------------------------------------------------------
    // parjour : agrégation journalière (nb sessions + durées)
    // -----------------------------------------------------------------------
    case 'parjour':
        $sql = "
            SELECT
                DATE(login) AS jour,
                COUNT(*) AS nb_sessions,
                ROUND(AVG(GREATEST(TIMESTAMPDIFF(SECOND, login, COALESCE(logoff, last_seen, NOW())), 0)), 2) AS duree_moyenne_sec,
                ROUND(SUM(GREATEST(TIMESTAMPDIFF(SECOND, login, COALESCE(logoff, last_seen, NOW())), 0)), 2) AS duree_totale_sec
            FROM ".$tableSessionsName."
            WHERE login >= :datedebut
              AND login < DATE_ADD(:datefin, INTERVAL 1 DAY)
            GROUP BY DATE(login)
            ORDER BY jour ASC
        ";

        $req = $bdd->prepare($sql);
        $req->execute(array(
            ':datedebut' => $datedebut,
            ':datefin' => $datefin
        ));
        $rawRows = $req->fetchAll(PDO::FETCH_ASSOC);

        $rowsByDay = array();
        foreach ($rawRows as $row) {
            $jour = $row['jour'];
            $dureeMoyenneSec = (float)$row['duree_moyenne_sec'];
            $dureeTotaleSec = (float)$row['duree_totale_sec'];
            $rowsByDay[$jour] = array(
                'jour' => $jour,
                'nb_sessions' => (int)$row['nb_sessions'],
                'duree_moyenne_sec' => $dureeMoyenneSec,
                'duree_moyenne_min' => round($dureeMoyenneSec / 60, 2),
                'duree_totale_sec' => $dureeTotaleSec,
                'duree_totale_h' => round($dureeTotaleSec / 3600, 2)
            );
        }

        $rows = array();
        $current = DateTime::createFromFormat('Y-m-d', $datedebut);
        $end = DateTime::createFromFormat('Y-m-d', $datefin);
        while ($current <= $end) {
            $jourKey = $current->format('Y-m-d');
            if (isset($rowsByDay[$jourKey])) {
                $rows[] = $rowsByDay[$jourKey];
            } else {
                $rows[] = array(
                    'jour' => $jourKey,
                    'nb_sessions' => 0,
                    'duree_moyenne_sec' => 0.0,
                    'duree_moyenne_min' => 0.0,
                    'duree_totale_sec' => 0.0,
                    'duree_totale_h' => 0.0
                );
            }
            $current->modify('+1 day');
        }

        $sessionsTotal = 0;
        $dureeTotaleSec = 0.0;
        foreach ($rows as $row) {
            $sessionsTotal += $row['nb_sessions'];
            $dureeTotaleSec += $row['duree_totale_sec'];
        }

        $nbJours = count($rows);
        $dureeMoyennePondereeSec = $sessionsTotal > 0 ? round($dureeTotaleSec / $sessionsTotal, 2) : 0.0;

        echo json_encode(array(
            'ok' => true,
            'action' => 'parjour',
            'parametres' => array(
                'datedebut'     => $datedebut,
                'datefin'       => $datefin,
                'session'       => $sessionParam,
                'annee'         => $anneeParam ?: null,
                'tableSessions' => $tableSessionsName
            ),
            'resume' => array(
                'nb_jours' => $nbJours,
                'nb_sessions_total' => $sessionsTotal,
                'duree_totale_heures' => round($dureeTotaleSec / 3600, 2),
                'duree_moyenne_ponderee_min' => round($dureeMoyennePondereeSec / 60, 2)
            ),
            'donnees' => $rows
        ));
        break;

    // -----------------------------------------------------------------------
    // parheure : distribution des sessions par heure (00:00 -> 23:00)
    // -----------------------------------------------------------------------
    case 'parheure':
        $sql = "
            SELECT
                HOUR(login) AS heure,
                COUNT(*) AS nb_sessions,
                ROUND(AVG(GREATEST(TIMESTAMPDIFF(SECOND, login, COALESCE(logoff, last_seen, NOW())), 0)), 2) AS duree_moyenne_sec
            FROM ".$tableSessionsName."
            WHERE login >= :datedebut
              AND login < DATE_ADD(:datefin, INTERVAL 1 DAY)
            GROUP BY HOUR(login)
            ORDER BY heure ASC
        ";

        $req = $bdd->prepare($sql);
        $req->execute(array(
            ':datedebut' => $datedebut,
            ':datefin' => $datefin
        ));
        $rawRows = $req->fetchAll(PDO::FETCH_ASSOC);
        $rowsByHour = array();
        foreach ($rawRows as $row) {
            $hour = (int)$row['heure'];
            $rowsByHour[$hour] = array(
                'heure' => str_pad((string)$hour, 2, '0', STR_PAD_LEFT).':00',
                'nb_sessions' => (int)$row['nb_sessions'],
                'duree_moyenne_sec' => (float)$row['duree_moyenne_sec'],
                'duree_moyenne_min' => round(((float)$row['duree_moyenne_sec']) / 60, 2)
            );
        }

        $rows = array();
        for ($hour = 0; $hour < 24; $hour++) {
            if (isset($rowsByHour[$hour])) {
                $rows[] = $rowsByHour[$hour];
            } else {
                $rows[] = array(
                    'heure' => str_pad((string)$hour, 2, '0', STR_PAD_LEFT).':00',
                    'nb_sessions' => 0,
                    'duree_moyenne_sec' => 0.0,
                    'duree_moyenne_min' => 0.0
                );
            }
        }

        echo json_encode(array(
            'ok' => true,
            'action' => 'parheure',
            'parametres' => array(
                'datedebut'     => $datedebut,
                'datefin'       => $datefin,
                'session'       => $sessionParam,
                'annee'         => $anneeParam ?: null,
                'tableSessions' => $tableSessionsName
            ),
            'donnees' => $rows
        ));
        break;

    // -----------------------------------------------------------------------
    // parmois : agrégation mensuelle avec remplissage des mois manquants
    // -----------------------------------------------------------------------
    case 'parmois':
        $sql = "
            SELECT
                DATE_FORMAT(login, '%Y-%m') AS mois,
                COUNT(*) AS nb_sessions,
                ROUND(AVG(GREATEST(TIMESTAMPDIFF(SECOND, login, COALESCE(logoff, last_seen, NOW())), 0)), 2) AS duree_moyenne_sec,
                ROUND(SUM(GREATEST(TIMESTAMPDIFF(SECOND, login, COALESCE(logoff, last_seen, NOW())), 0)), 2) AS duree_totale_sec
            FROM ".$tableSessionsName."
            WHERE login >= :datedebut
              AND login < DATE_ADD(:datefin, INTERVAL 1 DAY)
            GROUP BY DATE_FORMAT(login, '%Y-%m')
            ORDER BY mois ASC
        ";

        $req = $bdd->prepare($sql);
        $req->execute(array(
            ':datedebut' => $datedebut,
            ':datefin' => $datefin
        ));
        $rawRows = $req->fetchAll(PDO::FETCH_ASSOC);

        $rowsByMonth = array();
        foreach ($rawRows as $row) {
            $mois = $row['mois'];
            $dureeMoyenneSec = (float)$row['duree_moyenne_sec'];
            $dureeTotaleSec = (float)$row['duree_totale_sec'];
            $rowsByMonth[$mois] = array(
                'mois' => $mois,
                'nb_sessions' => (int)$row['nb_sessions'],
                'duree_moyenne_sec' => $dureeMoyenneSec,
                'duree_moyenne_min' => round($dureeMoyenneSec / 60, 2),
                'duree_totale_sec' => $dureeTotaleSec,
                'duree_totale_h' => round($dureeTotaleSec / 3600, 2)
            );
        }

        $rows = array();
        $current = DateTime::createFromFormat('Y-m-d', substr($datedebut, 0, 7).'-01');
        $end = DateTime::createFromFormat('Y-m-d', substr($datefin, 0, 7).'-01');

        while ($current <= $end) {
            $moisKey = $current->format('Y-m');
            if (isset($rowsByMonth[$moisKey])) {
                $rows[] = $rowsByMonth[$moisKey];
            } else {
                $rows[] = array(
                    'mois' => $moisKey,
                    'nb_sessions' => 0,
                    'duree_moyenne_sec' => 0.0,
                    'duree_moyenne_min' => 0.0,
                    'duree_totale_sec' => 0.0,
                    'duree_totale_h' => 0.0
                );
            }
            $current->modify('+1 month');
        }

        echo json_encode(array(
            'ok' => true,
            'action' => 'parmois',
            'parametres' => array(
                'datedebut'     => $datedebut,
                'datefin'       => $datefin,
                'session'       => $sessionParam,
                'annee'         => $anneeParam ?: null,
                'tableSessions' => $tableSessionsName
            ),
            'donnees' => $rows
        ));
        break;

    // -----------------------------------------------------------------------
    // parsemaine : agrégation par jour de semaine (Lundi -> Dimanche)
    // -----------------------------------------------------------------------
    case 'parsemaine':
        $sql = "
            SELECT
                WEEKDAY(login) AS jour_semaine_idx,
                COUNT(*) AS nb_sessions,
                ROUND(AVG(GREATEST(TIMESTAMPDIFF(SECOND, login, COALESCE(logoff, last_seen, NOW())), 0)), 2) AS duree_moyenne_sec,
                ROUND(SUM(GREATEST(TIMESTAMPDIFF(SECOND, login, COALESCE(logoff, last_seen, NOW())), 0)), 2) AS duree_totale_sec
            FROM ".$tableSessionsName."
            WHERE login >= :datedebut
              AND login < DATE_ADD(:datefin, INTERVAL 1 DAY)
            GROUP BY WEEKDAY(login)
            ORDER BY jour_semaine_idx ASC
        ";

        $req = $bdd->prepare($sql);
        $req->execute(array(
            ':datedebut' => $datedebut,
            ':datefin' => $datefin
        ));
        $rawRows = $req->fetchAll(PDO::FETCH_ASSOC);

        $labels = array('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche');
        $rowsByDay = array();
        foreach ($rawRows as $row) {
            $idx = (int)$row['jour_semaine_idx'];
            $dureeMoyenneSec = (float)$row['duree_moyenne_sec'];
            $dureeTotaleSec = (float)$row['duree_totale_sec'];
            $rowsByDay[$idx] = array(
                'jour_semaine_idx' => $idx,
                'jour_semaine' => $labels[$idx],
                'nb_sessions' => (int)$row['nb_sessions'],
                'duree_moyenne_sec' => $dureeMoyenneSec,
                'duree_moyenne_min' => round($dureeMoyenneSec / 60, 2),
                'duree_totale_sec' => $dureeTotaleSec,
                'duree_totale_h' => round($dureeTotaleSec / 3600, 2)
            );
        }

        $rows = array();
        for ($idx = 0; $idx < 7; $idx++) {
            if (isset($rowsByDay[$idx])) {
                $rows[] = $rowsByDay[$idx];
            } else {
                $rows[] = array(
                    'jour_semaine_idx' => $idx,
                    'jour_semaine' => $labels[$idx],
                    'nb_sessions' => 0,
                    'duree_moyenne_sec' => 0.0,
                    'duree_moyenne_min' => 0.0,
                    'duree_totale_sec' => 0.0,
                    'duree_totale_h' => 0.0
                );
            }
        }

        echo json_encode(array(
            'ok' => true,
            'action' => 'parsemaine',
            'parametres' => array(
                'datedebut'     => $datedebut,
                'datefin'       => $datefin,
                'session'       => $sessionParam,
                'annee'         => $anneeParam ?: null,
                'tableSessions' => $tableSessionsName
            ),
            'donnees' => $rows
        ));

        break;

    default:
        http_response_code(400);
        echo json_encode(array(
            'ok' => false,
            'error' => 'Action non reconnue. Utiliser ?parjour, ?parheure, ?parmois, ?parsemaine ou ?action=parjour/parheure/parmois/parsemaine.'
        ));
        exit();
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        'ok' => false,
        'error' => 'Erreur serveur lors du calcul des statistiques.'
    ));
}
