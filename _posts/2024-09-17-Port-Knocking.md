---
title: Traffic Signaling:- Port Knocking - Hidden Security or Overlooked Threat?
category: Persistence
tags: [Traffic Signaling (T1205.001)]
---

Port knocking is a stealthy network security technique designed to shield services like SSH from unauthorized access and routine port scans. By requiring a predefined sequence of connection attempts to specific ports, it acts as a covert "key" to unlock access, effectively obscuring sensitive services from prying eyes. While often used by administrators to add an extra layer of security, adversaries have also adopted port knocking to conceal malicious activities such as persistence and command-and-control (C2) communication. This blog delves into the mechanics of port knocking, its security implications, and how it can both protect and potentially compromise systems. Here’s how port knocking works, with a focus on how it can be used by adversaries for maintaining covert access:
 
 ## Step Involves 
 

**1. All Ports Initially Closed**

***Adversary Use:***

The system starts with all ports closed to the outside world, making it difficult for the attacker to detect which services are running. To bypass this, the adversary would use port knocking to probe the system covertly. They may attempt to discover the correct sequence of port knocks, either by brute-forcing or gathering intelligence from other sources. If they know the port knocking sequence, they can dynamically open access to critical services (e.g., SSH), maintaining a hidden presence.




**Security Use:**

All ports being closed is a fundamental security measure to make the system invisible to network scans. This provides an initial defense layer against automated attacks like port scanning and reduces the attack surface by hiding services from potential adversaries. For example, SSH access might be hidden from routine scans, making it harder for unauthorized users to gain access.


***2. Knock Sequence Initiated***

***Adversary Use:***

The adversary begins the attack by sending a series of connection attempts (the “knocks”) to a specific set of closed ports. This sequence is often a secret key embedded within the attacker's malware or script. If the attacker is unaware of the correct sequence, they might resort to brute-forcing the knocks, attempting many combinations of port connections to unlock the target system.

In sophisticated attacks, adversaries may also use social engineering or insider information to discover the correct knock sequence, enabling them to gain access with minimal detection.

  

***Security Use:***

For defenders, the use of port knocking is a method to control who can access the system and when. By requiring a secret knock sequence to open a port, port knocking can help secure sensitive services, such as SSH or RDP, from unauthorized access. Security-conscious administrators can configure complex knock sequences to thwart automated scanning tools that rely on open port discovery.

  

***3. Access Granted Upon Correct Knock***

***Adversary Use:***

Once the correct knock sequence is sent, the system opens a specific port (e.g., SSH on port 22), allowing the attacker to gain access. After accessing the system, the adversary can perform a variety of malicious actions, such as:

 

 - Establishing reverse shells to maintain control of the system.
 - Installing backdoors for future access, without needing to re-enter
   the knock sequence.
 * Exfiltrating data or installing additional malware.

In some cases, the knock sequence might not only open a local port but could trigger the adversary to establish a C2 (Command and Control) connection with another server, enabling them to control the system remotely without detection.

  

***Security Use:***

In a legitimate use case, after the correct knock sequence is received, a port is temporarily opened, granting the user access to a service such as SSH or RDP. This is a way to ensure only authorized users can access services, especially when those services need to be hidden from general scans. Port knocking ensures that access is granted only after the user has provided the correct sequence, adding a layer of defense against brute-force and scanning attacks.

  

Once the sequence is completed, the service port is only open for a limited time, reducing the opportunity for attackers to exploit the system.

  

**4. Timeout and Re-closing of Access**

***Adversary Use:***

Once the port has been opened and the adversary gains access, the system may automatically close the port after a timeout, reverting back to the locked state. However, adversaries might evade this timeout by setting up an automated mechanism that keeps the connection alive, such as repeatedly knocking on the ports or using a tunneling technique to maintain access over time.

  

Attackers can also attempt to bypass the timeout by creating persistent access mechanisms, such as:

  

Custom malware that ensures the port remains open.

VPN tunneling or encrypted channels that remain open even after the timeout.

***Security Use:***

From a security perspective, closing the port after a set timeout is a useful way to ensure that access is only temporary and that no open ports remain for attackers to exploit. This reduces the risk of persistent access. A properly configured timeout ensures that once the session ends, the opened port is closed, thus minimizing exposure to further attacks. This feature can also be combined with IP whitelisting or multi-factor authentication to further secure the process.



## Example of Port-Knocking Exploit Persistence (Chaos)

Chaos is a backdoor that was originally part of a rootkit that was active in 2013 called “sebd”. This backdoor performs port knocking by providing a reverse shell that is triggered by packet reception and contains a special string which can be sent to any port.


## Detection

While port knocking provides a concealment layer, several detection methods can help identify suspicious port-knocking attempts. These include:

1.  **Intrusion Detection Systems (IDS):** Configure IDS to monitor connection attempts on closed ports. A high volume of connection attempts across different ports can signal a port-knocking attempt or brute-force scan.
2.  **Firewall Monitoring:** Log connection attempts on non-standard ports. Suspicious sequences of connections (e.g., repeated access to closed ports in rapid succession) should be flagged.
3.  **Sequence Randomization:** Randomizing the knock sequence periodically prevents replay attacks and makes it harder for attackers to guess.
4.  **Single-Packet Authorization (SPA):** Unlike traditional port knocking, SPA uses cryptographically signed packets, which makes replay and brute-force attacks significantly harder. Each knock must be authenticated, adding an additional security layer.

## LAB
