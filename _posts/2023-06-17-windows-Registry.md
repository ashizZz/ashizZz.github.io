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

![MRU) lists](https://gbhackers.com/wp-content/uploads/2017/06/reg2.jpg)

With the information provided by the RunMRU key, an examiner can gain a better understanding of the user they are investigating and the application that is being used. In the above figure, you can see the user has opened cmd, Notepad, MSPaint, etc.