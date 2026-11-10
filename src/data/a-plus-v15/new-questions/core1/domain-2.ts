import type { NewQuestion } from "./types";

/** 2.0 Networking: what 220-1201 added to 2.2, 2.3, 2.4 and 2.5. */
export const questions: NewQuestion[] = [
  {
    key: "c1-2.2-6ghz-1",
    objective: "2.2",
    topic: "6 GHz wireless band",
    difficulty: 2,
    question:
      "A new tri-band router broadcasts on 2.4 GHz, 5 GHz and 6 GHz. A recent phone connects on 6 GHz, but a laptop whose adapter is labeled Wi-Fi 6 (802.11ax) never does. What is the reason?",
    options: [
      "The 6 GHz network accepts only WPA2 security",
      "Routers hide 6 GHz networks from laptops by default",
      "The laptop sits too close to the router to use 6 GHz",
      "The laptop's adapter supports only 2.4 GHz and 5 GHz",
    ],
    answer: 3,
    explanation:
      "Wi-Fi 6 (802.11ax) adapters only work in the 2.4 GHz and 5 GHz bands; joining a 6 GHz network takes a Wi-Fi 6E or Wi-Fi 7 adapter. The 6 GHz band actually requires WPA3, not WPA2. Routers don't hide the band from one type of device, and being close to the router doesn't stop a 6 GHz connection.",
  },
  {
    key: "c1-2.2-6ghz-2",
    objective: "2.2",
    topic: "6 GHz wireless band",
    difficulty: 3,
    question:
      "A technician sets up a tri-band router with one network name on all three bands, secured with WPA2-Personal so older devices can join. Wi-Fi 6E laptops still connect only on 5 GHz. Which change will let them use the 6 GHz band?",
    options: [
      "Set the 6 GHz channel width to 20 MHz",
      "Secure the 6 GHz network with WPA3-Personal",
      "Turn off the 2.4 GHz band on the router",
      "Switch all three bands to WPA2-Enterprise",
    ],
    answer: 1,
    explanation:
      "The 6 GHz band requires WPA3 (or Enhanced Open for open networks), and WPA2 isn't allowed there, so a WPA2 network can't run on 6 GHz. Many routers use a separate WPA3 network on 6 GHz while the older bands keep WPA2 or WPA2/WPA3 for older devices. Channel width doesn't change the security rule, turning off 2.4 GHz doesn't enable 6 GHz, and WPA2-Enterprise is still WPA2.",
  },
  {
    key: "c1-2.2-6ghz-3",
    objective: "2.2",
    topic: "6 GHz wireless band",
    difficulty: 2,
    question: "Compared with the 5 GHz band, which statement about the 6 GHz band is true?",
    options: [
      "It has room for wider channels but a shorter range",
      "It reaches farther and passes through walls more easily",
      "It works with any 802.11ac (Wi-Fi 5) device or adapter",
      "It only allows narrow 20 MHz channels, like 2.4 GHz",
    ],
    answer: 0,
    explanation:
      "6 GHz adds up to 1,200 MHz of spectrum in some countries, including the US and Canada, so there's room for many 80 MHz and 160 MHz channels with no older devices crowding them. Higher frequencies lose more signal through walls, so range is shorter than on 5 GHz, not longer. Only Wi-Fi 6E and Wi-Fi 7 devices can use the band, and its channels go far wider than 20 MHz.",
  },
  {
    key: "c1-2.2-channels-1",
    objective: "2.2",
    topic: "channel selection",
    difficulty: 1,
    question:
      "A new smart thermostat can't find the office Wi-Fi during setup, although phones and laptops connect fine. The thermostat supports only 2.4 GHz, and the access point broadcasts the network on 5 GHz only. What should the technician do?",
    options: [
      "Move the 5 GHz network to a DFS channel",
      "Widen the 5 GHz channel to 160 MHz",
      "Turn on the 2.4 GHz band for the network",
      "Change the security from WPA3 to WEP",
    ],
    answer: 2,
    explanation:
      "Many smart-home devices have 2.4 GHz radios only, so they can't see a network broadcast only on 5 GHz; turning on the 2.4 GHz band, often as a separate network name for such devices, lets the thermostat join. DFS channels and channel width are still 5 GHz, which the thermostat can't use, and WEP is obsolete and insecure, so it should never be the fix.",
  },
  {
    key: "c1-2.2-channels-2",
    objective: "2.2",
    topic: "channel selection",
    difficulty: 2,
    question:
      "In a crowded apartment building, a user's 5 GHz access point uses a 160 MHz channel width. A Wi-Fi analyzer shows several neighboring networks overlapping that range, and the connection keeps dropping. Which change would MOST likely improve reliability?",
    options: [
      "Raise the access point's transmit power to maximum",
      "Move the 5 GHz radio over to channel 6 instead",
      "Disable the 2.4 GHz band on the access point",
      "Narrow the width to 40 or 80 MHz on a clear channel",
    ],
    answer: 3,
    explanation:
      "A 160 MHz channel spans eight 20 MHz channels, so in a crowded building it almost certainly overlaps neighboring networks. A narrower width needs less clear spectrum, so the AP can sit where nothing overlaps it, at the cost of some peak speed. Maximum transmit power adds interference without fixing the overlap, channel 6 is a 2.4 GHz channel, and disabling 2.4 GHz doesn't change the 5 GHz channel.",
  },
  {
    key: "c1-2.2-channels-3",
    objective: "2.2",
    topic: "channel selection",
    difficulty: 3,
    question:
      "Users on a 5 GHz network near an airport say the Wi-Fi drops briefly several times a week. Each time, the access point's log shows 'Radar detected, changing channel.' What should the technician do?",
    options: [
      "Widen the channel to 160 MHz to add more capacity",
      "Use a non-DFS channel, such as 36–48 or 149–165",
      "Turn off WPA3 so clients reconnect more quickly",
      "Hide the SSID so the network isn't seen by radar",
    ],
    answer: 1,
    explanation:
      "Many 5 GHz channels (52–144 in the US) are shared with radar under dynamic frequency selection (DFS) rules, and an AP must leave the channel when it detects radar, which drops clients. A channel outside that range, such as 36–48 or 149–165, avoids those forced moves. Most 160 MHz channels include DFS channels, so widening makes it worse, and the security setting and SSID broadcast have nothing to do with radar.",
  },
  {
    key: "c1-2.3-database-1",
    objective: "2.3",
    topic: "database servers",
    difficulty: 1,
    question:
      "A company's inventory application runs on 40 desktops, and every desktop reads and updates the same stock records at the same time. The vendor says the records must live on a central server that answers the application's queries. Which server role does the vendor mean?",
    options: ["File server", "Authentication server", "Web server", "Database server"],
    answer: 3,
    explanation:
      "A database server stores structured records and answers queries from many clients at once, managing simultaneous changes so one user's update doesn't overwrite another's. A file server shares whole files rather than answering queries, an authentication server checks who users are, and a web server delivers web pages and apps over HTTP or HTTPS.",
  },
  {
    key: "c1-2.3-database-2",
    objective: "2.3",
    topic: "database servers",
    difficulty: 2,
    question:
      "Customers can open a company's online store, but every product page shows 'Unable to load items.' The web server's log shows that its connections to the server holding the product and order records are timing out. Which server should the technician check next?",
    options: ["The database server", "The DHCP server", "The mail server", "The authentication server"],
    answer: 0,
    explanation:
      "Many web applications split the work: the web server builds the pages, and a database server stores and returns the records, here the products and orders. The web server is up, but its queries to the database server are timing out, so that's the one to check. DHCP hands out IP addresses, a mail server handles email, and an authentication server checks who users are; none of them holds the store's records.",
  },
  {
    key: "c1-2.3-ntp-1",
    objective: "2.3",
    topic: "Network Time Protocol (NTP)",
    difficulty: 2,
    question:
      "Several office PCs suddenly can't sign in to the Windows domain, and the error mentions the time. Their clocks are eight minutes ahead of the domain controller's. What is the BEST long-term fix?",
    options: [
      "Set each PC's clock by hand to match the domain controller",
      "Renew each PC's DHCP lease, then restart the PC",
      "Sync the PCs' clocks with the domain's NTP source",
      "Flush each PC's DNS resolver cache and restart",
    ],
    answer: 2,
    explanation:
      "Domain sign-in uses Kerberos, which by default rejects clocks more than five minutes apart, so the PCs must keep matching the domain's time. Network Time Protocol (NTP) synchronizes clocks automatically and keeps correcting drift. Setting clocks by hand only fixes today, and neither the DHCP lease nor the DNS cache affects the system clock.",
  },
  {
    key: "c1-2.3-ntp-2",
    objective: "2.3",
    topic: "Network Time Protocol (NTP)",
    difficulty: 2,
    question:
      "While investigating an incident, a technician lines up log entries from a firewall, two switches and a server, but the same events show up several minutes apart on different devices. What should be configured so future logs line up?",
    options: [
      "A larger log storage limit on the syslog server",
      "SNMP traps on every device",
      "A static IP address on every device",
      "All devices using the same NTP server",
    ],
    answer: 3,
    explanation:
      "Log timestamps only line up when every device's clock is right, and pointing all devices at the same Network Time Protocol (NTP) server keeps them synchronized. More storage keeps more entries but doesn't correct their times, SNMP traps send alerts without fixing clocks, and static IP addresses have nothing to do with timekeeping.",
  },
  {
    key: "c1-2.4-dhcp-exclusion-1",
    objective: "2.4",
    topic: "DHCP exclusions",
    difficulty: 2,
    question:
      "A network printer has a manually configured address, 192.168.1.50, that falls inside the DHCP scope. Twice this month a laptop leased the same address and caused a conflict. The printer must keep its manual setting. What should the technician do on the DHCP server?",
    options: [
      "Add 192.168.1.50 as an exclusion",
      "Create a reservation for the laptop",
      "Shorten the lease duration",
      "Delete the scope and create it again",
    ],
    answer: 0,
    explanation:
      "An exclusion tells the DHCP server never to lease an address or range, which protects addresses set by hand on devices like printers. A reservation for the laptop fixes the laptop's address but still lets another client lease .50, a shorter lease only changes how often clients renew, and a re-created scope would hand out .50 again.",
  },
  {
    key: "c1-2.4-dhcp-exclusion-2",
    objective: "2.4",
    topic: "DHCP exclusions",
    difficulty: 3,
    question:
      "A DHCP scope covers 192.168.20.100 through 192.168.20.199. Addresses .100 through .109 are excluded, and two addresses outside that range are reserved for printers. How many addresses can the server lease to other clients?",
    options: ["88", "90", "98", "100"],
    answer: 0,
    explanation:
      "The scope holds 100 addresses (.100 to .199). The exclusion removes 10 of them, and the two reserved addresses are only leased to the printers they're reserved for, which leaves 88 for everyone else. 90 forgets the reservations, 98 forgets the exclusion, and 100 forgets both.",
  },
  {
    key: "c1-2.4-cname-1",
    objective: "2.4",
    topic: "CNAME records",
    difficulty: 2,
    question:
      "A company is moving its help desk to a hosted service at the provider's host name acme.helpdesk.example.net, whose IP addresses can change without notice. Users should reach it as support.example.com. Which DNS record should the technician create for support.example.com?",
    options: [
      "An A record with the provider's current IP address",
      "A CNAME record pointing to the provider's host name",
      "An MX record pointing to the provider's host name",
      "A TXT record holding the provider's host name",
    ],
    answer: 1,
    explanation:
      "A canonical name (CNAME) record makes one host name an alias for another, so support.example.com always follows whatever addresses the provider's name resolves to. An A record would pin the name to today's IPv4 address, which breaks when the provider changes it; an MX record names a domain's mail servers; and a TXT record holds text, such as an SPF policy, rather than pointing anywhere.",
  },
  {
    key: "c1-2.4-cname-2",
    objective: "2.4",
    topic: "CNAME records",
    difficulty: 2,
    question:
      "A technician runs nslookup for www.example.com. The output shows the line 'Name: web-prod.example.net' with an IP address, followed by 'Aliases: www.example.com'. Which type of record is www.example.com?",
    options: ["A (IPv4 address)", "AAAA (IPv6 address)", "CNAME (alias)", "MX (mail exchanger)"],
    answer: 2,
    explanation:
      "The lookup followed an alias: www.example.com is a CNAME record pointing to the canonical name web-prod.example.net, which holds the address, so nslookup lists the name it started with under Aliases. An A or AAAA record would return an address for www.example.com directly, and an MX record names mail servers rather than a host's address.",
  },
  {
    key: "c1-2.5-mac-1",
    objective: "2.5",
    topic: "physical media access control (MAC) address",
    difficulty: 2,
    question:
      "A technician reserves an IP address for a user's phone using the Wi-Fi MAC address shown on the phone's About screen. On the office Wi-Fi, the phone still doesn't receive the reserved address. What is the MOST likely cause?",
    options: [
      "The phone's physical MAC address changes after every restart",
      "DHCP reservations only work for wired devices",
      "The phone uses a private, randomized MAC on that network",
      "The reservation needs the phone's IMEI number instead",
    ],
    answer: 2,
    explanation:
      "Current phones present a private, randomized MAC address to each Wi-Fi network by default, rather than the adapter's physical MAC address shown on the About screen, so the DHCP server never sees the address in the reservation. Turning off the private address for that network, or reserving the address the phone actually uses there, fixes it. The physical (burned-in) MAC doesn't change, reservations work for wireless clients, and DHCP identifies clients by MAC address, not IMEI.",
  },
  {
    key: "c1-2.5-mac-2",
    objective: "2.5",
    topic: "physical media access control (MAC) address",
    difficulty: 1,
    question:
      "A technician finds an unknown device on the network with the MAC address 00-1A-2B-3C-4D-5E. Which part of the address can be looked up to find the device's manufacturer?",
    options: ["00", "00-1A-2B", "3C-4D-5E", "4D-5E"],
    answer: 1,
    explanation:
      "A physical MAC address is 48 bits, written as six bytes. The first three bytes, 00-1A-2B here, are the organizationally unique identifier (OUI) assigned to the manufacturer, and the last three identify the individual interface. The last bytes alone say nothing about the vendor, and the first byte alone is only part of the OUI.",
  },
];
