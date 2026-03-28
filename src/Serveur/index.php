<?php
require_once('LAB_config.php');
//require_once('votreAuthentification.php');

$currentUserLogin = "";
$estAdmin = false;

// Si vous intégrez une authentification, peuplez ces 2 variables avant l'affichage:
// - $currentUserLogin : identifiant de l'utilisateur web authentifié
// - $estAdmin : true si l'utilisateur est administrateur, sinon false
//
//
//

//OUTPUT
$PostesListe = "";

try{
	$heartbeatTimeout = isset($heartbeatTimeoutSeconds) ? (int)$heartbeatTimeoutSeconds : 300;
	if ($heartbeatTimeout < 1) {
		$heartbeatTimeout = 300;
	}
	$tablePostesName = isset($tablePostes) ? $tablePostes : (isset($table) ? $table : 'IsThereAnyFreeDesktop');
	$tableSessionsName = isset($tableSessions) ? $tableSessions : 'sessions';

	$activeSessionsByPoste = array();
	try {
		$reqSessions = $bdd->prepare("SELECT s.poste, s.username FROM ".$tableSessionsName." s INNER JOIN (SELECT poste, MAX(login) AS max_login FROM ".$tableSessionsName." WHERE logoff IS NULL GROUP BY poste) os ON s.poste=os.poste AND s.login=os.max_login WHERE s.logoff IS NULL");
		$reqSessions->execute();
		$retourSessions = $reqSessions->fetchAll();
		foreach ($retourSessions as $session) {
			$activeSessionsByPoste[strtolower($session['poste'])] = strtolower($session['username']);
		}
	} catch (Exception $e) {
		$activeSessionsByPoste = array();
	}

	// Obtenir la liste des postes dans la BD (une seule liste)
	$req = $bdd->prepare("SELECT * FROM ".$tablePostesName." ORDER BY poste;");
	$req->execute();
	$retour = $req->fetchAll();
	
	$count = count($retour);
	if ($count > 0) {
		$PostesListe.="<table class='table udem-table-colored'>\r\n";
		$PostesListe.="<tr><th>Poste</th><th>Commentaire</th><th>Statut</th></tr>\r\n";
		
		foreach ($retour as $poste){
			$PosteAdresse = strtoupper($poste['poste'].$LaboSuffixeAdresse);
			$sessionOwner = isset($activeSessionsByPoste[strtolower($poste['poste'])]) ? $activeSessionsByPoste[strtolower($poste['poste'])] : '';
			$statutEffectif = $poste['statut'];
			$lastSeenTs = null;
			if (array_key_exists('last_seen', $poste) && !empty($poste['last_seen'])) {
				$lastSeenTs = strtotime($poste['last_seen']);
			}
			if ($lastSeenTs && ((time() - $lastSeenTs) > $heartbeatTimeout)) {
				$statutEffectif = 'timeout';
			}

			switch ($statutEffectif) {
				case "dispo":
					$PosteStatut="<span style='color:green'>Disponible</span>";
					$PosteStatut.="<br/><a href='#' id='".$poste['poste']."' class='rdpwindows'>Se connecter</a>";
					break;
				case "oqp":
					if (($sessionOwner !== '') && ($currentUserLoginLower !== '') && ($sessionOwner === $currentUserLoginLower)) {
						$PosteStatut="<span style='color:red'>Reprendre votre session</span>";
					} else {
						$PosteStatut="<span style='color:red'>Ce poste est occupé par une autre personne</span>";
					}
					if ($estAdmin && ($sessionOwner !== '')) {
						$PosteStatut.="<br/>Utilisateur actif : ".$sessionOwner;
					}
					$PosteStatut.="<br/><a href='#' id='".$poste['poste']."' class='rdpwindows'>Se connecter</a>";
					break;
				case "nordp":
					$PosteStatut="<span style='color:orange'>Accès désactivé</span>";
					break;
				case "na":
					$PosteStatut="<span style='color:orange'>Non déterminé</span>";
					break;
				case "timeout":
					if ($estAdmin) {
						if ($lastSeenTs) {
							$PosteStatut="<span style='color:orange'>Erreur</span><br/>Dernier tick : ".date('Y-m-d H:i:s', $lastSeenTs);
						} else {
							$PosteStatut="<span style='color:orange'>Erreur</span><br/>Dernier tick : inconnu";
						}
					}
					else{
						$PosteStatut="<span style='color:orange'>Indisponible</span>";
					}
					break;
				default:
					$PosteStatut="<span style='color:orange'>Non déterminé</span>";
					break;
			}
			// Construire ligne tableau (si le poste est réservé, ne l'afficher qu'à l'utilisateur concerné ou aux administrateurs)
			if (!$poste['reserve']) {
				$PostesListe.="<tr><td>".$PosteAdresse."</td><td>".$poste['commentaire']."</td><td>".$PosteStatut."</td></tr>\r\n";
			}
			else {
				if (($poste['reserve'] == $currentUserLogin) or $estAdmin) {
					$PostesListe.="<tr><td>".$PosteAdresse."</td><td>".$poste['commentaire']."</td><td>".$PosteStatut."</td></tr>\r\n";
				}
			}
		}
		$PostesListe.="</table>\r\n";
	}
}
catch(Exception $e){
	$PostesListe.= "<p>Erreur avec la base de données. Si l'erreur persiste, veuillez <a href=mailto:'".$LaboContact."'>nous contacter.</p>";
}
header('Content-Type: text/html; charset=utf-8');
require_once('IsThereAnyFreeDesktop.dwt');
?>