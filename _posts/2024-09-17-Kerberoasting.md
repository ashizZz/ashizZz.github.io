---
title: Active Dictory:- Kerberoasting
category: AD
tags: [Attack Defense & Detection]
---
## kerberoasting
→ Post-exploitation attack technique that is used to obtain a password hash of an AD account that has **servicePrincipalName(SPN)** value.

→ SPNs are used to identify services and applications.

→ SPNs are registered to user or computer accounts known as service accounts.

→ typically granted the least privilege necessary to perform their function

→ When a client requests a service from a server, it uses the SPN to locate the service account associated with the service.

→ **The client then authenticates itself to the service using the stored credentials of the service account**, which are represented as **a password hash** within Active Directory.

→ a vulnerability that arises in the handling of Service Principal Names (SPNs) and Ticket Granting Service (TGS) tickets within the Kerberos authentication protocol.

→ **allows attackers to manipulate the SPN value associated with a service account and subsequently request a TGS ticket for that account**

→ As a result, the TGS ticket, which is encrypted with the password hash of the service account assigned to the requested SPN, becomes the prime target for the attacker.

-   In a Kerberos setup, when a user accesses a resource tied to a **Service Principal Name (SPN)**, the **Domain Controller (DC)** generates a **Service Ticket (ST)**.
-   The ST is **encrypted with the SPN's password hash**, and the application server decrypts it to authenticate the user.
-   If a **service ticket request** is initiated from the **Domain Controller** itself, the system does **not check** if the user has permission to access the resource.
-   Attackers can exploit this by requesting a **service ticket** for a known **SPN** from the Domain Controller.
-   The DC returns an ST **encrypted with the SPN's password hash**, regardless of whether the attacker has access to the service.
-   Tools like **Impacket’s GetUserSPNs** help attackers automate the process of requesting tickets for multiple SPNs.
-   This method, called a **Kerberoasting attack**, allows attackers to gather STs and attempt to **crack the SPN's password hash offline** to gain access to service accounts.

# Enumerate the MSSQL servers

Finding out users with an SPN on an MSSQL server

`GetUserSPNs.py north.sevenkingdoms.local/brandon.stark:iseedeadpeople`

![GetUserSPN](/assets/img/AD/kerboroasting1.png)


On essos domain

`GetUserSPNs.py -target-domain essos.local north.sevenkingdoms.local/brandon.stark:iseedeadpeople`

![GetUserSPN2](/assets/img/AD/kerboroasting2.png)

![RequestServiceTicket](/assets/img/AD/kerboroasting1.png)




## Detection

→ account name is not a service or machine account (ends with $)

→ any normal domain user account( this would be the account which is compromised and from the attacker performed this attack

→ service names that do not ends with $

→ ticket encryption type will be 0x17 which is RC4 encryption allowing attackers to crack easily

→event Id 4769 → exclude service name ends with $

## References
https://medium.com/@jbtechmaven/active-directory-kerberoasting-2da87bdd98dd#:~:text=Kerberoasting%20is%20an%20attack%20method,service%20to%20a%20user%20account

https://www.picussecurity.com/resource/blog/kerberoasting-attack-explained-mitre-attack-t1558.003

https://www.hackthebox.com/blog/kerberoasting-attack-detection