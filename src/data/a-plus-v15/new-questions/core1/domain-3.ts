import type { NewQuestion } from "./types";

/**
 * 3.0 Hardware: what 220-1201 added to 3.1 through 3.8, plus printer questions
 * for 3.7 and 3.8, which the re-tagged bank leaves short.
 */
export const questions: NewQuestion[] = [
  {
    key: "c1-3.1-mini-led-1",
    objective: "3.1",
    topic: "Mini LED",
    difficulty: 1,
    question: "Which statement BEST describes a Mini LED display?",
    options: [
      "Each pixel makes its own light, so no backlight is needed",
      "A panel that reflects room light instead of a backlight",
      "An LCD lit by a fluorescent tube behind the panel",
      "An LCD lit by thousands of tiny LEDs in dimming zones",
    ],
    answer: 3,
    explanation:
      "Mini LED is still an LCD, but its backlight is made of thousands of very small LEDs grouped into many zones that dim independently, giving brighter highlights and deeper blacks than a conventional LED-backlit LCD. Pixels that make their own light describe OLED, reflecting room light describes reflective screens such as e-paper, and a fluorescent tube (CCFL) is the backlight of older LCDs, the kind that needs an inverter.",
  },
  {
    key: "c1-3.1-mini-led-2",
    objective: "3.1",
    topic: "Mini LED",
    difficulty: 2,
    question:
      "A video editor wants a bright HDR monitor with deep contrast but will leave static timelines and toolbars on screen ten hours a day and is worried about burn-in. Which display technology fits BEST?",
    options: ["OLED", "TN LCD with an edge-lit backlight", "Mini LED", "IPS LCD with an edge-lit backlight"],
    answer: 2,
    explanation:
      "Mini LED's many local dimming zones give high brightness and strong contrast for HDR, and because the light comes from a backlight rather than the pixels themselves, static toolbars don't burn in the way they can on OLED. OLED has excellent contrast but is the technology most prone to burn-in, and edge-lit TN and IPS panels can't dim parts of the screen independently, which limits their HDR contrast.",
  },
  {
    key: "c1-3.1-pixel-density-1",
    objective: "3.1",
    topic: "pixel density",
    difficulty: 2,
    question:
      "A technician compares two monitors that both run at 1920×1080: one is 24 inches and the other is 32 inches. Viewed from the same distance, which statement is true?",
    options: [
      "The 32-inch monitor has the higher pixel density, so text looks sharper",
      "The 24-inch monitor has the higher pixel density, so text looks sharper",
      "Both have the same pixel density because the resolution is the same",
      "The 32-inch monitor shows more of a document at once",
    ],
    answer: 1,
    explanation:
      "Pixel density, in pixels per inch (PPI), depends on how many pixels are spread across how much screen. The same 1920×1080 pixels on 24 inches (about 92 PPI) sit closer together than on 32 inches (about 69 PPI), so the smaller screen looks sharper. Equal resolution doesn't mean equal density, and both monitors show exactly the same amount of a document; the larger one just draws it bigger.",
  },
  {
    key: "c1-3.1-pixel-density-2",
    objective: "3.1",
    topic: "pixel density",
    difficulty: 2,
    question:
      "A user replaced a 24-inch 1920×1080 monitor with a 27-inch 3840×2160 model, and at 100% scaling the icons and text now look tiny. What explains this?",
    options: [
      "The new monitor's pixel density is much higher",
      "The new monitor has a lower refresh rate",
      "The new monitor uses a narrower color gamut",
      "The video cable doesn't support the new resolution",
    ],
    answer: 0,
    explanation:
      "The new monitor packs about 163 pixels per inch against about 92 on the old one, so anything drawn with a fixed number of pixels comes out much smaller. Raising Windows display scaling, for example to 150%, restores a comfortable size while keeping the sharper text. Refresh rate and color gamut don't change the size of items, and a cable that couldn't carry the resolution would show a lower resolution or no picture, not smaller text.",
  },
  {
    key: "c1-3.1-refresh-rate-1",
    objective: "3.1",
    topic: "refresh rates",
    difficulty: 1,
    question: "A monitor's specifications list '165 Hz.' What does this number describe?",
    options: [
      "How long a pixel takes to change from one color to another",
      "How many frames per second the graphics card renders",
      "How many pixels the screen has per inch",
      "How many times per second the display redraws the image",
    ],
    answer: 3,
    explanation:
      "Refresh rate, measured in hertz (Hz), is how many times per second the display redraws its image, so a 165 Hz monitor can show up to 165 new frames each second for smoother motion. The time a pixel takes to change color is response time, in milliseconds; frames per second is what the graphics card produces; and pixels per inch is pixel density.",
  },
  {
    key: "c1-3.1-refresh-rate-2",
    objective: "3.1",
    topic: "refresh rates",
    difficulty: 2,
    question:
      "A gamer connects a new 144 Hz monitor using the DisplayPort cable that came in the box, but motion looks no smoother than on the old 60 Hz monitor. Windows' advanced display settings show 60 Hz. What should the technician do FIRST?",
    options: [
      "Replace the DisplayPort cable with an HDMI cable",
      "Lower the screen resolution to 1280×720",
      "Select 144 Hz in Windows' display settings",
      "Turn off the monitor's adaptive sync feature",
    ],
    answer: 2,
    explanation:
      "A high-refresh monitor often runs at 60 Hz until the higher rate is selected, in Windows under Settings > System > Display > Advanced display or in the graphics driver's control panel. The bundled DisplayPort cable can carry 144 Hz, so swapping cables isn't the first step, and lowering the resolution or turning off adaptive sync doesn't select a higher refresh rate.",
  },
  {
    key: "c1-3.1-refresh-rate-3",
    objective: "3.1",
    topic: "refresh rates",
    difficulty: 3,
    question:
      "A gamer's 144 Hz monitor shows horizontal tearing whenever a game's frame rate swings between about 70 and 140 frames per second. Which feature, supported by both the monitor and the graphics card, would fix this?",
    options: [
      "A wide color gamut mode such as DCI-P3",
      "Adaptive sync, so the refresh rate follows the frame rate",
      "A panel with a higher pixel density at the same size",
      "Dynamic contrast that adjusts the backlight to each scene",
    ],
    answer: 1,
    explanation:
      "Tearing happens when the graphics card delivers a new frame partway through the monitor's fixed refresh cycle, so parts of two frames show at once. Adaptive sync (variable refresh rate, sold as AMD FreeSync and NVIDIA G-SYNC) makes the monitor refresh whenever a frame is ready, within its supported range, which removes the tearing. Color gamut, pixel density and dynamic contrast don't change when the screen refreshes.",
  },
  {
    key: "c1-3.1-resolution-1",
    objective: "3.1",
    topic: "screen resolution",
    difficulty: 2,
    question:
      "After a user connects a new 2560×1440 monitor, text looks slightly blurry. Windows shows the resolution as 1920×1080. What should the technician do?",
    options: [
      "Increase the refresh rate to the highest setting",
      "Turn on the monitor's dynamic contrast mode",
      "Lower the resolution to 1600×900 to sharpen text",
      "Set the native resolution, 2560×1440",
    ],
    answer: 3,
    explanation:
      "An LCD has a fixed grid of pixels, its native resolution, and looks sharpest when the computer sends exactly that resolution. At 1920×1080 the monitor has to scale the picture up to fill 2560×1440 pixels, which softens text. A higher refresh rate or dynamic contrast doesn't stop the scaling, and an even lower resolution makes the blur worse.",
  },
  {
    key: "c1-3.1-resolution-2",
    objective: "3.1",
    topic: "screen resolution",
    difficulty: 1,
    question: "A customer wants a monitor marketed as 4K UHD. Which screen resolution will it have?",
    options: ["1920×1080", "2560×1440", "3840×2160", "7680×4320"],
    answer: 2,
    explanation:
      "4K UHD is 3840×2160, four times the pixels of 1920×1080 (Full HD), which is why it looks sharper at the same size. 2560×1440 is QHD, often called 1440p, and 7680×4320 is 8K UHD.",
  },
  {
    key: "c1-3.1-color-gamut-1",
    objective: "3.1",
    topic: "color gamut",
    difficulty: 1,
    question: "A monitor's specifications list '98% DCI-P3.' Which display attribute does this describe?",
    options: ["Contrast ratio", "Color gamut", "Refresh rate", "Pixel density"],
    answer: 1,
    explanation:
      "Color gamut is the range of colors a display can reproduce, usually given as how much of a standard color space, such as sRGB, DCI-P3 or Adobe RGB, it covers. Contrast ratio compares the brightest white with the darkest black, refresh rate counts redraws per second, and pixel density counts pixels per inch.",
  },
  {
    key: "c1-3.1-color-gamut-2",
    objective: "3.1",
    topic: "color gamut",
    difficulty: 2,
    question:
      "A photographer prepares images for a print shop that works in the Adobe RGB color space. On the current monitor, some greens and cyans look duller than they turn out in print. Which attribute matters MOST when choosing a replacement monitor?",
    options: [
      "A wide color gamut covering most of Adobe RGB",
      "A refresh rate of 144 Hz or more",
      "A response time of 1 ms or less",
      "A curved screen with a wider field of view",
    ],
    answer: 0,
    explanation:
      "Adobe RGB includes greens and cyans that a standard sRGB monitor can't display, so the photographer needs a wide-gamut monitor that covers most of Adobe RGB to see those colors before printing. Refresh rate and response time affect motion, not which colors can be shown, and a curved screen changes the shape, not the colors.",
  },
  {
    key: "c1-3.2-usb-c-video-1",
    objective: "3.2",
    topic: "USB-C video cables",
    difficulty: 2,
    question:
      "A user connects a laptop to a USB-C monitor with a USB-C cable from a phone charger. The laptop charges from the monitor, but there's no picture. The laptop's USB-C port supports DisplayPort Alt Mode. What is the MOST likely cause?",
    options: [
      "The monitor's input source must be set to HDMI",
      "USB-C can't carry video and power at the same time",
      "The cable supports only USB 2.0 data and charging",
      "The laptop's display driver needs to be rolled back",
    ],
    answer: 2,
    explanation:
      "Video over USB-C (DisplayPort Alt Mode) uses a cable's high-speed wire pairs, and many cables bundled with chargers only have the USB 2.0 pair and power wires, so they charge but can't carry video. A full-featured USB-C cable rated for USB 3.x, USB4 or Thunderbolt fixes it. The HDMI input isn't connected to anything, one USB-C cable can carry video and power together, and a driver rollback can't add missing wires.",
  },
  {
    key: "c1-3.2-usb-c-video-2",
    objective: "3.2",
    topic: "USB-C video cables",
    difficulty: 3,
    question:
      "A user connects a laptop to a 4K TV through a USB-C to HDMI adapter. The picture appears, but the mouse pointer and videos look choppy, and Windows shows 3840×2160 at 30 Hz. The laptop and the TV both support 4K at 60 Hz. What should the technician do?",
    options: [
      "Use an adapter that supports 4K at 60 Hz (HDMI 2.0)",
      "Set the TV's color mode to sRGB to cut bandwidth",
      "Turn on overscan in the TV's picture size settings menu",
      "Charge the laptop through a different USB-C port",
    ],
    answer: 0,
    explanation:
      "Many USB-C to HDMI adapters only output HDMI 1.4 signals, which carry 3840×2160 at no more than 30 Hz, so motion looks choppy; an adapter rated for HDMI 2.0 and 4K at 60 Hz, with a cable rated for it, fixes it. The TV's color mode and overscan don't change the signal the adapter sends, and which port charges the laptop has nothing to do with the video.",
  },
  {
    key: "c1-3.2-usb-c-video-3",
    objective: "3.2",
    topic: "USB-C video cables",
    difficulty: 3,
    question:
      "A USB-C to DisplayPort cable works when connecting a laptop's USB-C port to a DisplayPort monitor. When a technician uses the same cable to connect a desktop's DisplayPort output to a monitor with only a USB-C input, there's no picture. What is the MOST likely cause?",
    options: [
      "The desktop's graphics card can't output video at 4K",
      "USB-C monitor inputs accept only HDMI video signals",
      "The cable only carries video from USB-C to DisplayPort",
      "The desktop needs a Thunderbolt firmware update first",
    ],
    answer: 2,
    explanation:
      "Most USB-C to DisplayPort cables are one-way: they take DisplayPort Alt Mode from a USB-C source and deliver it to a DisplayPort display, so they can't carry a DisplayPort output into a USB-C input. That direction needs a cable or adapter made for it, such as one sold as bidirectional. A resolution limit wouldn't leave a working link blank, USB-C monitor inputs take DisplayPort Alt Mode rather than HDMI, and a DisplayPort output doesn't depend on Thunderbolt firmware.",
  },
  {
    key: "c1-3.4-sas-1",
    objective: "3.4",
    topic: "Serial Attached SCSI (SAS)",
    difficulty: 2,
    question:
      "A technician tries to install a 2.5-inch SAS SSD in a desktop whose motherboard has only SATA ports, but the drive's connector won't fit the SATA cable. What should the technician do?",
    options: [
      "File down the connector so it fits the SATA cable",
      "Install a SAS host bus adapter or RAID controller",
      "Set the SATA ports to AHCI mode in UEFI",
      "Use a Molex-to-SATA power adapter",
    ],
    answer: 1,
    explanation:
      "Serial Attached SCSI (SAS) drives need a SAS controller. Their connector is keyed with a bridge between the data and power sections, so it won't plug into a SATA cable, and SATA ports can't run SAS drives anyway, although SAS controllers do accept SATA drives. Filing the connector would damage it without making it work, AHCI is a SATA controller mode, and a power adapter doesn't change the data interface.",
  },
  {
    key: "c1-3.4-sas-2",
    objective: "3.4",
    topic: "Serial Attached SCSI (SAS)",
    difficulty: 2,
    question:
      "Which drive interface is built for enterprise servers, connects through a host bus adapter or RAID controller, and offers dual ports so a drive stays reachable if one path fails?",
    options: ["SAS", "SATA", "eSATA", "mSATA"],
    answer: 0,
    explanation:
      "Serial Attached SCSI (SAS) is the server interface: drives connect through SAS host bus adapters or RAID controllers, and enterprise SAS drives have two ports that can be cabled to two controllers for redundancy. SATA, eSATA and mSATA drives have a single port and are aimed at desktops, external enclosures and laptops.",
  },
  {
    key: "c1-3.5-microatx-1",
    objective: "3.5",
    topic: "microATX motherboards",
    difficulty: 2,
    question:
      "A customer wants a compact desktop that holds a graphics card, a capture card and a network card, each in its own expansion slot. Which is the smallest motherboard form factor that can do this?",
    options: ["Mini-ITX", "microATX", "ATX", "E-ATX"],
    answer: 1,
    explanation:
      "microATX boards measure up to 9.6 × 9.6 inches and have up to four expansion slots, enough for three cards in a smaller case than ATX needs. Mini-ITX boards (6.7 × 6.7 inches) have a single expansion slot, while ATX (12 × 9.6 inches, up to seven slots) and the even larger E-ATX would fit the cards but need bigger cases.",
  },
  {
    key: "c1-3.5-microatx-2",
    objective: "3.5",
    topic: "microATX motherboards",
    difficulty: 2,
    question: "A technician wants to move a microATX motherboard into an ATX tower case. What should the technician expect?",
    options: [
      "It won't fit, since microATX boards need a microATX case",
      "It fits only with a riser adapter for the expansion slots",
      "It fits, using the standoffs that match the board's holes",
      "It fits only after switching to a smaller power supply",
    ],
    answer: 2,
    explanation:
      "microATX is a smaller version of ATX with compatible mounting holes, rear I/O placement and power connectors, so it installs in an ATX case on the standoffs that line up with its holes; any extra standoffs should be removed so they can't short the board. It doesn't need its own case size, a riser or a different power supply.",
  },
  {
    key: "c1-3.5-bios-temp-1",
    objective: "3.5",
    topic: "BIOS temperature monitoring",
    difficulty: 2,
    question:
      "A desktop shuts itself off after about ten minutes, even while sitting at the UEFI setup screen with no operating system loaded. Where can the technician check the CPU temperature and fan speeds without an OS?",
    options: [
      "Task Manager's Performance tab in Windows",
      "Device Manager's list of processor devices",
      "The POST beep codes heard at startup",
      "The hardware monitor page in UEFI setup",
    ],
    answer: 3,
    explanation:
      "UEFI setup includes temperature monitoring, usually on a hardware monitor or PC health page that shows CPU and system temperatures and fan speeds, so heat can be checked with no OS running. Task Manager and Device Manager need Windows to be running, and POST beep codes report startup failures, not temperatures.",
  },
  {
    key: "c1-3.5-bios-temp-2",
    objective: "3.5",
    topic: "BIOS temperature monitoring",
    difficulty: 3,
    question:
      "After reinstalling a CPU cooler, a technician sees in the UEFI hardware monitor that the idle CPU is at 95°C and the CPU fan reads 0 RPM. What is the MOST likely cause?",
    options: [
      "The CMOS battery is failing and losing settings",
      "The RAM is running in single-channel mode",
      "The cooler's fan isn't plugged into CPU_FAN",
      "Secure Boot was turned off during the reinstall",
    ],
    answer: 2,
    explanation:
      "A CPU fan reading 0 RPM while the idle CPU sits at 95°C points to a fan that isn't running, most often because its cable wasn't plugged back into the CPU_FAN header after the reinstall. A weak CMOS battery loses settings and the clock, single-channel memory lowers performance, and Secure Boot controls which boot loaders run; none of them heats the CPU or stops the fan.",
  },
  {
    key: "c1-3.5-bios-password-1",
    objective: "3.5",
    topic: "BIOS password",
    difficulty: 2,
    question:
      "A school wants to stop students from opening UEFI setup on lab PCs and changing settings such as the boot order. The PCs must still start Windows without anyone typing a password. What should the technician configure?",
    options: [
      "A BIOS (supervisor) password",
      "A boot (power-on) password",
      "Secure Boot",
      "TPM security features in UEFI setup",
    ],
    answer: 0,
    explanation:
      "A BIOS password, also called a supervisor or setup password, is required to change firmware settings, so students can't alter the boot order, while the PCs still start normally. A boot password would stop every startup until someone types it, Secure Boot only blocks unsigned boot loaders without locking settings, and the TPM stores keys and measurements rather than protecting setup.",
  },
  {
    key: "c1-3.5-bios-password-2",
    objective: "3.5",
    topic: "BIOS password",
    difficulty: 2,
    question:
      "A technician is authorized to reset a desktop PC whose BIOS password nobody remembers. On most desktop motherboards, which method clears it?",
    options: [
      "Reinstall Windows from a USB drive",
      "Update the graphics driver from the vendor",
      "Boot into Safe Mode and reset the password",
      "Use the board's clear-CMOS or password jumper",
    ],
    answer: 3,
    explanation:
      "Most desktop boards clear a forgotten BIOS password by clearing the CMOS settings with a jumper (or button), and some business models have a separate password jumper; either is used with the power cord unplugged, as the manual describes, and the firmware settings then need to be set again. Reinstalling Windows, updating a driver and Safe Mode all work inside the OS and can't change a firmware password. Many laptops keep the password in secure memory and need the manufacturer's process instead.",
  },
  {
    key: "c1-3.6-psu-efficiency-1",
    objective: "3.6",
    topic: "energy efficiency",
    difficulty: 2,
    question:
      "A PC's components draw 450 W from a power supply that is 90% efficient at that load. About how much power does the power supply draw from the wall outlet?",
    options: ["500 W", "495 W", "450 W", "405 W"],
    answer: 0,
    explanation:
      "Efficiency is output divided by input, so the input is 450 W ÷ 0.9 = 500 W, and the other 50 W is lost as heat inside the power supply. 495 W adds only 10% of the output, which understates the loss; 450 W ignores the loss; and 405 W subtracts 10% when the input must be more than the output.",
  },
  {
    key: "c1-3.6-psu-efficiency-2",
    objective: "3.6",
    topic: "energy efficiency",
    difficulty: 3,
    question:
      "A PC draws about 300 W under its usual load, and the technician is choosing between 80 PLUS Gold power supplies. Which rating keeps the power supply nearest its most efficient range while leaving headroom?",
    options: ["350 W", "600 W", "1,200 W", "1,600 W"],
    answer: 1,
    explanation:
      "Power supply efficiency peaks around half load, which is one reason 80 PLUS tests at 20%, 50% and 100%: a 600 W unit at about 300 W runs near 50% with room for spikes. A 350 W unit runs close to its limit with little headroom, while 1,200 W and 1,600 W units would run at about a quarter or less of their rating, where efficiency falls off.",
  },
  {
    key: "c1-3.7-printer-firmware-1",
    objective: "3.7",
    topic: "printer firmware",
    difficulty: 2,
    question:
      "A printer manufacturer publishes a security bulletin about a flaw in the printer's built-in web management page and releases a fix. What should the technician update?",
    options: [
      "The printer driver on every PC",
      "The printer's firmware",
      "The print server's operating system",
      "The web browser on every PC",
    ],
    answer: 1,
    explanation:
      "The web management page runs on the printer itself, so the fix comes as a firmware update: the software stored on the device, installed from the manufacturer through the printer's web page, a USB drive or a management tool. Drivers run on the PCs and only prepare print jobs, the print server's OS doesn't run the printer's web page, and browser updates don't change the code running on the printer.",
  },
  {
    key: "c1-3.7-printer-firmware-2",
    objective: "3.7",
    topic: "printer firmware",
    difficulty: 3,
    question:
      "A company's mail service now requires TLS 1.2 for sending. Since the change, an older multifunction printer can't send scan-to-email messages, while PCs send mail normally. The printer's settings offer no TLS 1.2 option. What should the technician do?",
    options: [
      "Install a newer printer driver on the PCs",
      "Set the printer's scan resolution to 300 dpi",
      "Send scan-to-email on port 25 without encryption",
      "Update the printer's firmware to add TLS 1.2",
    ],
    answer: 3,
    explanation:
      "Scan-to-email runs on the printer itself, so the printer's firmware is what needs TLS 1.2 support; manufacturers added it to many older models through firmware updates. PC drivers play no part in scan-to-email, scan resolution has nothing to do with encryption, and a service that requires TLS 1.2 would refuse an unencrypted connection.",
  },
  {
    key: "c1-3.7-pcl-postscript-1",
    objective: "3.7",
    topic: "PCL vs. PostScript drivers",
    difficulty: 2,
    question:
      "A design studio's PDFs, full of complex vector artwork and embedded fonts, print with misplaced shapes and substituted fonts through the printer's PCL driver. The printer also supports PostScript. What should the technician do?",
    options: [
      "Install an older PCL 5 driver",
      "Install the printer's PostScript driver",
      "Switch to a generic text-only driver",
      "Set the print quality to draft mode",
    ],
    answer: 1,
    explanation:
      "PostScript describes each page in a device-independent way and renders complex graphics and fonts precisely, which makes it the usual choice for design and publishing work; PCL is efficient for everyday office printing, but complex artwork can come out differently from one printer to another. An older PCL version doesn't fix the rendering, a generic text-only driver drops graphics and fonts altogether, and draft quality only lowers resolution.",
  },
  {
    key: "c1-3.8-multipart-1",
    objective: "3.8",
    topic: "impact printer multipart paper",
    difficulty: 2,
    question:
      "A dot matrix printer prints four-part carbonless invoices. The top copy is dark and clear, but the bottom copy is too faint to read. What should the technician do FIRST?",
    options: [
      "Replace the laser printer's toner cartridge",
      "Set the head gap lever for four-part forms",
      "Clean the thermal printer's heating element",
      "Replace the impact printer's ribbon",
    ],
    answer: 1,
    explanation:
      "Impact printers make the copies by striking through every layer of multipart paper, so the print head gap, set with the paper thickness lever, has to match the form; when it doesn't, the strike can be too weak to mark the lower copies. Toner belongs to laser printers and a heating element to thermal printers. A worn ribbon fades the top copy, which is printing well here.",
  },
  {
    key: "c1-3.8-multipart-2",
    objective: "3.8",
    topic: "impact printer multipart paper",
    difficulty: 2,
    question:
      "On a warehouse's impact printer, the top sheet of the multipart delivery forms has grown steadily lighter over the past month, while the copies beneath it are as clear as ever. Which maintenance should the technician perform?",
    options: [
      "Replace the ribbon",
      "Apply a laser maintenance kit",
      "Replace the special thermal paper",
      "Calibrate the inkjet printheads",
    ],
    answer: 0,
    explanation:
      "The top sheet of a multipart form gets its ink from the printer's ribbon, while the copies beneath are made by the pressure of the print head through the layers. A top sheet that fades gradually while the copies stay clear means the ribbon is running dry, so replace it. Maintenance kits are for laser printers, thermal paper is for thermal printers, and impact printers have no inkjet printheads.",
  },
  {
    key: "c1-3.8-laser-maintenance-1",
    objective: "3.8",
    topic: "laser printer maintenance",
    difficulty: 2,
    question:
      "A busy office's laser printer displays 'Perform printer maintenance' after printing about 200,000 pages. Print quality is still acceptable. What should the technician do?",
    options: [
      "Replace the toner and ignore the message",
      "Clean the printheads with the printer's utility",
      "Replace the ribbon and adjust the head gap",
      "Install the maintenance kit and reset the counter",
    ],
    answer: 3,
    explanation:
      "Laser printers count pages and ask for maintenance at a set interval; the manufacturer's maintenance kit replaces wear parts such as the fuser and the feed, pickup and transfer rollers, and resetting the page counter clears the message until the next interval. A new toner cartridge doesn't replace those parts, and printheads and ribbons belong to inkjet and impact printers.",
  },
  {
    key: "c1-3.8-laser-maintenance-2",
    objective: "3.8",
    topic: "laser printer maintenance",
    difficulty: 2,
    question:
      "While replacing a laser printer's toner cartridge, a technician spills toner inside the printer. How should the technician clean it up?",
    options: [
      "Blow it out with compressed air",
      "Use a vacuum made to capture toner",
      "Use a standard household vacuum",
      "Wipe it up with a soaking wet cloth",
    ],
    answer: 1,
    explanation:
      "Toner is an extremely fine powder, so spills are cleaned with a toner vacuum, whose filter traps particles that small, and small traces with a dry, lint-free cloth. Compressed air spreads toner through the printer and into the room, a household vacuum's filter lets the fine particles straight back into the air, and a wet cloth turns the toner into a smeary paste and puts moisture inside the printer.",
  },
  {
    key: "c1-3.8-inkjet-maintenance-1",
    objective: "3.8",
    topic: "inkjet printer maintenance",
    difficulty: 2,
    question:
      "An inkjet printer that sat unused for two months now prints pages with thin white streaks, and its nozzle check pattern shows gaps in the black and cyan lines. The cartridges are new. What should the technician do FIRST?",
    options: [
      "Replace the fuser assembly",
      "Apply a laser maintenance kit",
      "Replace the printer's feed rollers",
      "Run the printhead cleaning utility",
    ],
    answer: 3,
    explanation:
      "Ink dries in the printhead nozzles when an inkjet printer sits unused, and the gaps in the nozzle check show which ones are clogged; the built-in cleaning cycle flushes ink through them, and another nozzle check confirms the fix. A fuser and a maintenance kit belong to laser printers, and feed rollers move paper rather than putting ink on it.",
  },
  {
    key: "c1-3.8-inkjet-maintenance-2",
    objective: "3.8",
    topic: "inkjet printer maintenance",
    difficulty: 2,
    question:
      "An inkjet printer often fails to pick up paper from its tray and sometimes pulls in two sheets at once. The paper is the right type and loaded correctly, and the rubber feed rollers look shiny and dusty. What should the technician do?",
    options: [
      "Run the printhead alignment utility",
      "Clean the feed rollers as the manufacturer directs",
      "Replace both ink cartridges with new ones",
      "Set the paper thickness lever for multipart forms",
    ],
    answer: 1,
    explanation:
      "Feed rollers grip each sheet by friction, and paper dust and glazing make them slip, so pages fail to feed or go through together. Cleaning them, typically with a lint-free cloth lightly dampened with water as the manufacturer directs, or replacing them if they're worn, restores the grip. Printhead alignment and new cartridges affect print quality, not paper handling, and the paper thickness lever for multipart forms is on impact printers.",
  },
  {
    key: "c1-3.8-thermal-maintenance-1",
    objective: "3.8",
    topic: "thermal printer maintenance",
    difficulty: 2,
    question:
      "A receipt printer that uses direct thermal paper prints a thin, blank vertical line through every receipt. The paper roll is new and loaded correctly. What should the technician do?",
    options: [
      "Clean the heating element with isopropyl alcohol",
      "Replace the printer's ink ribbon with a new roll",
      "Replace the toner cartridge and print a test page",
      "Run an inkjet nozzle check, then a cleaning cycle",
    ],
    answer: 0,
    explanation:
      "A direct thermal printer marks the paper with a row of tiny heating dots, and residue or debris on that heating element keeps some of them from touching the paper, which leaves a blank line. Cleaning the cooled element with isopropyl alcohol, using a cleaning pen or swab, and removing debris is routine thermal printer maintenance; if the line stays, a dot may have burned out. Direct thermal printers use no ribbon, toner or ink.",
  },
  {
    key: "c1-3.8-thermal-maintenance-2",
    objective: "3.8",
    topic: "thermal printer maintenance",
    difficulty: 2,
    question:
      "A direct thermal label printer has started feeding labels crookedly and jamming, and print is patchy along one edge. The technician finds adhesive residue and paper dust built up on the platen roller. What should the technician do?",
    options: [
      "Install a wider ribbon for the labels",
      "Apply the laser printer maintenance kit",
      "Clean the platen roller and remove the debris",
      "Switch to a higher-quality inkjet label stock",
    ],
    answer: 2,
    explanation:
      "The platen roller is part of a thermal printer's feed assembly: it pulls the media through and presses it against the heating element, so adhesive and dust on it cause skewed feeding, jams and uneven print. Cleaning it with the manufacturer's recommended cleaner, usually isopropyl alcohol, and removing the debris is routine thermal printer maintenance. Direct thermal printers use no ribbon, maintenance kits are for laser printers, and inkjet label stock isn't made for thermal printing.",
  },
  {
    key: "c1-3.8-impact-maintenance-1",
    objective: "3.8",
    topic: "impact printer maintenance",
    difficulty: 2,
    question:
      "Every line printed by a dot matrix printer has a thin horizontal gap at the same height, even after the technician installed a new ribbon and cleaned the print head. What should the technician do?",
    options: [
      "Load a different brand of multipart paper",
      "Set the paper thickness lever to a thinner setting",
      "Clean the platen with isopropyl alcohol",
      "Replace the print head",
    ],
    answer: 3,
    explanation:
      "Each pin in a dot matrix print head prints one row of dots, so a gap at the same height in every line means one pin isn't firing; with a new ribbon and a clean head, the head itself has failed and needs replacing. Different paper doesn't bring back a missing row of dots, the thickness lever changes how hard every pin strikes rather than one, and the platen only supports the paper.",
  },
];
