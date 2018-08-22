# otaserver
Simple OverTheAir server for uploading a binaries for IoT devices, version 0.1.0

## How to use
Clone the repository

Pre-built files you can found in build folder

build\otaserver - Linux 32bit 

build\otaserver-64 - Linux 64bit

build\mac-otaserver - Mac 64bit

build\otaserver.exe - Windows 32bit

build\otaserver-64.exe - Windows 64bit

Usage:

otaserver [port] filename [-1]

port - local http port, defauilt is 82

filename - any file as OTA firmaware

-1 - stop the server after one download