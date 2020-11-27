<?php
/*
IsThereAnyFreeDesktop
v.2.4 (20200506), Arnaud d’Alayer
https://creativecommons.org/licenses/by-nc/4.0/
*/
//require_once('CAS_authent.php');
require_once('LAB_config.php');

$PostesListe = "";//OUTPUT

try{
	//Obtenir la liste des postes dans la BD
	$req = $bdd->prepare("SELECT * FROM ".$table." ORDER BY poste;");
	$req->execute();
	$retour = $req->fetchAll();
	
	$count=count($retour);
	if ($count > 0) {
		$PostesListe.="<table class='table udem-table-colored'>\r\n";
		//$PostesListe.="<table border='1'>\r\n";
		//$PostesListe.="<table>\r\n";
		$PostesListe.="<tr><th>Poste</th><th>Commentaire</th><th>Statut</th></tr>\r\n";
		
		foreach ($retour as $poste){
			//Améliorer le résultat (au besoin ajouter des images, etc.)
			$PosteAdresse=strtoupper($poste['poste'].$LaboSuffixeAdresse);
			switch ($poste['statut']) {
				case "dispo":
					$PosteStatut="<span style='color:green'>Disponible</span>";
					$PosteStatut.="<br/>Se connecter&nbsp;: <a href='#' id='".$poste['poste']."' class='rdpwindows'>PC</a> | <a href='rdp://full%20address=s:$PosteAdresse:3389'>Mac</a>";
					break;
				case "oqp":
					$PosteStatut="<span style='color:red'>Occupé</span>";
					break;
				case "na":
					$PosteStatut="<span style='color:orange'>Non déterminé</span>";
					break;
			}
			//Construire ligne tableau (si le poste est réservé, ne l'afficher qu'à l'utilisateur concerné ou aux administrateurs)
			if ((!$poste['reserve']) or ($poste['reserve'] == $_SESSION['$codeDGTIC']) or $estAdmin) {
				$PostesListe.="<tr><td>".$PosteAdresse."</td><td>".$poste['commentaire']."</td><td>".$PosteStatut."</td></tr>\r\n";
			}
		}
		$PostesListe.="</table>\r\n";
	}
}
catch(Exception $e){
	$PostesListe.= "<p>Erreur avec la base de données. Si l'erreur persiste, veuillez <a href=mailto:'".$LaboContact."'>nous contacter.</p>";
}
header('Content-Type: text/html; charset=utf-8');
include 'IsThereAnyFreeDesktop.dwt';
?>