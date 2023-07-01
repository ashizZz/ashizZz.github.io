---
title: Windows Registry
category: Defense Evasion
tags: [HTML Smuggling (T1027.006), Obfuscated Files or Information (T1027), Delivery]
---
## Windows Registry Structure
open Regedit.exe, he sees a tree-like structure with five root folders, or “hives”.

![Windows Registry Structure](https://gbhackers.com/wp-content/uploads/2017/06/reg-300x188.jpg)

-   **HKEY_CLASSES_ROOT**  hive contains configuration information relating to which application is used to open various files on the system.
-   **HKEY_CURRENT_USER**  hive is the active,  **loaded user profile**  for the currently logged-on-user.
-   **HKEY_LOCAL_MACHINE**  hive contains  **vast configuration information**  for the system, including hardware settings and software settings.
-   **HKEY_USERS**  hive contains all the actively  **loaded user profiles**  for that system.
-   **HKEY_CURRENT_CONFIG**  hive contains the  **hardware profile** the system uses at startup.


## Registry Examination
### Most Recently Used (MRU) lists
It contains entries made due to specific actions performed by the user.

The Registry maintains these lists of items in case the user returns to them in the future. It is similar to how the history and cookies act in a web browser.

The location of this key is ***HKEY_CURRENT_USER\software\microsoft\windows\currentversion\Explorer\RunMRU*** and it contains


With the information provided by the RunMRU key, an examiner can gain a better understanding of the user they are investigating and the application that is being used. In the above figure, you can see the user has opened cmd, Notepad, MSPaint, etc.

### USB Devices:
Anytime a device is connected to the Universal Serial Bus (USB), Drivers are queried and the device’s information is stored in the Registry(Thumb Drives).

This key stores the contents of the product and device ID values of any USB devices that have ever been connected to the system.

***HKEY_LOCAL_MACHINE\SYSTEM\controlset001\Enum\USBSTOR.***

### Internet Explorer:
Internet Explorer is the native Web browser in the Windows operating system. It utilizes the Registry extensively in the storage of data, like many applications.

Internet Explorer stores its data in the ***HKEY_CURRENT_USER\Software\Microsoft\Internet Explorer\TypedURLs***


### Attached Hardware:
Navigating to the following key ***HKEY_LOCAL_MACHINE\SYSTEM|MountedDevices.This information can be useful to a forensic examiner as it shows any connected storage device has been recognized by the operating system.

If the examiner notes a discrepancy between the physically attached devices and the ones reported here, it can be an indication that some device was removed prior to the evidence being seized.

### Malicious Software:
Navigating to this following key HKEY_CURRENT_USER\Software\  this information will be juicy stuff for Forensics Examiner as it could see the hacker used CyberGhost Vpn which is used for being anonymous.

### Recent Applications:

Navigating to this following key will give information for the last accessed applications list 

***HKEY_CURRENT_USER\SOFTWARE\Microsoft\Currentversion\Search\RecentApps.***

This user has a vast list of applications, one of which was Vmworkstation found.