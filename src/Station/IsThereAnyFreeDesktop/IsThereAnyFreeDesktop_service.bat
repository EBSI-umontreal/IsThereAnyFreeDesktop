chcp 65001>nul
@echo off
setlocal enableExtensions enableDelayedExpansion
set fileLog=C:\Windows\Temp\IsThereAnyFreeDesktop.log
set fileShutdown=C:\Windows\Temp\IsThereAnyFreeDesktop_shutdown.txt
REM debug: 1 = activer logs détaillés, 0 = désactiver
set debug=0

REM Configuration du groupe RDP: utiliser RDPLocalGroup OU RDPLocalGroupSID
REM Si RDPLocalGroup est défini, il sera prioritaire. Sinon, on utilise RDPLocalGroupSID
REM set RDPLocalGroup=Utilisateurs du Bureau à distance
REM REM Ou utiliser directement le SID pour éviter les problèmes d'encodage (accent, langue)
set RDPLocalGroupSID=S-1-5-32-555
set RDPusers=domain\rdp-group
set ServerURL=https://votresiteweb.com/IsThereAnyFreeDesktop/statut.php
REM SendUsername: 1 = envoyer username, 0 = ne pas envoyer
set SendUsername=1

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
REM Résoudre le nom du groupe RDP local à partir du SID seulement si RDPLocalGroup n'est pas déjà défini
if not defined RDPLocalGroup (
	for /f "tokens=*" %%a in ('powershell -NoProfile -Command "(New-Object System.Security.Principal.SecurityIdentifier('%RDPLocalGroupSID%')).Translate([System.Security.Principal.NTAccount]).Value.Split([char]92)[-1]"') do set "RDPLocalGroup=%%a"
	if not defined RDPLocalGroup (
		for /f "tokens=*" %%a in ('powershell -NoProfile -Command "$g=Get-LocalGroup -SID ''%RDPLocalGroupSID%'' -ErrorAction SilentlyContinue; if($g){$g.Name}"') do set "RDPLocalGroup=%%a"
	)
)
if %debug%==1 call :ScreenAndLog "MAIN - Groupe RDP local resolu : %RDPLocalGroup%"

:LOOP
	REM ===== 1. Arrêter boucle si le poste est en train de s'éteindre =====
	if exist %fileShutdown% (
		call :ScreenAndLog "EXTINCTION EN COURS"
		goto END
	)
	
	REM ===== 2. Déterminer s'il faut activer ou désactiver le RDP =====
	
	REM 2.1 Déterminer le jour (lundi, mardi, etc.)
	REM https://serverfault.com/questions/94824/finding-day-of-week-in-batch-file-windows-server-2008
	set "dayNumber="
	for /f %%a in ('powershell -Command "$d = (Get-Date).DayOfWeek.value__; if ($d -eq 0) { 7 } else { $d }"') do set dayNumber=%%a
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
	if %debug%==1 (
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
	
	REM 3.2 Vérifier si une session est ouverte
	call :detectSessionInfo
	if "%stateCurrent%" NEQ "nordp" (
		if defined currentUser (call set stateCurrent=oqp)
	)
	
	REM 3.3 Si le statut change, on met à jour le fichier
	if NOT "%statePrevious%"=="%stateCurrent%" (
		call :ScreenAndLog "CHANGEMENT DE STATUT : %statePrevious% vers %stateCurrent%"
		REM call :sendStateToServer
		set statePrevious=%stateCurrent%
	)
	call :sendStateToServer
	
	REM ===== 4. Attendre avant de vérifier à nouveau l'état du poste =====
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
	if %debug%==1 call :ScreenAndLog ":rdpActivate - RDP est déjà actif = Ne rien faire"
) else (
	if %debug%==1 call :ScreenAndLog ":rdpActivate - RDP est inactif = Activer"
	if defined RDPLocalGroup (
		net localgroup "%RDPLocalGroup%" %RDPusers% /add >> %fileLog%
	) else (
		net localgroup "%RDPLocalGroupSID%" %RDPusers% /add >> %fileLog%
	)
	call set RDPactivated=1
)
goto :eof

