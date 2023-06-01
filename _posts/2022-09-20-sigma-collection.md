---
layout: post
title:  "Sigma Collection"
date:   2023-04-20 16:46:24 +0200
categories: [detection, R&D, sigma]
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