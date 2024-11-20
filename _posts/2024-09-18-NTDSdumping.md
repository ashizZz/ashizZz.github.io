---
title: NTDS Dumping
category: AD
tags: [Attack Defense & Detection,Credential Access]
---
## NTDS Dumping
→ AD stores domain information in the NTDS.dit file which is located default in  %SystemRoot%\ntds\ on dc

→ file contains critical domain information such as password hashes for users

→ To gain access to th NTDS.dit file the attacker must already have administrator access in the enviroment

→ If attacker has access to the domain controller, they can exfiltrate the NTDS.dit file alongside the HKEY_LOCAL_MACHINE\SYSTEM registry hive, which contains all the information needed decrypt the NTDS.dit data.

→ Although Active Directory locks this file while running (disallowing any copy activities), an attacker can use the Volume Shadow Copy Service (VSS) to copy the volume and extract the NTDS.dit file from the snapshot. 

→  This using a diagnostic tool  Active Directory, NTDSUTil.exe

→ if an attacker has a set of valid credentials, they could leverage tools like Crackmapexec to dump NTDS.dit file remotely.

 → After exfiltration of NTDS.dit and HKLM\SYSTEM registry hive exfiltration offline attacks can perform.

![GetUserSPN](/assets/img/AD/NTDSdumping.png)