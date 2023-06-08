---
layout:	post
title:  "Email analysis checklists"
date:   2023-03-30 16:46:24 +0200
categories: [email, Phishing, analysis]
---

### *I divided this analysis into four pieces to help us better understand the investigation flow.*

# Email address

*Before investigation always drill down the email address further in 3 parts for detailed analysis:* 
## Completed email address
 - [ ] To be checked for past data breaches.
	 - [ ]  [Have I Been Pwned?](https://haveibeenpwned.com/)
	 - [ ] [Firefox Monitor](https://monitor.firefox.com/)
 - [ ] To be checked if it is linked with social media.
	 - [ ] [Social Blade](https://socialblade.com/) 
	 - [ ] [Hunter](https://hunter.io/) 
	 - [ ] [Namechk](https://namechk.com/)

## Username

  - [ ] Simple google dork for the username search can give us a good lead sometimes for target social media presence if any.
	
## Domain of email address:
 - [ ] To check if it is a Parked domain (Typo squatting domain names) or not, domain owner details such as date, time of registration, contact details of owner etc.
 - [ ] Domain name dork for more lead.
 - [ ] Sub-domain enumeration can be performed.

## Header Analysis
- [ ] [How to Get Email Headers](https://mxtoolbox.com/public/content/emailheaders/)
- [ ] [UNDERSTANDING AN EMAIL HEADER](https://mediatemple.net/community/products/dv/204643950/understanding-an-email-header)

**Below is a checklist of the pertinent information an analyst is to collect from the email header:**
1. Sender email address
2. Sender IP address
3. Reverse lookup of the sender IP address
4. Email subject line
5. Recipient email address (this information might be in the CC/BCC field)
6. Reply-to email address (if any)
7. Date/time
### Analysis Tools
 - [ ] [MXToolbox Email Header Analyzer](https://mxtoolbox.com/EmailHeaders.aspx)	
 - [ ] [Google Admin Toolbox](https://toolbox.googleapps.com/apps/messageheader/) 
 - [ ] [WhatIsMyIP.com® Analyzer](https://www.whatismyip.com/email-header-analyzer/)
 - [ ] [Analyze my mail header](https://mailheader.org/)
 - [ ] [E-Mail Header Analyzer - Gaijin.at](https://www.gaijin.at/en/tools/e-mail-header-analyzer)
 - [ ] [Message Header Analyzer](https://mha.azurewebsites.net/)
### Frameworks
- [ ] [PhishTool](https://www.phishtool.com/)

### Headers
- [ ] ***Relay Information*** &rarr; tells us the path the email took for the
       sender till it reached the recipient’s mailbox
 	- [ ] Any IPs or Domains detected utilizing this may be checked using
       the tools such as [AbuseIDP](https://www.abuseipdb.com/),
       [TalosIntelligence](https://www.talosintelligence.com/) and
       others.
 - [ ] ***Received SPF*** *(authentication system which allows domains to select which mail servers can send mail on their behalf)* **&rarr;** If this parameter displays as **SoftFail or Fail**, it might signify a spoofed or suspicious email. However, it can have some false positives since some firms need to maintain their SPF records up to date.

- [ ]  ***DKIM***  **&rarr;** When each email is sent, it is signed using a private key and subsequently validated on the receiving mail server using a public key in DNS. This step validates the integrity of email during transit.

- [ ]  ***Return Path***  **&rarr;** Mail servers use it to determine where to send an email if the email bounces or is banned and is not allowed.

- [ ]  ***Reply To***  **&rarr;** This field should always genuinely be the same as the From address. If it isn’t, the attacker has probably updated the field to attempt and make the appear to look more authentic.

- [ ] ***X-Distribution***  **&rarr;** If this box displays as Bulk, it is most probable that the email is either Spam or malicious.

- [ ]  ***X-Spam***  **&rarr;** 
	- [ ] ***X-Spam-Flag:*** YES: indicates that the message is considered to be spam.
	- [ ] ***X-Spam-Flag:*** NO: indicates that the message is not considered to be spam.
	- [ ] ***X-Spam-Score:*** [numeric value]: indicates the spam score assigned to the 		message by the spam filter.
	- [ ] ***X-Spam-Status:*** [string value]: indicates the status of the message, such as "pass" or "fail."
## Email body
**Below is a checklist of the artifacts an analyst needs to collect from the email body:**
1. Any URL links (if an URL shortened service was used, then we'll need to obtain the real URL link)
2. The name of the attachment
3. The hash value of the attachment (hash type MD5 or SHA256, preferably the latter)

 - [ ] [Extract URLs](https://www.convertcsv.com/url-extractor.htm)
 - [ ] URL analysis to be made using burp suite to check for web
       response code. Also, this will help us find drive-by-download of
       malicious files / packages (if any). On which further basic or
       advance malware analysis can be performed on suspicious files or
       packages.
 - [ ] URL re-directions can be analyzed.
 - [ ] Content in email (if it is a mass campaign), general search on
              Google, waybackmachine, cache site check.
 - [ ] Images / html I-frames in email body to be analyzed via view
              source code option for further lead.
### Artifacts Reputation Tools
- [ ] [PhisTank](https://phishtank.org/)
- [ ] [IPinfo.io](https://ipinfo.io/)
- [ ] [URLScan.io](https://urlscan.io/)

## Attachment analysis (Basic malware analysis)
- [ ] [VirusTotal](https://www.virustotal.com/gui/)
- [ ] [Talos File Reputation](https://talosintelligence.com/talos_file_reputation)
 - [ ] String analysis of obfuscated code.
 - [ ] Unpack the malicious code for dynamic analysis basis on packer
       used.
 - [ ] Offline / Online sandbox result check.
 	- [ ] [Browserling](https://www.browserling.com/)
	- [ ] [VMRay](https://www.vmray.com/)
	 - [ ] [Cuckoo Sandbox](https://cuckoosandbox.org/)
	 - [ ] [AnyRun](https://any.run/)
  	- [ ] [Hybrid analysis](https://www.hybrid-analysis.com/)
  	- [ ] [Joe Sandbox](https://www.joesecurity.org/)
  
[Further more analysis](https://github.com/ashizZz/Checklists/blob/main/MalwareAnalysis)

# Additional Resources:
https://www.knowbe4.com/phishing

https://www.itgovernance.co.uk/blog/5-ways-to-detect-a-phishing-email

https://cheapsslsecurity.com/blog/10-phishing-email-examples-you-need-to-see/

https://phishingquiz.withgoogle.com/

