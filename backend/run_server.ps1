$env:JAVA_HOME = "C:\Users\JARVIS\.jdks\openjdk-26.0.1"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
Set-Location -Path "d:\Documents\9th\Web\ExpenseTracker\ExpenseTracker\backend"
.\mvnw.cmd spring-boot:run
