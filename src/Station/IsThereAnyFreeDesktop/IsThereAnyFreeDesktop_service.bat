chcp 65001>nul
@echo off
setlocal enableExtensions enableDelayedExpansion
set fileLog=C:\Windows\Temp\IsThereAnyFreeDesktop.log
set fileShutdown=C:\Windows\Temp\IsThereAnyFreeDesktop_shutdown.txt
set debug=

set RDPLocalGroup="Utilisateurs du Bureau à distance"
set RDPusers=domain\rdp-group
set ServerURL=https://votresiteweb.com/IsThereAnyFreeDesktop/statut.php
REM SendUsername: 1 = envoyer username, 0 = ne pas envoyer
set /a SendUsername=1

REM 1=lundi, 2=mardi, etc.
set endRDPTime[1]=0800
set startRDPTime[1]=2200
set endRDPTime[2]=0800
set startRDPTime[2]=2200
set endRDPTime[3]=0800
set startRDPTime[3]=2200
set endRDPTime[4]=0800
set startRDPTime[4]=2200
set endRDPTime[5]=0800
set startRDPTime[5]=2200
set endRDPTime[6]=0000
set startRDPTime[6]=0000
set endRDPTime[7]=0000
set startRDPTime[7]=0000


:check_Permissions
REM Vérifier que le script est exécuté avec des droits d'administration
REM https://stackoverflow.com/questions/4051883/batch-script-how-to-check-for-admin-rights
net session >nul 2>&1
if NOT %errorLevel% == 0 (
	call :ScreenAndLog ":check_Permissions - Ce programme doit être exécuté avec des droits d'administration"
	goto END
)


:MAIN
REM Paramétrage de démarrage
set statePrevious=startup
call :ScreenAndLog "DÉMARRAGE"
if exist %fileShutdown% del %fileShutdown% /f /q

:LOOP
	REM ===== 1. Arrêter boucle si le poste est en train de s'éteindre =====
	if exist %fileShutdown% (
		call :ScreenAndLog "EXTINCTION EN COURS"
		goto END
	)
	
	REM ===== 1. Déterminer s'il faut activer ou désactiver le RDP =====
	
	REM 2.1 Déterminer le jour (lundi, mardi, etc.)
	REM https://serverfault.com/questions/94824/finding-day-of-week-in-batch-file-windows-server-2008
	set "dayNumber="
	for /f %%a in ('powershell -Command "(Get-Date).DayOfWeek.value__"') do set dayNumber=%%a
	REM call set dayNumber=7
	REM Déterminer l'heure et comparer avec l'heure du service
	call set startRDPTime=%%startRDPTime[%dayNumber%]%%
	call set endRDPTime=%%endRDPTime[%dayNumber%]%%
	
	REM 2.2 Déterminer l'heure actuelle
	set "presentTime="
	for /f %%a in ('powershell -Command "(Get-Date -Format yyyyMMddHHmmss)"') do set presentTime=%%a
	call set compareTime=%presentTime:~8,4%
	REM call set compareTime=0700
	REM DEBUG
	if defined debug (
		call :ScreenAndLog ":LOOP - Aujourd'hui nous sommes le jour %dayNumber%"
		call :ScreenAndLog ":LOOP - Horaire de fin du RDP : %endRDPTime%"
		call :ScreenAndLog ":LOOP - Horaire de début du RDP : %startRDPTime%"
		call :ScreenAndLog ":LOOP - Actuellement il est %presentTime% : comparaison sur %compareTime%"
	)
	
	REM 2.3 Décision d'activer ou non le RDP et appeler la sous-routine associée
	if %compareTime% GTR %startRDPTime% (
		call :rdpActivate
	) else (
		if %compareTime% GTR %endRDPTime% (
			call :rdpDisable
		) else (
			call :rdpActivate
		)
	)
	
	REM ===== 3. Informer le serveur de l'état du poste =====
	REM 3.1 Commencer par l'état du RDP
	if %RDPactivated%==1 (
		call set stateCurrent=dispo
	) else (
		call set stateCurrent=nordp
	)
	set "currentUser="
	call :detectCurrentUser
	
	REM 3.2 Verifier si une session est ouverte : nous cherchons "console" (local) ou "rdp" (à distance) dans la sortie de la commande quser
	if "%stateCurrent%" NEQ "nordp" (
		if defined currentUser (call set stateCurrent=oqp)
	)
	
	REM 3.3 Si le statut change, on met à jour le fichier
	if NOT "%statePrevious%"=="%stateCurrent%" (
		call :ScreenAndLog "CHANGEMENT DE STATUT : %statePrevious%  vers %stateCurrent%"
		REM call :sendStateToServer
		set statePrevious=%stateCurrent%
	)
	call :sendStateToServer
	
	REM ===== 4. Attendre avant de verifier à nouveau l'état du poste =====
	TIMEOUT 15
