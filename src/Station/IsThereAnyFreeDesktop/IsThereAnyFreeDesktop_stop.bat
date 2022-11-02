@echo off
setlocal enableExtensions enableDelayedExpansion
set fileLog=C:\Windows\Temp\IsThereAnyFreeDesktop.log
set fileShutdown=C:\Windows\Temp\IsThereAnyFreeDesktop_shutdown.txt
set debug=

set ServerURL=https://votresiteweb.com/IsThereAnyFreeDesktop/statut.php


:check_Permissions
REM V'rifier que le script est ex'cut' avec des droits d'administration
REM https://stackoverflow.com/questions/4051883/batch-script-how-to-check-for-admin-rights
net session >nul 2>&1
if NOT %errorLevel% == 0 (
	call :ScreenAndLog ":check_Permissions - Ce programme doit ^tre ex'cut' avec des droits d'administration"
	goto END
)


:MAIN
REM Param‚trage de d‚marrage
copy nul %fileShutdown%
set stateCurrent=na
call :ScreenAndLog "ARRÒT"
call :sendStateToServer
goto :eof


REM https://stackoverflow.com/questions/503846/how-do-i-echo-and-send-console-output-to-a-file-in-a-bat-script
:ScreenAndLog
set message=%DATE% %TIME% - %~1
echo %message% & echo %message% >> %fileLog%
goto :eof


:sendStateToServer
if defined debug (
	call :ScreenAndLog ":sendStateToServer - Exp'dition de la requ^te : %ServerURL%?poste=%COMPUTERNAME%&statut=%stateCurrent%"
)
curl -s --connect-timeout 5 "%ServerURL%?poste=%COMPUTERNAME%&statut=%stateCurrent%" >> %fileLog%
call :ScreenAndLog " "
goto :eof

:END
call :ScreenAndLog FIN