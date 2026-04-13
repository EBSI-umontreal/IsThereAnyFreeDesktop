chcp 65001>nul
@echo off
setlocal enableExtensions enableDelayedExpansion
set fileLog=C:\Windows\Temp\IsThereAnyFreeDesktop.log
set fileShutdown=C:\Windows\Temp\IsThereAnyFreeDesktop_shutdown.txt


:check_Permissions
REM Vérifier que le script est exécuté avec des droits d'administration
REM https://stackoverflow.com/questions/4051883/batch-script-how-to-check-for-admin-rights
net session >nul 2>&1
if NOT %errorLevel% == 0 (
	call :ScreenAndLog ":TaskScheduler - Ce programme doit être exécuté avec des droits d'administration"
	goto END
)


:MAIN
CD "%PROGRAMFILES(X86)%\EBSI\IsThereAnyFreeDesktop"


:LOOP
if exist %fileShutdown% (
	call :ScreenAndLog ":TaskScheduler - Le poste s'éteint"
	goto END
) else (
	call :ScreenAndLog ":TaskScheduler - Démarrage"
	START /WAIT CMD.EXE /C IsThereAnyFreeDesktop_service.bat
	call :ScreenAndLog ":TaskScheduler - La tache s'est arrêtée"
	TIMEOUT 15
	goto LOOP
)


REM https://stackoverflow.com/questions/503846/how-do-i-echo-and-send-console-output-to-a-file-in-a-bat-script
:ScreenAndLog
set message=%DATE% %TIME% - %~1
echo %message%
echo %message% | powershell -Command "$input | Out-File -FilePath '%fileLog%' -Append -Encoding UTF8"
goto :eof


:END
