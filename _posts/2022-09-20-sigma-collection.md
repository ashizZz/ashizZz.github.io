---
layout: post
title:  "Sigma Collection"
date:   2023-04-20 16:46:24 +0200
categories: [detection, rules, sigma]
---

# Windows

## CVE-2023-23397 Exploitation Attempt
```bash
title: CVE-2023-23397 Exploitation Attempt
id: 73c59189-6a6d-4b9f-a748-8f6f9bbed75c
status: experimental
description: Detects outlook initiating connection to a WebDAV or SMB share, which
  could be a sign of CVE-2023-23397 exploitation.
author: Robert Lee @quantum_cookie
date: 2023/03/16
references:
- https://www.trustedsec.com/blog/critical-outlook-vulnerability-in-depth-technical-analysis-and-recommendations-cve-2023-23397/
tags:
- attack.credential_access
- attack.initial_access
- cve.2023.23397
logsource:
  service: security
  product: windows
  definition: 'Requirements: SACLs must be enabled for "Query Value" on the registry
    keys used in this rule'
detection:
  selection:
    EventID:
    - 4656
    - 4663
    ProcessName|endswith: \OUTLOOK.EXE
    Accesses|contains: Query key value
    ObjectName|contains|all:
    - \REGISTRY\MACHINE\SYSTEM
    - Services\
    ObjectName|endswith:
    - WebClient\NetworkProvider
    - LanmanWorkstation\NetworkProvider
  condition: selection
falsepositives:
- Searchprotocolhost.exe likes to query these registry keys. To avoid false postives,
  it's better to filter out those events before they reach the SIEM
level: critical
```
## Possible Snake Malware IOC Patterns (via registry_event)
```bash
title: Possible Snake Malware IOC Patterns (via registry_event)
status: stable
description: Identifies registry keys activities, which may be related to the Snake malware.
author: SOC Prime Team
references:
  - https://thehackernews.com/2023/05/us-government-neutralizes-russias-most.html
  - https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-129a
  - https://www.cisa.gov/sites/default/files/2023-05/aa23-129a_snake_malware_1.pdf
  - https://www.justice.gov/usao-edny/pr/justice-department-announces-court-authorized-disruption-snake-malware-network
  - https://www.securityweek.com/us-disrupts-russias-sophisticated-snake-cyberespionage-malware/
tags:
  - attack.t1112
  - attack.defense_evasion
logsource:
  category: registry_event
  product: windows
detection:
  selection:
    - TargetObject|contains:
      - 'SECURITY\Policy\Secrets\n'
    - TargetObject|contains|all:
      - 'SOFTWARE' # HKLM\SOFTWARE\Classes\.wav\OpenWithProgIds
      - 'Classes' # High Entropy
      - '.wav'
      - 'OpenWithProgIds'
  filters:
    Image|endswith:
      - 'explorer.exe'
  condition: selection and not filters
falsepositives:
  - Legitimate software activity. Requires further investigation and filtering.
level: medium
```
```bash
title: MOVEit exploitation
hypothesis: MOVEit affected hosts execute csc.exe via w3wp.exe process to dynamically compile malicious DLL file.
description: >
    MOVEit is affected by a critical vulnerability. Exploited hosts show evidence of dynamically compliling a DLL and writing it under 
    C:\\Windows\\Microsoft\.NET\\Framework64\\v4\.0\.30319\\Temporary ASP\.NET Files\\root\\([a-z0-9]{5,12})\\([a-z0-9]{5,12})\\App_Web_[a-z0-9]{5,12}\.dll.
    
    Hunting Opportunity
    ---
    
    Events from IIS dynamically compiling binaries via the csc.exe on behalf of the MOVEit application, especially since May 27th should be investigated.
status: experimental
date: 2023/06/01
author: '@kostastsale'
references:
  - https://www.huntress.com/blog/moveit-transfer-critical-vulnerability-rapid-response
  - https://www.trustedsec.com/blog/critical-vulnerability-in-progress-moveit-transfer-technical-analysis-and-recommendations/
logsource:
    category: process_creation
    product: windows
detection:
    Selection1:
      Image|endswith:
        - '\csc.exe'
      ParentImage|endswith:
        - '\w3wp.exe'
    Selection2:
      ParentCommandLine|contains:
        - 'moveitdmz pool'
    condition: Selection1 and Selection2
falsepositives:
    - "Uknown"
level: medium
tags:
    - attack.execution
    - attack.T1623
```
# Web Server