:rdpDisable
call :rdpCheck
if %RDPactivated%==1 (
	if %debug%==1 call :ScreenAndLog ":rdpDisable - RDP est actif = Désactiver"
	if defined RDPLocalGroup (
		net localgroup "%RDPLocalGroup%" %RDPusers% /delete >> %fileLog%
	) else (
		net localgroup "%RDPLocalGroupSID%" %RDPusers% /delete >> %fileLog%
	)
	set "RDPactivated=0"
	call :rdpLogoff
) else (
	if %debug%==1 call :ScreenAndLog ":rdpDisable - RDP est déjà inactif = Ne rien faire"
)
goto :eof

:rdpCheck
set "RDPactivated=0"
if defined RDPLocalGroup (
	net localgroup "%RDPLocalGroup%" | findstr /c:"%RDPusers%" >nul && set "RDPactivated=1"
) else (
	net localgroup "%RDPLocalGroupSID%" | findstr /c:"%RDPusers%" >nul && set "RDPactivated=1"
)
if %debug%==1 (
	call :ScreenAndLog ":rdpCheck - RDP active? %RDPactivated%"
)
goto :eof

:rdpLogoff
REM Fermer uniquement les sessions RDP (rdp-tcp#...), jamais la console
if %debug%==1 call :ScreenAndLog ":rdpLogoff - Fermeture des sessions RDP actives/déconnectées"
for /f "tokens=1,2,3,4" %%A in ('query session 2^>nul ^| findstr /I "rdp-tcp#"') do (
	set "_sessionId="
	for %%Z in (%%B %%C) do (
		set "_candidate=%%Z"
		for /f "delims=0123456789" %%N in ("!_candidate!") do set "_candidate="
		if not defined _sessionId if defined _candidate set "_sessionId=!_candidate!"
	)
	if defined _sessionId (
		if %debug%==1 call :ScreenAndLog ":rdpLogoff - logoff session id !_sessionId!"
		logoff !_sessionId! >> %fileLog% 2>&1
	)
)
TIMEOUT 5 >nul
goto :eof

:sendStateToServer
if %SendUsername%==1 (
	if %debug%==1 (
		call :ScreenAndLog ":sendStateToServer %ServerURL%?poste=%COMPUTERNAME%&statut=%stateCurrent%&username=%currentUser%&session_type=%sessionType%"
	)
	curl -s --connect-timeout 5 -G "%ServerURL%" --data-urlencode "poste=%COMPUTERNAME%" --data-urlencode "statut=%stateCurrent%" --data-urlencode "username=%currentUser%" --data-urlencode "session_type=%sessionType%" >> %fileLog%
) else (
	if %debug%==1 (
		call :ScreenAndLog ":sendStateToServer %ServerURL%?poste=%COMPUTERNAME%&statut=%stateCurrent%&session_type=%sessionType%"
	)
	curl -s --connect-timeout 5 -G "%ServerURL%" --data-urlencode "poste=%COMPUTERNAME%" --data-urlencode "statut=%stateCurrent%" --data-urlencode "session_type=%sessionType%" >> %fileLog%
)
call :ScreenAndLog " "
goto :eof

:detectSessionInfo
REM Détection simple via quser: username + type de session (console/rdp)
set "currentUser="
set "sessionType=console"
for /f "tokens=1,2" %%a in ('quser 2^>nul ^| findstr /I " console rdp-tcp#"') do (
	set "currentUser=%%a"
	if "!currentUser:~0,1!"==">" set "currentUser=!currentUser:~1!"
	set "_sessionName=%%b"
	if /I "!_sessionName:~0,7!"=="rdp-tcp" set "sessionType=rdp"
	goto :detectSessionInfo_done
)
:detectSessionInfo_done
if %debug%==1 call :ScreenAndLog ":detectSessionInfo - Utilisateur detecte: %currentUser%"
if %debug%==1 call :ScreenAndLog ":detectSessionInfo - Type de session detecte: %sessionType%"
goto :eof

:END
call :ScreenAndLog FIN
