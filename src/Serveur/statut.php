<?php
require_once('LAB_config.php');

$poste   = strtolower($_GET['poste']);
$statut  = strtolower($_GET['statut']);
$username = isset($_GET['username']) ? strtolower(trim($_GET['username'])) : '';
$session_type = isset($_GET['session_type']) ? strtolower(trim($_GET['session_type'])) : 'console';
if (!in_array($session_type, array('console', 'rdp'))) {
	$session_type = 'console';
}

switch ($statut) {
	case "dispo":
	case "oqp":
	case "nordp":
	case "na":
		echo $poste."=>".$statut;
		if ($username !== '') {
			echo "=>".$username;
		}
		try {
			$bdd->prepare("UPDATE $tablePostes SET statut=:statut, last_seen=NOW() WHERE poste=:poste")
				->execute([':poste' => $poste, ':statut' => $statut]);

			if ($enableSessionCollection) {
				if ($statut === "oqp" || ($statut === "nordp" && $username !== '')) {
					if ($username === '') {
						$username = $anonymousSessionUsername;
					}
					// Fermer toute session ouverte d'un autre utilisateur sur ce poste
					$bdd->prepare("UPDATE $tableSessions SET logoff=last_seen WHERE poste=:poste AND logoff IS NULL AND username<>:username")
						->execute([':poste' => $poste, ':username' => $username]);

					$req = $bdd->prepare("SELECT id FROM $tableSessions WHERE poste=:poste AND username=:username AND logoff IS NULL ORDER BY login DESC LIMIT 1");
					$req->execute([':poste' => $poste, ':username' => $username]);
					$session = $req->fetch();

					if ($session) {
						$bdd->prepare("UPDATE $tableSessions SET last_seen=NOW(), session_type=:session_type WHERE id=:id")
							->execute([':id' => $session['id'], ':session_type' => $session_type]);
					} else {
						$bdd->prepare("INSERT INTO $tableSessions (poste, username, login, last_seen, logoff, session_type) VALUES (:poste, :username, NOW(), NOW(), NULL, :session_type)")
							->execute([':poste' => $poste, ':username' => $username, ':session_type' => $session_type]);
					}
				} else {
					// Poste libre ou nordp sans username : fermer les sessions ouvertes
					$bdd->prepare("UPDATE $tableSessions SET logoff=last_seen WHERE poste=:poste AND logoff IS NULL")
						->execute([':poste' => $poste]);
				}
			}
		} catch (Exception $e) {
			// Silencieux : le statut doit rester fonctionnel même si la BD est indisponible.
		}
		break;
	default:
		echo "Erreur : statut invalide";
		exit();
}
?>
