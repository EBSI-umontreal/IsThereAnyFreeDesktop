IF "%PROCESSOR_ARCHITEW6432%"=="" GOTO native
%SystemRoot%\Sysnative\cmd.exe /c %0 %*
exit
:native
SET defaultUserFolder=%SystemDrive%\Users\Default


REM ************** INSTALL/UNINSTALL **************
REM ## INSTALL/UNINSTALL PROGRAM ##
MKDIR "%PROGRAMFILES(X86)%\EBSI\IsThereAnyFreeDesktop"
ROBOCOPY "%~dp0IsThereAnyFreeDesktop" "%PROGRAMFILES(X86)%\EBSI\IsThereAnyFreeDesktop" /mir

COPY "%~dp0GPO\_IsThereAnyFreeDesktop_shutdown.bat" "%WINDIR%\System32\GroupPolicy\Machine\Scripts\Shutdown\scripts" /Y
COPY "%~dp0GPO\_IsThereAnyFreeDesktop_startup.bat" "%WINDIR%\System32\GroupPolicy\Machine\Scripts\Startup\scripts" /Y

REM ## ADJUSTMENTS ##


REM ## STARTMENU ##


REM ******************** FILES ********************


REM **************** HKLM REGISTRY ****************


REM ************ DEFAULT USER REGISTRY ************
