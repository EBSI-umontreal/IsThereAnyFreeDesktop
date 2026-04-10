<?php
// Fichier d'exemple — copier vers LAB_stats_api_keys.php et remplacer les valeurs.
//
// Création d'une clé API (Windows PowerShell):
// $bytes = New-Object byte[] 24; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); [Convert]::ToBase64String($bytes).Replace('+','-').Replace('/','_').TrimEnd('=')
//
// Recommandation:
// - utiliser une chaîne aléatoire longue (au moins 24 octets avant encodage)
// - une clé différente par personne
// - remplacer immédiatement toute clé exposée
$statsApiKeys = array(
    'nom.personne' => 'remplacer-par-une-clé-longue-et-aléatoire'
);
$statsApiCookieName = 'itafd_stats_api_key';
$statsApiCookieTtlSeconds = 2592000; // 30 jours
