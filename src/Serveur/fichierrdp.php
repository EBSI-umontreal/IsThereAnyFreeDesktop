<?php
/*
IsThereAnyFreeDesktop
v.2.2 (20200326), Arnaud d’Alayer
https://creativecommons.org/licenses/by-nc/4.0/
*/
//require_once('CAS_authent.php');
require_once('LAB_config.php');

$poste = strtolower($_GET['poste']);

if(!empty($poste)){
	header('Content-type: application/x-rdp');
	header('Content-Disposition: attachment; filename="'.$poste.'.rdp"');
	ob_clean();
	echo "full address:s:".$poste.$LabSuffixeAdresse;
}
?>
