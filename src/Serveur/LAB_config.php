<?php
//Version : 4.0 (20260328)
//BD MySQL
$pdo_options = array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8');
$BD = "IsThereAnyFreeDesktop";
$tablePostes = "IsThereAnyFreeDesktop";
$tableSessions = "IsThereAnyFreeDesktop_sessions";
$table = $tablePostes; //garder, pour rétrocompatibilité
$heartbeatTimeoutSeconds = 300;

// Collecte des sessions (statistiques) : true = active, false = désactivée
$enableSessionCollection = true;

// Nom d'usager de remplacement si la collecte est active mais qu'aucun username n'est reçu
$anonymousSessionUsername = 'anonymous';

$bdd = new PDO('mysql:host=localhost;dbname='.$BD, 'login', 'motdepasse', $pdo_options);

//Nom du département, faculté ou du laboratoire
$LaboNom = "votresiteweb - Laboratoire informatique virtuel";
$LaboContact = "votreadresse@votresiteweb.com";
//Suffixe de l'adresse des postes à ajouter dans le fichier .rdp
$LaboSuffixeAdresse = ".votresiteweb.com";
?>
