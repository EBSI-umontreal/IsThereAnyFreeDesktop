<?php
require_once('LAB_config.php');

$tablePostesName = isset($tablePostes) ? $tablePostes : (isset($table) ? $table : 'IsThereAnyFreeDesktop');
$tableSessionsName = isset($tableSessions) ? $tableSessions : 'sessions';
$enableSessionCollectionFlag = isset($enableSessionCollection) ? (bool)$enableSessionCollection : true;
$anonymousSessionUsernameValue = isset($anonymousSessionUsername) ? strtolower(trim((string)$anonymousSessionUsername)) : 'anonymous';
if ($anonymousSessionUsernameValue === '') {
	$anonymousSessionUsernameValue = 'anonymous';
}

$poste = strtolower($_GET['poste']);
$statut = strtolower($_GET['statut']);
$username = '';
if (isset($_GET['username'])) {
	$username = strtolower(trim($_GET['username']));
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
			$req = $bdd->prepare("UPDATE ".$tablePostesName." SET statut=:statut, last_seen=NOW() WHERE poste=:poste");
			$req->execute(array(':poste' => $poste, ':statut' => $statut));
		} catch (Exception $e) {
			$req = $bdd->prepare("UPDATE ".$tablePostesName." SET statut=:statut WHERE poste=:poste");
			$req->execute(array(':poste' => $poste, ':statut' => $statut));
		}

		if ($enableSessionCollectionFlag) {
			try {
				if ($statut === "oqp") {
					if ($username === '') {
						$username = $anonymousSessionUsernameValue;
					}

					$req = $bdd->prepare("UPDATE ".$tableSessionsName." SET logoff=NOW(), last_seen=NOW() WHERE poste=:poste AND logoff IS NULL AND username<>:username");
					$req->execute(array(':poste' => $poste, ':username' => $username));

					$req = $bdd->prepare("SELECT id FROM ".$tableSessionsName." WHERE poste=:poste AND username=:username AND logoff IS NULL ORDER BY login DESC LIMIT 1");
					$req->execute(array(':poste' => $poste, ':username' => $username));

					$session = $req->fetch();

					if ($session) {
						$req = $bdd->prepare("UPDATE ".$tableSessionsName." SET last_seen=NOW() WHERE id=:id");
						$req->execute(array(':id' => $session['id']));
					} else {
						$req = $bdd->prepare("INSERT INTO ".$tableSessionsName." (poste, username, login, last_seen, logoff) VALUES (:poste, :username, NOW(), NOW(), NULL)");
						$req->execute(array(':poste' => $poste, ':username' => $username));
					}
				} else {
					$req = $bdd->prepare("UPDATE ".$tableSessionsName." SET logoff=NOW(), last_seen=NOW() WHERE poste=:poste AND logoff IS NULL");
					$req->execute(array(':poste' => $poste));
				}
			} catch (Exception $e) {
				// La mécanique de statut doit rester fonctionnelle même si la table sessions n'est pas disponible.
			}
		}
		break;
	default :
		echo "Erreur : statut invalide";
		exit();
}
?>
