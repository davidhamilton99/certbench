import type { ReferenceTable } from "../types";

export const printerTypes: ReferenceTable = {
  id: "printer-types",
  title: "Printer Types",
  description: "Printer technologies, consumables, maintenance procedures, and use cases for the CompTIA A+ 220-1101 exam.",
  columnHeaders: [
    { key: "type", label: "Printer Type" },
    { key: "technology", label: "Technology" },
    { key: "consumables", label: "Consumables" },
    { key: "maintenance", label: "Key Maintenance Steps" },
    { key: "bestFor", label: "Best For / Exam Notes" },
  ],
  entries: [
    {
      columns: {
        type: "Laser (mono)",
        technology: "Electrophotographic process: drum charged by corona/transfer roller, laser writes image, toner attracted to drum, fused to paper by heat",
        consumables: "Toner cartridge, drum unit (sometimes combined), fuser assembly, transfer belt",
        maintenance: "Replace toner; clean drum; replace fuser periodically; run cleaning page; check paper path for debris",
        bestFor: "High-volume office printing; low cost per page; fast output; text and graphics",
      },
    },
    {
      columns: {
        type: "Laser (colour)",
        technology: "Same as mono laser but uses 4 separate toner cartridges (CMYK) and a transfer belt to layer colours",
        consumables: "4 toner cartridges (C, M, Y, K), drum units, fuser, transfer belt/roller",
        maintenance: "Replace individual colour toners; calibrate colours; clean transfer belt; replace fuser",
        bestFor: "Colour documents, presentations; higher cost per page than mono laser; slower than mono",
      },
    },
    {
      columns: {
        type: "Inkjet",
        technology: "Propels droplets of liquid ink onto paper; thermal (heat bubble) or piezoelectric methods; high DPI for photo-quality output",
        consumables: "Ink cartridges (individual CMYK or combined), printhead (may be in cartridge or fixed)",
        maintenance: "Run printhead cleaning cycle; align printhead; keep nozzles unclogged; store properly to prevent drying",
        bestFor: "Photo printing, home use, low-volume colour; ink can smear when wet; higher cost per page than laser",
      },
    },
    {
      columns: {
        type: "Thermal (direct)",
        technology: "Heat-sensitive paper darkens when thermal printhead applies heat; no ink, toner, or ribbon required",
        consumables: "Thermal paper roll only",
        maintenance: "Clean printhead with IPA; replace thermal paper roll; keep paper away from heat and sunlight",
        bestFor: "Receipts, POS terminals, shipping labels, medical wristbands; fades over time with heat/light",
      },
    },
    {
      columns: {
        type: "Impact / Dot-matrix",
        technology: "Print head with pins strikes an inked ribbon against paper; forms characters from dot patterns",
        consumables: "Ink ribbon cartridge, continuous-feed (tractor-feed) paper",
        maintenance: "Replace ribbon; clean platen and print head; check tractor-feed mechanism for jams",
        bestFor: "Multi-part forms (carbon copy); invoices; environments requiring impact (loud but durable); very low cost per page",
      },
    },
    {
      columns: {
        type: "3D Printer (FDM)",
        technology: "Fused Deposition Modelling: heated nozzle melts thermoplastic filament (PLA, ABS) and deposits it layer by layer on build plate",
        consumables: "Filament spools (PLA, ABS, PETG, etc.), build surface (glass, PEI sheet)",
        maintenance: "Level/calibrate build plate; clean nozzle; replace nozzle when clogged; keep filament dry",
        bestFor: "Prototypes, custom parts, educational use; slow; requires CAD/slicer software; not a standard office printer",
      },
    },
  ],
};
