@echo off
setlocal enableExtensions enableDelayedExpansion
set fileLog=C:\Windows\Temp\IsThereAnyFreeDesktop.log
set fileShutdown=C:\Windows\Temp\IsThereAnyFreeDesktop_shutdown.txt
set debug=


:check_Permissions
REM V‚rifier que le script est ex‚cut‚ avec des droits d'administration
REM https://stackoverflow.com/questions/4051883/batch-script-how-to-check-for-admin-rights
net session >nul 2>&1
if NOT %errorLevel% == 0 (
	call :ScreenAndLog ":TaskScheduler - Ce programme doit ˆtre ex‚cut‚ avec des droits d'administration"
	goto END
)


:MAIN
CD "%PROGRAMFILES(X86)%\EBSI\IsThereAnyFreeDesktop"


:LOOP
if exist %fileShutdown% (
	call :ScreenAndLog ":TaskScheduler - Le poste s'‚teint"
	goto END
) else (
	call :ScreenAndLog ":TaskScheduler - D‚marrage"
	START /WAIT CMD.EXE /C IsThereAnyFreeDesktop_service.bat
	call :ScreenAndLog ":TaskScheduler - La tache s'est arrˆt‚e"
	TIMEOUT 15
	goto LOOP
)


REM https://stackoverflow.com/questions/503846/how-do-i-echo-and-send-console-output-to-a-file-in-a-bat-script
:ScreenAndLog
set message=%DATE% %TIME% - %~1
echo %message% & echo %message% >> %fileLog%
goto :eof


:END
