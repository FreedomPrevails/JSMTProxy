# JSMTProxy
[![Telegram Channel](https://img.shields.io/badge/Channel-Telegram-blue.svg)](https://t.me/JSMTProxy)

High Performance NodeJS MTProto Proxy

### Latest Active MTProto Proxies: https://t.me/MTProxy

## Linux Installation

Install NodeJS, NPM, GIT and PM2 on your server:

### Debian & Ubuntu
```
$> apt-get install nodejs npm git
$> npm install pm2 -g
```
### CentsOS & RHEL
```
$> yum install nodejs npm git
$> npm install pm2 -g
```
Check the version of NodeJS, it should be version 6 or higher:
```
$> nodejs -v
v6.14.2
```
If it is lower than 6, you need to upgrade your linux OS or install nodejs from its website:
https://nodejs.org/en/download/

Clone repository on your server:
```
$> git clone https://github.com/FreedomPrevails/JSMTProxy.git
```
Enter JSMTProxy directory and edit config file (config.json) if you wish. You can change the secret and listening port. it is in json format.

    {
      "port":6969,
      "secret":"b0cbcef5a486d9636472ac27f8e11a9d"
    }
Start the app in cluster mode using pm2:
```
$> pm2 start mtproxy.js -i max
```
You can use pm2 to list running processes and check their logs:
```
$> pm2 list
$> pm2 log mtproxy
$> pm2 show mtproxy
```
## Windows Installation

Download and install NodeJS for Windows using this link: https://nodejs.org/dist/v8.11.2/node-v8.11.2-x64.msi

After installation is complete, enter "Command Prompt" and install PM2 by following command:
```
C:\> npm install pm2 -g
```
Download JSMTProxy using this link: https://github.com/FreedomPrevails/JSMTProxy/archive/master.zip

Extract the zip file into a new folder. Edit config.json (as explained above) if you wish to change port number or secret.

Start the proxy server from "Command Prompt" by following command:
```
C:\> pm2 start mtproxy.js -i max
```
**Note: You may need to open the proxy port number in your Windows firewall in order for it to accept connections.**



## License

MIT License

Copyright (c) 2018 JSMTProxy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
