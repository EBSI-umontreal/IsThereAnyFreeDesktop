﻿<?php
//Version : 3.2 (20240715)
//BD MySQL
$pdo_options = array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8');
$BD = "IsThereAnyFreeDesktop";
$table = "IsThereAnyFreeDesktop";
$bdd = new PDO('mysql:host=localhost;dbname='.$BD, 'login', 'motdepasse', $pdo_options);

//Nom du département, faculté ou du laboratoire
$LaboNom = "votresiteweb - Laboratoire informatique virtuel";
$LaboSuffixeAdresse = ".votresiteweb.com";
$LaboContact = "votreadresse@votresiteweb.com";
?>
