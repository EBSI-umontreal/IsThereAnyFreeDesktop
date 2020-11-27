<?php
/*
IsThereAnyFreeDesktop
v.2.3 (20200415), Arnaud d’Alayer
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
		//$PostesListe.="<table class='table udem-table-colored'>\r\n";
		$PostesListe.="<table border='1'>\r\n";
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
			//Construire ligne tableau
			$PostesListe.="<tr><td>".$PosteAdresse."</td><td>".$poste['commentaire']."</td><td>".$PosteStatut."</td></tr>\r\n";
		}
		$PostesListe.="</table>\r\n";
	}
}
catch(Exception $e){
	$PostesListe.= "<p>Erreur avec la base de données. Si l'erreur persiste, veuillez <a href=mailto:'".$LaboContact."'>nous contacter.</p>";
}
header('Content-Type: text/html; charset=utf-8');
//include 'D:\inetpub\cours\public_html\Templates\COURS-ressources-services_laboinfovirtuel.dwt';
?>
<!DOCTYPE html>
<html lang="fr-ca">
	<head>
		<meta charset="utf-8">
		<title><?php echo $LaboNom; ?></title>
		<script>
		//Onload sans JQuery
		document.addEventListener("DOMContentLoaded", function(event) { 
			
			//Ajouter événement onclick sur les liens RDP Windows
			var lienWindows = document.getElementsByClassName("rdpwindows");
			for (var i=0; i < lienWindows.length; i++) {
				lienWindows[i].onclick = function(){
					var poste = this.id,
					rdpfileContent = "full address:s:" + poste + ".fil.umontreal.ca",
					blob = new Blob([rdpfileContent], {type: "application/x-rdp"}),
					url = window.URL.createObjectURL(blob);
					
					this.href = url;
					this.target = '_blank';
					
					this.download = poste + '.rdp';
				}
			};
			
		});
		</script>
	</head>
	<body>
	<h1>Statut des postes</h1>
	<?php 
		echo $PostesListe;
	?>
  </body>
</html>