-- phpMyAdmin SQL Dump
-- version 5.0.1
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost
-- Généré le : mer. 06 mai 2020 à 17:38
-- Version du serveur :  5.6.47-log
-- Version de PHP : 7.4.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `IsThereAnyFreeDesktop`
--

-- --------------------------------------------------------

--
-- Structure de la table `IsThereAnyFreeDesktop`
--

CREATE TABLE `IsThereAnyFreeDesktop` (
  `poste` text NOT NULL,
  `statut` enum('dispo','oqp','nordp','na') NOT NULL DEFAULT 'dispo',
  `last_seen` datetime DEFAULT NULL,
  `reserve` text,
  `commentaire` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Déchargement des données de la table `IsThereAnyFreeDesktop`
--

INSERT INTO `IsThereAnyFreeDesktop` (`poste`, `statut`, `last_seen`, `reserve`, `commentaire`) VALUES
('test1', 'dispo', NOW(), NULL, 'Acrobat Pro disponible'),
('test2', 'na', NOW(), NULL, 'Employés seulement'),
('test3', 'oqp', NOW(), NULL, NULL),
('test4', 'oqp', NOW(), 'dalayera', 'Poste réservé pour Arnaud d\'Alayer');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `IsThereAnyFreeDesktop`
--
ALTER TABLE `IsThereAnyFreeDesktop`
  ADD PRIMARY KEY (`poste`(15)),
  ADD KEY `idx_postes_last_seen` (`last_seen`);

-- --------------------------------------------------------

--
-- Structure de la table `IsThereAnyFreeDesktop_sessions`
--

CREATE TABLE `IsThereAnyFreeDesktop_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `poste` varchar(64) NOT NULL,
  `username` varchar(128) NOT NULL,
  `login` datetime NOT NULL,
  `last_seen` datetime NOT NULL,
  `logoff` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sessions_poste` (`poste`),
  KEY `idx_sessions_username` (`username`),
  KEY `idx_sessions_login` (`login`),
  KEY `idx_sessions_logoff` (`logoff`),
  KEY `idx_sessions_username_login` (`username`,`login`),
  KEY `idx_sessions_poste_login` (`poste`,`login`),
  KEY `idx_sessions_open` (`poste`,`logoff`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
