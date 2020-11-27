<?php
/*
IsThereAnyFreeDesktop
v.2.2 (20200326), Arnaud d’Alayer
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
		//$PostesListe.="<table class='table udem-table-colored'>";
		$PostesListe.="<table border='1'>";
		//$PostesListe.="<table>";
		$PostesListe.="<tr><th>Poste</th><th>Statut</th></tr>";
		
		foreach ($retour as $poste){
			//Améliorer le résultat (au besoin ajouter des images, etc.)
			$PosteAdresse=strtoupper($poste['poste'].$LabSuffixeAdresse);
			switch ($poste['statut']) {
				case "dispo":
					$PosteStatut="<span style='color:green'>Disponible</span>";
					$PosteStatut.="<br/>Se connecter&nbsp:<a href='fichierrdp.php?poste=".$poste['poste']."'>PC</a> | <a href='rdp://full%20address=s:$PosteAdresse:3389'>Mac</a>";
					break;
				case "oqp":
					$PosteStatut="<span style='color:red'>Occupé</span>";
					break;
				case "na":
					$PosteStatut="<span style='color:orange'>Non déterminé</span>";
					break;
			}
			//Construire ligne tableau
			$PostesListe.="<tr><td>".$PosteAdresse."</td><td>".$PosteStatut."</td></tr>";
		}
		$PostesListe.="</table>";
	}
}
catch(Exception $e){
	$PostesListe.= "<p>Erreur avec la base de données. Si l'erreur persiste, veuillez <a href=mailto:'".$LaboContact."'>nous contacter.</p>";
}
?>
<!DOCTYPE html>
<html lang="fr-ca">
  <head>
    <meta charset="utf-8">
    <title><?php echo $LaboNom; ?></title>
  </head>
  <body>
	<h1>Statut des postes</h1>
	<?php 
		echo $PostesListe;
	?>
  </body>
</html>