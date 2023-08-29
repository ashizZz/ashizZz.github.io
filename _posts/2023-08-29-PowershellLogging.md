---
title: Powershell Logging Recommendations for detecting Malicious PowerShell
category: logging, recommendations 
tags: [Powershell, Logging, Recomandations, Guides]
---

## Upgrade the environment to Powershell v5 and remove prior versions where possible to add logging and restriction abilities.
## Enable PowerShell Logging

Detection of PowerShell attack activity on your network begins with logging PowerShell activity. Enabling PowerShell logging requires PowerShell v3 and newer and PowerShell v4 adds some additional log detail (Windows 2012 R2 & Windows 8.1 with November 2014 roll-up KB300850) useful for discovering and tracking attack activity. PowerShell logging can be enabled via Group Policy for PowerShell modules:

*  **Microsoft.PowerShell.*** – Log most of PowerShell’s core capability.

* **ActiveDirectory** – Log Active Directory cmdlet use.

*  **BITSfer** – Logs use of BITS cmdlets.

*  **CimCmdlets (2012R2/8.1**) – Logs cmdlets that interface with CIM.

*  **GroupPolicy**– Log Group Policy cmdlet use.

*  **Microsoft.WSMan.Management** – Logs cmdlets that manage Web Services for Management (WS-Management) and Windows Remote Management (WinRM).

*  **NetAdapter/NetConnection** – Logs Network related cdmdlets. * * **PSScheduledJob/ScheduledTasks (PSv5)** – Logs cmdlets to manage scheduled jobs.

*  **ServerManager** – Log Server Manager cmdlet use.

*  **SmbShare** – Log SMB sharing activity.

*PowerShell logging can also be configured for all PowerShell modules (“*”) useful if the attacker has imported custom modules*


### Transcription

PowerShell now transcribes what it can of console commands that manipulate the console buffer directly and can now be enabled in hosts such as the PowerShell ISE.

Create a directory to hold transcripts.

Set permissions on the directory to prevent tampering. (I chose SDDL for the shortest code here.)

Trim the transcript directory contents on an interval to avoid filling the drive (if local).

To enable automatic transcription, enable the ‘Turn on PowerShell Transcription’ feature in Group Policy through ***Windows Components -> Administrative Templates -> Windows PowerShell.*** For automation, the configuration settings are:


> HKLM:\Software\Policies\Microsoft\Windows\PowerShell\Transcription
> 
> *EnableTranscripting, 1
> 
> IncludeInvocationHeader,1
> 
> OutputDirectory, [Path]*

### Script Block Logging
PowerShell v5 and KB 3000850 introduces deep script block logging. This exposes what is being run.
To enable automatic transcription, enable the ‘Turn on PowerShell Script Block Logging’ feature in Group Policy 
through ***Windows Components -> Administrative Templates -> Windows PowerShell***.  If you select ‘Log script block invocation start / stop events’, PowerShell also logs start and stop events for every time a script block is invoked. This latter setting can generate an extremely high volume of events, so should be enabled with caution.  For automation, the configuration settings are stored under 

> HKLM:\Software\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging.
> EnableScriptBlockLogging, 1   EnableScriptBlockInvocationLogging, 1

It may also be a good idea to increase the log size. The Microsoft-Windows-PowerShell/Operational log is 15MB by default.  
  
### Protected Event Logging 
Enable this to allow legitimate PS users to encrypt sensitive information that might be otherwise exposed in 
script block logging.

## Constrained Powershell - Whitelisting

The strongest form of protection is when a system employs AppLocker in ‘*Allow Mode*’, where only specific known applications are allowed to run.  Known applications can restrict execution from script from a protected directory or signed by the enterprise's trusted code signing certificate. In version 5, PowerShell reduces the script's functionality to “Constrained Mode” for both interactive input and user-authored scripts when it detects that 
PowerShell scripts have an ‘Allow Mode’ policy applied to them.  Before Powershell 5, the commands can be entered manually.  This doesn't stop execution from a manually installed and portable version of an earlier Powershell.
*Set constrainedLanguageMode with AppLocker, DeviceGuard, Environment variable _PSLockdownPolicy*

##  Detect Powershell generated EventId's within a SIEM or equivalent

* Depending on OS version, it is contained within:
 * Windows PowerShell.evtx
  * Microsoft-Windows-PowerShell/Operational log
  * Microsoft-Windows-PowerShell/Analytic.etl
  * Microsoft-Windows-WinRM/Operational.evtx
  * Microsoft-Windows-WinRM/Analytic.etl

**ID 6:**     Creating WSMan Session    	             
**ID 81:**    Processing client request for operation CreateShell
**ID 134:**   Sending response for DeleteShell    
  **ID 169:**   User X authent success using NTLM
**ID 400:**   Engine Started                      
   **ID 403:**   Engine Stopped
**ID 772:**   WinRM request to target system       
  **ID 1044:**  WINRM response from a system
**ID 4100:**  Error Messages (PS 3.0 and higher)    
 **ID 4103:**  PS module logging
**ID 4104:**  Script block logging enabled           
**ID 4105:**  Script block invocation logging start
**ID 4106:**  Script block invocation logging end   
 **ID 4656:**  handle to wsman\client keyID
