@echo off
setlocal enableExtensions enableDelayedExpansion
set fileLog=C:\Windows\Temp\IsThereAnyFreeDesktop.log
set fileShutdown=C:\Windows\Temp\IsThereAnyFreeDesktop_shutdown.txt
set debug=

set RDPLocalGroup="Utilisateurs du Bureau … distance"
set RDPusers=domain\rdp-group
set ServerURL=https://votresiteweb.com/IsThereAnyFreeDesktop/statut.php

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
REM V‚rifier que le script est ex‚cut‚ avec des droits d'administration
REM https://stackoverflow.com/questions/4051883/batch-script-how-to-check-for-admin-rights
net session >nul 2>&1
if NOT %errorLevel% == 0 (
	call :ScreenAndLog ":check_Permissions - Ce programme doit ˆtre ex‚cut‚ avec des droits d'administration"
	goto END
)


:MAIN
REM Param‚trage de d‚marrage
set statePrevious=startup
call :ScreenAndLog "DMARRAGE"
if exist %fileShutdown% del %fileShutdown% /f /q

:LOOP
	REM ===== 1. Arrˆter boucle si le poste est en train de s'‚teindre =====
	if exist %fileShutdown% (
		call :ScreenAndLog "EXTINCTION EN COURS"
		goto END
	)
	
	REM ===== 1. D‚terminer s'il faut activer ou d‚sactiver le RDP =====
	
	REM 2.1 D‚terminer le jour (lundi, mardi, etc.)
	REM https://serverfault.com/questions/94824/finding-day-of-week-in-batch-file-windows-server-2008
	set "dayNumber="
	for /f "skip=1" %%a in ('WMIC Path win32_LocalTime Get DayOfWeek') do if not defined dayNumber set dayNumber=%%a
	REM call set dayNumber=7
	REM D‚terminer l'heure et comparer avec l'heure du service
	call set startRDPTime=%%startRDPTime[%dayNumber%]%%
	call set endRDPTime=%%endRDPTime[%dayNumber%]%%
	
	REM 2.2 D‚terminer l'heure actuelle
	set "presentTime="
	for /f "skip=1 delims=." %%a in ('wmic OS get localdatetime') do if not defined presentTime set presentTime=%%a
	call set compareTime=%presentTime:~8,4%
	REM call set compareTime=0700
	REM DEBUG
	if defined debug (
		call :ScreenAndLog ":LOOP - Aujourd'hui nous sommes le jour %dayNumber%"
		call :ScreenAndLog ":LOOP - Horaire de fin du RDP : %endRDPTime%"
		call :ScreenAndLog ":LOOP - Horaire de d‚but du RDP : %startRDPTime%"
		call :ScreenAndLog ":LOOP - Actuellement il est %presentTime% : comparaison sur %compareTime%"
	)
	
	REM 2.3 D‚cision d'activer ou non le RDP et appeler la sous-routine associ‚e
	if %compareTime% GTR %startRDPTime% (
		call :rdpActivate
	) else (
		if %compareTime% GTR %endRDPTime% (
			call :rdpDisable
		) else (
			call :rdpActivate
		)
	)
	
	REM ===== 3. Informer le serveur de l'‚tat du poste =====
	REM 3.1 Commencer par l'‚tat du RDP
	if %RDPactivated%==1 (
		call set stateCurrent=dispo
	) else (
		call set stateCurrent=nordp
	)
	
	REM 3.2 Verifier si une session est ouverte : nous cherchons "console" (local) ou "rdp" (… distance) dans la sortie de la commande quser
	if "%stateCurrent%" NEQ "nordp" (
		quser | findstr /i "console rdp" >nul && (call set stateCurrent=oqp)
	)
	
	REM 3.3 Si le statut change, on met … jour le fichier
	if NOT "%statePrevious%"=="%stateCurrent%" (
		call :ScreenAndLog "CHANGEMENT DE STATUT : %statePrevious%  vers %stateCurrent%"
		call :sendStateToServer
		set statePrevious=%stateCurrent%
	)
	
	REM ===== 4. Attendre avant de verifier … nouveau l'‚tat du poste =====
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
	if defined debug call :ScreenAndLog ":rdpActivate - RDP est d‚j… actif = Ne rien faire"
) else (
	if defined debug call :ScreenAndLog ":rdpActivate - RDP est inactif = Activer"
	net localgroup %RDPLocalGroup% %RDPusers% /add >> %fileLog%
	call set RDPactivated=1
)
goto :eof

:rdpDisable
call :rdpCheck
if %RDPactivated%==1 (
	if defined debug call :ScreenAndLog ":rdpDisable - RDP est actif = D‚sactiver"
	net localgroup %RDPLocalGroup% %RDPusers% /delete >> %fileLog%
	call :rdpLogoff
) else (
	if defined debug call :ScreenAndLog ":rdpDisable - RDP est d‚j… inactif = Ne rien faire"
)
goto :eof

:rdpCheck
net localgroup %RDPLocalGroup% | findstr /c:"%RDPusers%" >nul && (call set RDPactivated=1) || (call set RDPactivated=0)
if defined debug (
	call :ScreenAndLog ":rdpCheck - Groupe local des utilisateurs … distance : "%RDPLocalGroup%""
	call :ScreenAndLog ":rdpCheck - Groupe des usagers autoris‚s … faire du RDP : %RDPusers%"
	call :ScreenAndLog ":rdpCheck - RDP activ‚? %RDPactivated%"
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
if defined debug (
	REM call :ScreenAndLog ":sendStateToServer - Exp‚dition de la requˆte : %ServerURL% ? poste=%COMPUTERNAME% &statut=%stateCurrent%"
	call :ScreenAndLog "%ServerURL%?poste=%COMPUTERNAME%-statut=%stateCurrent%"
)
curl -s --connect-timeout 5 "%ServerURL%?poste=%COMPUTERNAME%&statut=%stateCurrent%" >> %fileLog%
call :ScreenAndLog " "
goto :eof

:END
call :ScreenAndLog FIN