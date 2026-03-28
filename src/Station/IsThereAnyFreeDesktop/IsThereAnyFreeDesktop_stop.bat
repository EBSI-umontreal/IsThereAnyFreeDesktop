chcp 65001>nul
@echo off
setlocal enableExtensions enableDelayedExpansion
set fileLog=C:\Windows\Temp\IsThereAnyFreeDesktop.log
set fileShutdown=C:\Windows\Temp\IsThereAnyFreeDesktop_shutdown.txt
set debug=

set ServerURL=https://votresiteweb.com/IsThereAnyFreeDesktop/statut.php


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
copy nul %fileShutdown%
set stateCurrent=na
call :ScreenAndLog "ARRÊT"
call :sendStateToServer
goto :eof


REM https://stackoverflow.com/questions/503846/how-do-i-echo-and-send-console-output-to-a-file-in-a-bat-script
:ScreenAndLog
set message=%DATE% %TIME% - %~1
echo %message%
echo %message% | powershell -Command "$input | Out-File -FilePath '%fileLog%' -Append -Encoding UTF8"
goto :eof


:sendStateToServer
if defined debug (
	call :ScreenAndLog ":sendStateToServer - Expédition de la requête : %ServerURL%?poste=%COMPUTERNAME%&statut=%stateCurrent%"
)
curl -s --connect-timeout 5 "%ServerURL%?poste=%COMPUTERNAME%&statut=%stateCurrent%" >> %fileLog%
call :ScreenAndLog " "
goto :eof

:END
call :ScreenAndLog FIN
