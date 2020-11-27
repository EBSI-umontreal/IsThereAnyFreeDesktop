<?php
/*
IsThereAnyFreeDesktop
v.2.2 (20200326), Arnaud d’Alayer
https://creativecommons.org/licenses/by-nc/4.0/
*/
//BD MySQL
$pdo_options[PDO::ATTR_ERRMODE] = PDO::ERRMODE_EXCEPTION;
$bdd = new PDO('mysql:host=localhost;dbname=IsThereAnyFreeDesktop', 'login', 'motdepasse', $pdo_options);
$table = "IsThereAnyFreeDesktop";

//Nom du département, faculté ou du laboratoire
$LaboNom = "votresiteweb - Laboratoire informatique virtuel";
$LaboSuffixeAdresse = ".votresiteweb.com";
$LaboContact = "votreadresse@votresiteweb.com";
?>
