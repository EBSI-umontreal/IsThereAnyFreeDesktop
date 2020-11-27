-- phpMyAdmin SQL Dump
-- version 5.0.1
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost
-- Généré le : mer. 15 avr. 2020 à 01:54
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
  `statut` enum('dispo','oqp','na') NOT NULL DEFAULT 'dispo',
  `commentaire` text CHARACTER SET utf8
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Déchargement des données de la table `IsThereAnyFreeDesktop`
--

INSERT INTO `IsThereAnyFreeDesktop` (`poste`, `statut`, `commentaire`) VALUES
('test1', 'dispo', 'Acrobat Pro disponible'),
('test2', 'na', 'Employés seulement'),
('test3', 'oqp', NULL);

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `IsThereAnyFreeDesktop`
--
ALTER TABLE `IsThereAnyFreeDesktop`
  ADD PRIMARY KEY (`poste`(15));
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
