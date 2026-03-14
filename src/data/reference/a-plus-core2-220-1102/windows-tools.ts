import type { ReferenceTable } from "../types";

export const windowsTools: ReferenceTable = {
  id: "windows-tools",
  title: "Windows Management Tools",
  description: "Built-in Windows administrative tools, access methods, and key features for the CompTIA A+ 220-1102 exam.",
  columnHeaders: [
    { key: "tool", label: "Tool" },
    { key: "accessMethod", label: "How to Open", mono: true },
    { key: "purpose", label: "Purpose" },
    { key: "keyFeatures", label: "Key Features / Exam Notes" },
  ],
  entries: [
    { columns: { tool: "Task Manager", accessMethod: "Ctrl+Shift+Esc / taskmgr", purpose: "Monitor processes, performance, startup apps, and users", keyFeatures: "Kill unresponsive processes; check CPU/RAM/disk/GPU usage; manage startup items (Startup tab); see per-process resource usage" } },
    { columns: { tool: "Device Manager", accessMethod: "devmgmt.msc / right-click This PC > Manage", purpose: "View and manage hardware devices and drivers", keyFeatures: "Update, roll back, disable, or uninstall drivers; identify unknown devices (yellow ! icon); check for hardware conflicts" } },
    { columns: { tool: "Disk Management", accessMethod: "diskmgmt.msc / right-click This PC > Manage", purpose: "Create, format, resize, and manage disk partitions and volumes", keyFeatures: "Extend/shrink volumes; assign drive letters; convert MBR ↔ GPT (data wipe required); create simple, spanned, striped, mirrored, RAID-5 volumes" } },
    { columns: { tool: "Event Viewer", accessMethod: "eventvwr.msc", purpose: "View system, application, and security event logs", keyFeatures: "Windows Logs: Application, System, Security; Custom Views; filter by Event ID; critical for diagnosing crashes, login failures, service errors" } },
    { columns: { tool: "Services", accessMethod: "services.msc", purpose: "Start, stop, configure, and set startup type for Windows services", keyFeatures: "Set startup type: Automatic, Manual, Disabled; recovery actions on failure; dependency management; run as specific service account" } },
    { columns: { tool: "System Configuration (msconfig)", accessMethod: "msconfig", purpose: "Manage boot options, startup items, and services for troubleshooting", keyFeatures: "Safe Boot modes; selective startup; disable startup services; Boot tab: boot options, timeout, safe mode; used for clean boot troubleshooting" } },
    { columns: { tool: "Registry Editor", accessMethod: "regedit", purpose: "View and modify the Windows registry — system and application settings", keyFeatures: "Hives: HKLM, HKCU, HKCR, HKU, HKCC; modify run keys for startup; caution — incorrect edits can break Windows; always back up before editing" } },
    { columns: { tool: "Task Scheduler", accessMethod: "taskschd.msc", purpose: "Create and manage automated tasks triggered by time or events", keyFeatures: "Triggers: time, event, user logon; actions: run program, send email, display message; used to automate backups, scripts, maintenance tasks" } },
    { columns: { tool: "Microsoft Management Console (MMC)", accessMethod: "mmc", purpose: "Host snap-ins for custom admin consoles", keyFeatures: "Blank console that hosts snap-ins; add Device Manager, Event Viewer, Certificates, etc.; save custom .msc files for reuse" } },
    { columns: { tool: "Computer Management", accessMethod: "compmgmt.msc / right-click This PC > Manage", purpose: "All-in-one console: Device Manager, Disk Management, Event Viewer, Services, and more", keyFeatures: "Single window for common admin tasks; includes local users and groups; shared folders; storage; services and applications" } },
    { columns: { tool: "Performance Monitor", accessMethod: "perfmon.msc", purpose: "Track real-time and historical system performance counters", keyFeatures: "Add counters: CPU, memory, disk, network; create Data Collector Sets for logging; identify bottlenecks; compare baselines" } },
    { columns: { tool: "Resource Monitor", accessMethod: "resmon / Task Manager > Performance > Open Resource Monitor", purpose: "Detailed real-time view of CPU, memory, disk, and network usage per process", keyFeatures: "See exactly which process is using which file or network connection; more granular than Task Manager" } },
    { columns: { tool: "System Information", accessMethod: "msinfo32", purpose: "Display detailed hardware and software inventory for the system", keyFeatures: "Hardware Resources; Components; Software Environment; export to text/NFO file; useful when diagnosing unknown hardware" } },
    { columns: { tool: "Group Policy Editor", accessMethod: "gpedit.msc (Pro/Enterprise only)", purpose: "Configure local Group Policy settings for security and system behaviour", keyFeatures: "Computer and User Configuration; password policies; software restriction; AppLocker; not available on Windows Home edition" } },
    { columns: { tool: "Certificate Manager", accessMethod: "certmgr.msc (user) / certlm.msc (local machine)", purpose: "View and manage digital certificates for the user or computer", keyFeatures: "Trusted Root CAs; personal certificates; expired cert troubleshooting; used with EFS, smart cards, VPNs, Wi-Fi 802.1X" } },
  ],
};