## Possible GitLab CVE-2023-2825 Exploitation Attempt (via webserver)
```bash
title: Possible GitLab CVE-2023-2825 Exploitation Attempt (via webserver)
status: stable
description: The rule detects a potential exploitation attempt targeting the GitLab Arbitrary File Read vulnerability (CVE-2023-2825). A vulnerability has been identified in GitLab CE/EE version 16.0.0, which affects the system. By exploiting a path traversal vulnerability, an unauthorized user without authentication can read arbitrary files on the server. This can occur when there is an attachment present in a public project that is nested within a minimum of five groups. To ensure accurate results and minimize false positives, it may be necessary to implement additional filtering measures due to the reliance on the surrounding environment. This is because the rule does not currently implement group nesting.
author: SOC Prime Team
references:
  - https://labs.watchtowr.com/gitlab-arbitrary-file-read-gitlab-cve-2023-2825-analysis/
  - https://www.securityweek.com/gitlab-security-update-patches-critical-vulnerability/
  - https://about.gitlab.com/releases/2023/05/23/critical-security-release-gitlab-16-0-1-released/
tags:
  - attack.initial_access
  - attack.t1190
logsource:
    category: webserver
detection:
  selection_status_type:
      sc-status: '200'
      cs-method: 'GET'
  selection_path:
    - c-uri|contains|all:
      - '/uploads/'
      - '..%2f'
      - '//..' #$'http://127.0.0.1/group1/group2/group3/group4/group5/group6/group7/group8/group9/project9/uploads/4e02c376ac758e162ec674399741e38d//..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2Fetc%2Fpasswd'
    - c-uri|contains|all:
      - '/uploads/'
      - '../'
      - '//..'
  condition: selection_status_type and selection_path
falsepositives:
    - The reliance on the surrounding environment may necessitate the implementation of additional filtering measures to prevent false positives.
level: medium
id: bce89ac5-10e8-4b1b-aec6-04bce0419988
```

## Taskkill Scheduled Task Was Created (via audit)
```bash
title: Taskkill Scheduled Task Was Created (via audit)
status: stable
description: Adversaries may attempt to establish scheduled tasks with taskkill execution to terminate security processes or prevent write conflicts. For instance, ransomware may generate another group policy to kill a predefined list of processes by creating a scheduled task that invokes taskkill.exe.
author: SOC Prime Team
references:
  - https://research.checkpoint.com/2023/rorschach-a-new-sophisticated-and-fast-ransomware/
tags:
  - attack.T1053
  - attack.execution
  - attack.persistence
  - attack.privilege_escalation
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4698
    TaskContent|contains:
      - 'taskkill'
  condition: selection
falsepositives:
  - Unknown
level: high
id: 37d48248-1d7d-442c-bbce-53eadbac13a0
```

## Possible CVE-2023-33299 (FortiNAC Insecure Deserialization) Exploitation Patterns (via keywords)
```bash
title: Possible CVE-2023-33299 (FortiNAC Insecure Deserialization) Exploitation Patterns (via keywords)
status: stable
description: Adversaries may try to exploit CVE-2023-33299 (FortiNAC Insecure Deserialization) in order to gain initial access. This rule requires extra log data from the appliance (output.master log file (/bsc/logs/output.master)).
author: SOC Prime Team
references:
  - https://frycos.github.io/vulns4free/2023/06/18/fortinac.html
tags:
  - attack.t1190
  - attack.initial_access
logsource:
  product: fortinet
  service: fortinac
  definition: requires output.master log file (/bsc/logs/output.master)
detection:
  keywords:
    - 'ObjectInputStream.readObject' #ObjectInputStream.readObject()
  condition: keywords
falsepositives:
  - Unknown
level: medium
id: 100e0dc2-f99d-480c-ac46-c2f3b5329425
```
## Possible Exfiltration Activities Of FadeStealer Malware Detected By Associate Filepaths.[via File_Event]
```bash
title: Possible Exfiltration Activities Of FadeStealer Malware Detected By Associate Filepaths.[via File_Event]
id: f137df7b-4b98-45f3-b2dd-a4384861d52d
description: This rule can detect exfiltration activities of fadestealer malware that create individual folders for each exfiltrated data in the %temp% directory.
references: https://asec.ahnlab.com/en/54349/
author: Phyo Paing Htun
status: stable
logsource:
  product: windows
  category: file_event
detection:
  selection: 
    TargetFilename|contains:
    - '\VSTelems_Fade'
    - '\VSTelems_FadeIn'
    - '\VSTelems_FadeOut'
  condition: selection
falsepositives:
- unknown
level: high
tags:
- attack.exfiltration
- attack.collection
- attack.credential_access
- attack.t1052.001
- attack.t1056.001
```