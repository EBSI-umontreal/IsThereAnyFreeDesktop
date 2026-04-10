# IsThereAnyFreeDesktop
 Laboratoire virtuel via RDP

# Présentation
IsThereAnyFreeDesktop a été développé lors des confinements causés par la pandémie, et se veut être une solution à la fois simple, open source et libre de droits pour rendre disponible à distance les postes physiques d’un laboratoire informatique.

Il existe bien entendu de nombreuses autres solutions, comme reproduire cet environnement dans une infrastructure VDI ou DaaS qui gère déjà nativement la disponibilité des postes et l’attribution aléatoire de places dès qu'un usager accède au service. Cependant, l’objectif ici est de rendre disponible à distance une infrastructure déjà existante, à coût nul ou moindre.
Néanmoins, IsThereAnyFreeDesktop peut être déployé dans un environnement de postes virtuels ou hybride (postes physiques et virtuels).

Avec la fin du confinement, IsThereAnyFreeDesktop a évolué pour permettre de définir des plages durant lesquelles les postes sont disponibles à distance ou exclusivement en présentiel (ex. : accès à distance désactivé de 8h à 22h en semaine, et disponible 24/7 les fins de semaine).

# Principe de fonctionnement
IsThereAnyFreeDesktop repose sur 2 composantes :
* L’activation du Bureau à distance (RDP) sur les postes du laboratoire.
* Un site web sur lequel est affichée une liste des postes disponibles.
  ![démo](https://wiki.umontreal.ca/download/attachments/162472740/image2021-8-27_18-30-33.png?version=1&modificationDate=1630103285000&api=v2)

IsThereAnyFreeDesktop repose sur un environnement simple et très courant, c’est-à-dire :
* L’utilisation du langage PHP et d’une base de données MySQL pour le site web affichant la liste des postes.
* Un script Batch de "service" qui s’exécute en tâche de fond au démarrage du poste qui :
  * Renseigne périodiquement la base de données du statut du poste (disponible, occupé, ou indisponible).
  * Peuple ou dépeuple le groupe local « Utilisateurs du Bureau à distance » avec un groupe du domaine des utilisateurs autorisés à se connecter.

# Installation
## Serveur web
Pour l’installation sur votre serveur :
1. Décompressez le contenu du dossier `Serveur` dans l’emplacement de votre choix dans la structure de votre site web hébergé sur votre serveur.
2. Créez un compte utilisateur et une base de données dans MySQL (vous pouvez importer le fichier `INSTALL.sql` pour créer la structure de la table).
3. Ajoutez dans votre table les noms des postes de travail de votre laboratoire à rendre disponible sur le site web.
4. Configurez la ligne de connexion MySQL `$bdd` et les autres variables disponibles dans le fichier `LAB_config.php`.

### Paramètres de collecte (LAB_config.php)

Les paramètres suivants permettent de contrôler la collecte des statistiques :

* `$enableSessionCollection = true;`
  * `true` : collecte des sessions active (table `IsThereAnyFreeDesktop_sessions` utilisée).
  * `false` : aucune écriture dans la table de sessions (mode sans collecte statistique).
* `$anonymousSessionUsername = 'anonymous';`
  * Valeur utilisée quand la collecte est active, mais qu'aucun username n'est transmis par le poste client.

## Postes de travail
1.	Configurez les scripts du dossier `Station` :
    * `set ServerURL` (dans `IsThereAnyFreeDesktop_service.bat` et `IsThereAnyFreeDesktop_stop.bat`) : inscrivez l’URL vers le `statut.php` du serveur web.
    * `set RDPusers` (dans `IsThereAnyFreeDesktop_service.bat`) : le nom du groupe du domaine des utilisateurs autorisés à se connecter à ajouter dans le groupe standard `Utilisateurs du Bureau à distance`.
    * `set SendUsername` (dans `IsThereAnyFreeDesktop_service.bat`) :
      * `1` (par défaut) : envoie le username au serveur (`statut.php`).
      * `0` : n'envoie pas le username (protection de la vie privée côté poste).
    * `set RDPLocalGroup` (dans `IsThereAnyFreeDesktop_service.bat`) : si vous utilisez des postes dans une autre langue que le français, inscrivez le nom du groupe équivalent à `Utilisateurs du Bureau à distance`.
    * `set endRDPTime[i]` et `set startRDPTime[i]` (dans `IsThereAnyFreeDesktop_service.bat`) : 
      *	inscrivez l’heure de fin et de début de l’accès à distance pour l’accès exclusif en présentiel dans le format `hhmm`, où `hh` est en format 24h (ex. `2200`). 
        Pour les postes disponibles 24/24, mettre la même date (ex. 0000).
      * Et où `i` est le numéro du jour (1=lundi, 2=mardi).
2. Sur chaque poste :
    1. Activez le service Bureau à distance.
    2. Copiez les scripts configurés précédemment dans un dossier des postes (ex. `C:\program files (x86)\IsThereAnyFreeDesktop`).
    3. Inscrivez le script Batch de "service" dans le Planificateur de tâche à l’aide du script `_install.bat`.
    4. Activez les scripts événementiels via les GPO domaine ou local (`gpedit.msc`) suivants :
       * Si ce n’est déjà fait, [désactivez le délai pour l’exécution des scripts](https://learn.microsoft.com/en-US/troubleshoot/windows-client/group-policy/logon-scripts-not-run-for-long-time).
       * `Configuration de l'ordinateur\Paramètres Windows\Scripts (démarrage/arrêt)\Démarrage` : exécuter `_IsThereAnyFreeDesktop_startup.bat`.
       * `Configuration de l'ordinateur\Paramètres Windows\Scripts (démarrage/arrêt)\Arrêt du système` : exécuter `_IsThereAnyFreeDesktop_shutdown.bat`.

Quelques recommandations supplémentaires, mais facultatives :
1. Mettez en place un mécanisme pour fermer automatiquement les sessions abandonnées, par exemple avec [Lithnet Idle Logoff](https://github.com/lithnet/idle-logoff).
2. Mettez en place un mécanisme pour redémarrer les postes éteints (Wake-On-Lan ou [planifiez un démarrage automatique par le BIOS sur les appareils HP](https://4sysops.com/archives/pushing-hp-bios-settings-and-updates-with-sccm/)).
3. Configurez le menu Démarrer pour masquer les options `Arrêter`, `Redémarrer` et `Déconnecter` (pour ne laisser que l’option de fermeture de session `Se déconnecter`). Par GPO, ces modifications correspondent aux options suivantes :
    1. `Configuration de l’ordinateur\Modèles d’administration\Menu Démarrer et barre des tâches\Supprimer et empêcher l’accès aux commandes Arrêter, Redémarrer, Mettre en veille et Mettre en veille prolongée`.
    2. `Configuration de l’ordinateur\Modèles d’administration\Composants Windows\Services Bureau à distance\Hôte de la session Bureau à distance\Environnement de session à distance\Supprimer l’élément « Déconnecter » de la boite de dialogue Arrêt`.

## Mise à niveau pour la version 4.0

Si vous aviez déjà une installation précédente **et souhaitez activer/profiter du module de statistiques v4**, exécutez les étapes suivantes (en adaptant les noms de la base et des tables si nécessaire).

Si vous utilisez uniquement l'affichage de disponibilité (sans statistiques), le code reste compatible avec une base de données de type v3.x grâce aux garde-fous intégrés.

### 1) Ajouter le champ `last_seen` sur la table `IsThereAnyFreeDesktop`
* Le champ `last_seen` améliore la détection des postes hors ligne (heartbeat). Sans ce champ, l'affichage reste fonctionnel mais avec une détection moins fine.

```sql
ALTER TABLE IsThereAnyFreeDesktop
  ADD COLUMN last_seen DATETIME NULL AFTER statut,
  ADD INDEX idx_postes_last_seen (last_seen);

UPDATE IsThereAnyFreeDesktop
SET last_seen = NOW()
WHERE last_seen IS NULL;
```

### 2) Créer ou mettre à niveau la table `IsThereAnyFreeDesktop_sessions`

Si la table n'existe pas encore, créez-la avec la structure complète ci-dessous (incluant `session_type`) :

```sql
CREATE TABLE IF NOT EXISTS IsThereAnyFreeDesktop_sessions (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  poste varchar(64) NOT NULL,
  username varchar(128) NOT NULL,
  login datetime NOT NULL,
  last_seen datetime NOT NULL,
  logoff datetime DEFAULT NULL,
  session_type enum('console','rdp') NOT NULL DEFAULT 'console',
  PRIMARY KEY (id),
  KEY idx_sessions_poste (poste),
  KEY idx_sessions_username (username),
  KEY idx_sessions_login (login),
  KEY idx_sessions_logoff (logoff),
  KEY idx_sessions_username_login (username, login),
  KEY idx_sessions_poste_login (poste, login),
  KEY idx_sessions_open (poste, logoff),
  KEY idx_sessions_type (session_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

Si la table existe déjà (mise à niveau d'une installation antérieure), ajoutez le champ et son index :

```sql
ALTER TABLE IsThereAnyFreeDesktop_sessions
  ADD COLUMN session_type enum('console','rdp') NOT NULL DEFAULT 'console' AFTER logoff,
  ADD INDEX idx_sessions_type (session_type);
```

### 3) Redéployer le script côté postes

Redéployez aussi `IsThereAnyFreeDesktop_service.bat` sur les postes afin d'utiliser les nouveaux paramètres client, dont l'expédition du username.

Dans le script, le paramètre suivant contrôle l'envoi du username :

* `set SendUsername=1` : envoi du username au serveur (`statut.php`).
* `set SendUsername=0` : aucun username envoyé (mode vie privée).

### 4) Activer la collecte
Si `$enableSessionCollection = false` (dans `LAB_config.php`), la table `IsThereAnyFreeDesktop_sessions` n'est pas utilisée.


## Réseau (VPN)
Cette étape consiste à vous assurer que votre réseau permettra à vos utilisateurs de rejoindre les postes de travail dans votre intranet, par exemple à l’aide d’une connexion sécurisée VPN.

## Documentation pour les utilisateurs
Vous pouvez vous inspirer de la [documentation à l'intention de nos utilisateurs](https://wiki.umontreal.ca/display/EBSI/Laboratoire+d%27informatique+virtuel).

# Nous remercier?
Ce projet vous a été utile et vous souhaitez nous remercier? [Contribuez aux Bourses aux étudiants de l'EBSI ou au fonds des Amis de l'EBSI](https://ebsi.umontreal.ca/vous-etes/donateur/). Merci à l’avance!

# Remerciements
Merci aux différentes personnes qui ont apporté des corrections de bogues et idées à intégrer au projet : Simon Lefrançois (FAS, géographie), Djamel Hadjeres (Faculté de médecine), etc.

# Licence
https://creativecommons.org/licenses/by-nc/4.0/