**ID 7937:**  Executed cmdlets, scripts, or commands
**ID 8005:**  AppLocker permitted execution of PS    
**ID 8006:**  AppLocker would have prevented PS exec 
**ID 32850:** Creating attributable remote session  
 **ID 32867:** Recv remoting frag of encoded payload  
**ID 32868:** Sent remoting frag of encoded payload  
**ID 40961:** PowerShell console is starting up
**ID 40962:** PowerShell ready for user input

**Field HostName** == ConsoleHost is for a local session
**Field HostName** == ServerRemoteHost is for remote session

## Blacklist known Powershell executables not maintained by IT

While attackers have tools to circumvent this, it helps prevent them from being installed and therefore makes 
finding a rogue PS instance one of more significant value.   

## Monitoring the Powershell Operational log - Script block logging enabled

Many PowerShell attack tools can be detected by monitoring the above PowerShell event logs for indicators. 
They include the PowerSploit tools, but many other PowerShell attack tools use the same methods.

Obfuscation of commands include:

> ToString, Reverse, Split, Replace, Concat, and the "-f" operator
> FromBase64String or Base64 Look for a high count of characters used
> for obfuscation   examples: "$' for variables, semicolon for multiple
> commands, plus for concat
> 
> -[E,EC,Enc,Encoded,EncodedCommand], -enc
> -NoP, -NoProfile
> -Nonl, -NonInteractive
> -[W,Win,Window] Hidden, -WindowStyle Hidden
> -[EP,Exec,Execution] Bypass, -ExecutionPolicy Bypass

Configure system-wide transcription to log to a central repository. These indicators can assist in finding evil.

    Invoke-TokenManipulation
    TOKEN_IMPERSONATE
    TOKEN_DUPLICATE
    TOKEN_ADJUST_PRIVILEGES
    AdjustTokenPrivileges
    Invoke-CredentialInjection
    TOKEN_PRIVILEGES
    TOKEN_ALL_ACCESS
    TOKEN_ASSIGN_PRIMARY
    TOKEN_ELEVATION
    TOKEN_INFORMATION_CLASS
    TOKEN_QUERY
    GetDelegateForFunctionPointer
    ReadProcessMemory.Invoke
    SE_PRIVILEGE_ENABLED
    Invoke-DLLInjection
    System.Reflection.AssemblyName
    System.Reflection.Assembly
    System.Reflection.Emit.AssemblyBuilderAccess
    Invoke-Shellcode
    Reflection.AssemblyName
    System.Reflection.Emit.AssemblyBuilderAccess
    System.MulticastDelegate
    System.Reflection.CallingConventions
    Get-GPPPassword
    System.Security.Cryptography
    System.Runtime.InteropServices
    0x4e,0x99,0x06,0xe8,0xfc,0xb6,0x6c,0xc9,0xfa,0xf4
    Groups.User.Properties.cpassword
    ScheduledTasks.Task.Properties.cpassword
    Out-MiniDump
    Management.Automation.WindowsErrorReporting
    Management.Automation.RuntimeException
    MiniDumpWriteDump
    IMAGE_NT_OPTIONAL_HDR64_MAGIC
    Microsoft.Win32.UnsafeNativeMethods
    LSA_UNICODE_STRING
    PAGE_EXECUTE_READ
    Net.Sockets.SocketFlags
    SECURITY_DELEGATION
    Metasploit

## Protected event logging (can be used together with Windows Event Forwarding)  
Requires Windows 10 or Windows Server 2016  
Requires a document encryption certificate  

> HKLM:\Software\Policies\Microsoft\Windows\EventLog\ProtectedEventLogging
> EnableProtectedEventLogging, 1   EncryptionCertificate, [Certificate]


## Additional References
-   [Get Data into Splunk User Behavior Analytics](https://docs.splunk.com/Documentation/UBA/5.0.4.1/GetDataIn/AddPowerShell)  - PowerShell logging  
    
-   [Hunting for Malicious PowerShell using Script Block Logging](https://www.splunk.com/en_us/blog/security/hunting-for-malicious-powershell-using-script-block-logging.html)  
    
-   [PowerShell ♥ the Blue Team](https://devblogs.microsoft.com/powershell/powershell-the-blue-team/)  - Microsoft  
    
-   [about_Logging](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_logging?view=powershell-5.1)  - Microsoft Docs  
    
-   [Greater Visibility Through PowerShell Logging - FireEye](https://www.fireeye.com/blog/threat-research/2016/02/greater_visibilityt.html)  
    
-   [How to Use PowerShell Transcription Logs in Splunk](https://hurricanelabs.com/splunk-tutorials/how-to-use-powershell-transcription-logs-in-splunk/)  - Hurricane Labs  
    
-   [Hurricane Labs Add-on for Windows PowerShell Transcript](https://splunkbase.splunk.com/app/4984/)  
    
-   [How to detect suspicious PowerShell activity with Splunk?](https://github.com/inodee/threathunting-spl/blob/master/hunt-queries/powershell_qualifiers.md)  -  [Alex Teixeira](https://twitter.com/ateixei)