goto LOOP


REM https://stackoverflow.com/questions/503846/how-do-i-echo-and-send-console-output-to-a-file-in-a-bat-script
:ScreenAndLog
set message=%DATE% %TIME% - %~1
echo %message% & echo %message% >> %fileLog%
goto :eof


:rdpActivate
call :rdpCheck
if %RDPactivated%==1 (
	if defined debug call :ScreenAndLog ":rdpActivate - RDP est déjà actif = Ne rien faire"
) else (
	if defined debug call :ScreenAndLog ":rdpActivate - RDP est inactif = Activer"
	net localgroup %RDPLocalGroup% %RDPusers% /add >> %fileLog%
	call set RDPactivated=1
)
goto :eof

:rdpDisable
call :rdpCheck
if %RDPactivated%==1 (
	if defined debug call :ScreenAndLog ":rdpDisable - RDP est actif = Désactiver"
	net localgroup %RDPLocalGroup% %RDPusers% /delete >> %fileLog%
	call :rdpLogoff
) else (
	if defined debug call :ScreenAndLog ":rdpDisable - RDP est déjà inactif = Ne rien faire"
)
goto :eof

:rdpCheck
net localgroup %RDPLocalGroup% | findstr /c:"%RDPusers%" >nul && (call set RDPactivated=1) || (call set RDPactivated=0)
if defined debug (
	call :ScreenAndLog ":rdpCheck - Groupe local des utilisateurs à distance : "%RDPLocalGroup%""
	call :ScreenAndLog ":rdpCheck - Groupe des usagers autorisés à faire du RDP : %RDPusers%"
	call :ScreenAndLog ":rdpCheck - RDP activé? %RDPactivated%"
)
goto :eof

:rdpLogoff
REM Fermer toutes les sessions actives https://learn.microsoft.com/en-us/troubleshoot/windows-server/remote/log-off-terminal-server-session-users-command-prompt
if defined debug call :ScreenAndLog ":rdpLogoff - Fermeture des sessions actives"
query session >session.txt  
for /f "skip=2 tokens=3," %%i in (session.txt) DO logoff %%i  
del session.txt
TIMEOUT 15
goto :eof

:sendStateToServer
if defined debug call :ScreenAndLog ":sendStateToServer - SendUsername=%SendUsername%"
if %SendUsername% EQU 1 (
	if defined debug (
		call :ScreenAndLog "%ServerURL%?poste=%COMPUTERNAME%&statut=%stateCurrent%&username=%currentUser%"
	)
	curl -s --connect-timeout 5 -G "%ServerURL%" --data-urlencode "poste=%COMPUTERNAME%" --data-urlencode "statut=%stateCurrent%" --data-urlencode "username=%currentUser%" >> %fileLog%
) else (
	if defined debug (
		call :ScreenAndLog "%ServerURL%?poste=%COMPUTERNAME%&statut=%stateCurrent%"
	)
	curl -s --connect-timeout 5 -G "%ServerURL%" --data-urlencode "poste=%COMPUTERNAME%" --data-urlencode "statut=%stateCurrent%" >> %fileLog%
)
call :ScreenAndLog " "
goto :eof

:detectCurrentUser
set "currentUser="
for /f %%a in ('powershell -NoProfile -Command "$u=(Get-CimInstance Win32_ComputerSystem).UserName; if($u){$u.Split('\\')[-1]}"') do (
	set "currentUser=%%a"
	goto :detectCurrentUser_done
)
:detectCurrentUser_done
if defined currentUser if "!currentUser:~0,1!"==">" set "currentUser=!currentUser:~1!"
goto :eof

:END
call :ScreenAndLog FIN
