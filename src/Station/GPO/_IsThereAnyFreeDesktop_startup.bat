chcp 65001>nul
set fileShutdown=C:\Windows\Temp\IsThereAnyFreeDesktop_shutdown.txt

REM Supprimer le fichier d'arrêt en boucle jusqu'à confirmation de suppression
:LOOP_DEL
if exist %fileShutdown% (
	del %fileShutdown% /f /q
	TIMEOUT /t 5 /nobreak >nul
	goto LOOP_DEL
)

schtasks /run /tn "IsThereAnyFreeDesktop"