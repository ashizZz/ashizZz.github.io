---
title: Zero-Logon
category: AD
tags: [Lateral Movement, Exploitation of Remote Services]
---
## NTDS Dumping
→ caused by a flaw in the cryptographic authentication scheme used by net logon Remote protocol(MS-NRPC) that causes authentication to be bypassed.

→ By bypassing an authentication token for specific Netlogon functionality, the attacker was able to call a function to set Domain controller password to a known value.

→ attacker can control the DC and steal the creds of all registered users on DC

![chart](/assets/img/AD/zerologon1.png)

→ sending large number of Netlogon messages in which various fields are filled with zeroes, an attacker can change the computer password of the domain controller that is stored in the Active Directory

## Exploitaion
![step1](/assets/img/AD/zerologon2.png)

![step2](/assets/img/AD/zerologon3.png)

![detection1](/assets/img/AD/zerologon4.png)

If the attacker was trying to authenticate or gaining the shell using wmiexec.py, the Security Event Log will generate EventID 4624 and display some information as shown below.

![detection2](/assets/img/AD/zerologon5.png)

## References
https://medium.com/mii-cybersec/zerologon-easy-way-to-take-over-active-directory-exploitation-c4b38c63a915

https://0xbandar.medium.com/detecting-the-cve-2020-1472-zerologon-attacks-6f6ec0730a9e

https://github.com/SecuraBV/CVE-2020-1472