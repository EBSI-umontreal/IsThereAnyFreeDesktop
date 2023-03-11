set fileShutdown=C:\Windows\Temp\IsThereAnyFreeDesktop_shutdown.txt
if exist %fileShutdown% del %fileShutdown% /f /q
schtasks /run /tn "IsThereAnyFreeDesktop"