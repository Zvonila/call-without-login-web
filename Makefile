dev-up:
	cmd.exe /c start cmd /k "npm run dev"
	cmd.exe /c start cmd /k "ngrok http http://127.0.0.1:5173"