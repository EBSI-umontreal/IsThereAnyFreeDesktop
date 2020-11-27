<?php
require_once('LAB_config.php');

$poste = strtolower($_GET['poste']);
$statut = strtolower($_GET['statut']);

switch ($statut) {
	case "dispo":
	case "oqp":
	case "na":
		echo $poste."=>".$statut;
		$req = $bdd->prepare("UPDATE ".$table." SET statut=:statut WHERE poste=:poste");
		$req->execute(array(':poste' => $poste, ':statut' => $statut));
		break;
	default :
		echo "Erreur : statut invalide";
		exit();
}
?>
