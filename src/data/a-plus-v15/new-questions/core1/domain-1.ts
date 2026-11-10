import type { NewQuestion } from "./types";

/** 1.0 Mobile Devices: what 220-1201 added to 1.2 and 1.3. */
export const questions: NewQuestion[] = [
  {
    key: "c1-1.2-track-point-1",
    objective: "1.2",
    topic: "track points",
    difficulty: 1,
    question:
      "A user who types all day wants a laptop that lets them move the pointer without lifting their hands from the home row of the keyboard. Which built-in pointing device should the technician look for?",
    options: ["Trackpad", "Drawing pad", "Track point", "Digitizer"],
    answer: 2,
    explanation:
      "A track point is the small pressure-sensitive nub between the G, H and B keys: the user pushes it with a fingertip to move the pointer, and buttons just below the space bar act as clicks, so the hands stay on the keys. A trackpad sits below the keyboard, so a hand has to leave the keys to use it. A drawing pad is a separate tablet for pen input, and a digitizer is the touch-sensing layer of a screen.",
  },
  {
    key: "c1-1.3-wifi-data-1",
    objective: "1.3",
    topic: "Wi-Fi data networks",
    difficulty: 2,
    question:
      "A user's phone plan keeps going over its data cap, although the phone is connected to the home Wi-Fi most evenings. The technician finds the Wi-Fi signal is weak in the bedroom, where the user streams video at night. Which phone feature is MOST likely using the cellular data?",
    options: [
      "Bluetooth pairing with the user's wireless headphones",
      "Location services tracking the phone by GPS satellites",
      "Airplane mode with Wi-Fi turned back on for the night",
      "Switching to cellular data when Wi-Fi is weak",
    ],
    answer: 3,
    explanation:
      "Phones can move traffic to cellular data on their own when the Wi-Fi signal is poor (Wi-Fi Assist on iPhone, and similar switch-to-mobile-data settings on many Android phones), so streaming in a room with weak Wi-Fi quietly uses the plan. Turning that setting off, or improving Wi-Fi coverage, stops it. Bluetooth headphones don't use cellular data, GPS only receives satellite signals, and airplane mode turns the cellular radio off.",
  },
  {
    key: "c1-1.3-wifi-data-2",
    objective: "1.3",
    topic: "Wi-Fi data networks",
    difficulty: 1,
    question:
      "On a flight, a user wants to use the aircraft's Wi-Fi while making sure the phone doesn't connect to any cellular network. What should the technician tell the user to do?",
    options: [
      "Turn on airplane mode, then switch Wi-Fi back on",
      "Turn off Wi-Fi and keep cellular data turned on",
      "Remove the SIM card, then restart the phone",
      "Turn on the personal hotspot before takeoff",
    ],
    answer: 0,
    explanation:
      "Airplane mode switches off the cellular radio, and both iPhone and Android phones let the user turn Wi-Fi (and Bluetooth) back on while airplane mode stays on. Leaving cellular data on keeps the phone on the cellular network. Removing the SIM doesn't switch the radio off, since the phone still looks for networks to allow emergency calls, and it does nothing for an eSIM. A hotspot shares the phone's connection with other devices.",
  },
  {
    key: "c1-1.3-sim-1",
    objective: "1.3",
    topic: "SIM and eSIM",
    difficulty: 2,
    question:
      "A user's new phone has no SIM card tray. The carrier has emailed a QR code for moving the user's existing phone number to the new phone. What should the technician do?",
    options: [
      "Order a nano-SIM card from the carrier and insert it",
      "Turn on Wi-Fi calling so the number moves over Wi-Fi",
      "Scan the QR code to add the carrier's eSIM profile",
      "Enter the SIM PIN that came with the old phone's card",
    ],
    answer: 2,
    explanation:
      "An eSIM is a SIM built into the phone that the carrier programs remotely; scanning the carrier's QR code (or using the carrier's app) downloads the eSIM profile that holds the number and plan. A phone with no tray can't take a physical nano-SIM. Wi-Fi calling only routes calls for a line that is already active, and a SIM PIN unlocks a SIM that's already installed; neither adds a line to the phone.",
  },
  {
    key: "c1-1.3-sim-2",
    objective: "1.3",
    topic: "SIM and eSIM",
    difficulty: 2,
    question:
      "A user entered the wrong SIM PIN three times, and the phone now asks for a PUK code. What should the technician do?",
    options: [
      "Factory reset the phone to clear the SIM lock",
      "Get the SIM's PUK from the carrier and enter it",
      "Keep entering likely codes until one works",
      "Move the SIM card to another phone to bypass the lock",
    ],
    answer: 1,
    explanation:
      "Three wrong PIN entries lock the SIM itself, and only its PIN unlock key (PUK), which the carrier keeps for that SIM, can unlock it and set a new PIN. Guessing is risky, because ten wrong PUK entries usually disable the SIM for good, and it then has to be replaced. A factory reset doesn't touch the SIM's lock, and the lock moves with the card to any other phone.",
  },
  {
    key: "c1-1.3-sim-3",
    objective: "1.3",
    topic: "SIM and eSIM",
    difficulty: 3,
    question:
      "A user traveling abroad for a month wants an inexpensive local data plan but still wants to receive calls and texts on their home number. The phone supports one physical SIM and one eSIM. What is the BEST setup?",
    options: [
      "Swap the home SIM card for a local SIM card",
      "Turn on data roaming on the home line for the trip",
      "Turn off cellular data and rely on the hotspot feature",
      "Add a local eSIM plan and use it for cellular data",
    ],
    answer: 3,
    explanation:
      "A dual-SIM phone can keep the home line active for calls and texts while a second line, here a local eSIM plan, carries the cellular data. Swapping SIM cards takes the home number off the phone, and data roaming on the home line keeps the number but runs up roaming charges instead of using the cheap local plan. With cellular data off, the hotspot has no connection to share.",
  },
  {
    key: "c1-1.3-mdm-config-1",
    objective: "1.3",
    topic: "MDM device configurations",
    difficulty: 2,
    question:
      "Employees will use their own Android phones for work email and files. The company wants to manage only its own apps and data and to have no access to personal photos, apps or browsing. Which MDM configuration should the technician set up?",
    options: [
      "Corporate-owned, fully managed enrollment",
      "No enrollment, with mail settings entered by hand",
      "BYOD enrollment with a separate work profile",
      "Kiosk mode locked to the company's email app",
    ],
    answer: 2,
    explanation:
      "A bring-your-own-device (BYOD) enrollment keeps company apps and data in a separate work profile that IT manages, while personal apps, photos and browsing stay outside IT's view, and removing the work profile takes only company data away. A fully managed enrollment gives the company control of the whole phone, which suits company-owned devices. Skipping enrollment leaves company data unmanaged, and kiosk mode locks the entire phone to one app.",
  },
  {
    key: "c1-1.3-mdm-config-2",
    objective: "1.3",
    topic: "MDM device configurations",
    difficulty: 2,
    question:
      "A company buys phones for its delivery drivers. IT must control every setting, allow only approved apps, and erase the entire phone if it's lost. Which MDM device configuration fits these phones?",
    options: [
      "Corporate configuration with full device management",
      "BYOD configuration with a work profile",
      "BYOD configuration with app protection only",
      "Personal accounts with a passcode the driver picks",
    ],
    answer: 0,
    explanation:
      "Company-owned phones can be enrolled in a corporate configuration, where MDM manages the whole device: all settings, which apps can be installed, and a full remote wipe. BYOD configurations deliberately limit IT to work apps and data, so they can't lock down the entire phone or erase all of it. Personal accounts with a passcode give IT no management at all.",
  },
  {
    key: "c1-1.3-mdm-policy-1",
    objective: "1.3",
    topic: "MDM policy enforcement",
    difficulty: 2,
    question:
      "An MDM compliance report flags a salesperson's phone as noncompliant with the reason 'Device is rooted.' The salesperson had installed unofficial software to remove the carrier's restrictions. What will the compliance policy typically do?",
    options: [
      "Nothing, since rooting only affects the user's personal apps",
      "Repair the operating system and remove root access",
      "Raise the phone's data plan to an unlimited tier",
      "Block company email and apps until the phone complies",
    ],
    answer: 3,
    explanation:
      "A rooted (or jailbroken) phone has had its built-in protections removed, so MDM policy enforcement marks it noncompliant and blocks company email, apps and data until it's back in a supported state, usually by restoring the official OS. Rooting weakens security for everything on the phone, not just personal apps; MDM can't undo it remotely; and the data plan has nothing to do with compliance.",
  },
  {
    key: "c1-1.3-mdm-policy-2",
    objective: "1.3",
    topic: "MDM policy enforcement",
    difficulty: 2,
    question:
      "An MDM compliance report lists a salesperson's tablet as noncompliant with the reason 'OS version below minimum,' and the tablet can no longer open company apps. Which action will resolve the issue?",
    options: [
      "Clear the cache and data of each company app",
      "Install the latest operating system update",
      "Turn on location services for the company apps",
      "Remove the SIM card and insert it again",
    ],
    answer: 1,
    explanation:
      "Policy enforcement lets MDM require a minimum operating system version so devices have current security fixes; installing the update makes the tablet meet the policy, and access returns. Clearing app data, turning on location services and reseating the SIM change nothing about the OS version the policy checks.",
  },
  {
    key: "c1-1.3-mdm-apps-1",
    objective: "1.3",
    topic: "MDM business applications",
    difficulty: 2,
    question:
      "A company wants each new employee's phone to get the company mail account and the approved cloud storage app as soon as it's enrolled, without anyone typing server settings. How should the technician deliver them?",
    options: [
      "Email each user a PDF with the server settings",
      "Push the mail profile and managed apps from the MDM",
      "Let users install whichever cloud storage app they like",
      "Set up each phone's mail as a POP3 account",
    ],
    answer: 1,
    explanation:
      "MDM can push business applications and settings to enrolled devices: a mail profile with the server settings already filled in, plus the approved cloud storage app, installed and managed by IT. A PDF of settings still leaves users to configure accounts by hand, letting users choose their own storage app puts company files outside IT's control, and POP3 only downloads mail, without syncing folders, calendars or contacts.",
  },
  {
    key: "c1-1.3-mdm-apps-2",
    objective: "1.3",
    topic: "MDM business applications",
    difficulty: 2,
    question:
      "Field technicians use a company-managed cloud storage app to upload photos of every job. Their phones keep going over the data cap, mostly because of these uploads, although each technician is on the office Wi-Fi every evening. What should IT configure?",
    options: [
      "Set the cloud storage app to upload only over Wi-Fi",
      "Turn off photo uploads in the cloud storage app",
      "Switch the phones' company mail to POP3 accounts",
      "Turn on data roaming so uploads use other networks",
    ],
    answer: 0,
    explanation:
      "Business cloud storage apps can be set, by the user or through the MDM's app configuration, to upload over Wi-Fi only, so the day's photos sync on the office network each evening instead of using cellular data. Turning off uploads stops the business process, POP3 affects mail rather than file uploads, and roaming adds charges without reducing the data used.",
  },
];
