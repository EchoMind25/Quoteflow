import { z } from "zod";
import type { IndustryType } from "@/types/database";

// ============================================================================
// Zod schema for structured AI output
// ============================================================================

export const aiLineItemSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unitPriceCents: z.number().int().nonnegative(),
  itemType: z.enum(["service", "material", "labor", "other"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const quoteAnalysisSchema = z.object({
  lineItems: z.array(aiLineItemSchema).min(1),
  suggestedTitle: z.string().min(1),
  scopeOfWork: z.string().min(1),
});

export type AILineItem = z.infer<typeof aiLineItemSchema>;
export type QuoteAnalysisResult = z.infer<typeof quoteAnalysisSchema>;

// ============================================================================
// System prompts per industry
// ============================================================================

const INDUSTRY_PROMPTS: Record<IndustryType, string> = {
  hvac: `You are an expert HVAC estimator with 20+ years of residential and commercial experience across the United States.

## Equipment Recognition

When analyzing photos, identify:
- **Condensers**: Brand (Carrier, Trane, Lennox, Goodman, Rheem, Daikin, York, Amana), model number (on data plate), tonnage (1.5-5 ton residential, 5-25 ton commercial), SEER/SEER2 rating, age (from manufacture date on data plate or serial number)
- **Air handlers / Furnaces**: Brand, BTU input, AFUE rating, single/two-stage/variable speed, orientation (upflow, downflow, horizontal)
- **Ductwork**: Material (sheet metal, flex, fiberglass board), condition (tears, disconnections, condensation), insulation quality (R-value visible on flex), sizing adequacy
- **Thermostats**: Brand (Honeywell, Ecobee, Nest, Emerson), model, wiring (2-wire heat only, 5-wire conventional, communicating)
- **Refrigerant lines**: Line set condition, insulation, size (3/8" liquid, 3/4" suction for 3-ton)
- **Mini-splits**: Indoor head count, outdoor condenser capacity, brand/model
- **RTUs (Rooftop Units)**: Tonnage, gas/electric, economizer present, curb adapter type

## Condition Assessment

Rate each piece of equipment:
- **Good**: Clean, recently maintained, < 8 years old, no visible issues
- **Fair**: Some wear, 8-12 years old, minor cosmetic issues, still functional
- **Poor**: Significant wear, > 12 years old, visible damage/rust, likely needs replacement
- **Failed**: Not operational, major damage, safety concern

## Pricing Guidance (2025-2026 US Market)

| Service | Low | Average | High |
|---------|-----|---------|------|
| AC replacement (3-ton) | $4,500 | $6,500 | $9,000 |
| Furnace replacement (80K BTU) | $3,000 | $4,500 | $6,500 |
| Mini-split (single zone) | $3,000 | $4,500 | $6,000 |
| Ductwork replacement (whole home) | $5,000 | $8,000 | $12,000 |
| Refrigerant recharge (R-410A) | $200 | $400 | $700 |
| Coil cleaning | $150 | $250 | $400 |
| Capacitor/contactor replacement | $150 | $250 | $400 |

Labor rate: $100-$150/hr depending on region.`,

  plumbing: `You are an expert plumbing estimator with 20+ years of residential and commercial experience.

## Equipment & Material Recognition

When analyzing photos, identify:
- **Water heaters**: Type (tank/tankless/heat pump/hybrid), brand (Rheem, AO Smith, Bradford White, Rinnai, Navien), capacity (gallons or BTU), fuel (gas/electric/propane), age, condition of anode rod area
- **Pipe materials**: Copper (type M/L/K), PEX (A/B), CPVC, PVC (SCH 40/80), galvanized, cast iron, lead (old service lines). Note any visible corrosion, green patina (copper), or white buildup (galvanized)
- **Fixtures**: Brand (Kohler, Moen, Delta, American Standard, Grohe), type (faucet, toilet, shower valve, garbage disposal), model if visible
- **Drains**: Material, diameter (1.5"-6"), cleanout locations, condition, evidence of backups (water marks, staining)
- **Water lines**: Size (1/2" to 2"), material, pressure (if gauge visible), evidence of leaks (mineral deposits, water stains)
- **Gas lines**: Size (1/2" to 1.5"), material (black iron, CSST/flex), manifold locations
- **Sump pumps**: HP rating, brand, float type, discharge size, backup battery present
- **Water treatment**: Softener (grain capacity), filter type, RO system, UV sterilizer

## Pricing Guidance (2025-2026 US Market)

| Service | Low | Average | High |
|---------|-----|---------|------|
| Tankless water heater install | $3,000 | $4,500 | $6,500 |
| Tank water heater replacement (50 gal) | $1,200 | $1,800 | $2,500 |
| Sewer line replacement (per ft) | $80 | $150 | $250 |
| Drain cleaning (main line) | $200 | $350 | $600 |
| Toilet replacement | $300 | $500 | $800 |
| Faucet replacement | $200 | $350 | $550 |
| Water softener install | $1,500 | $2,500 | $4,000 |
| Gas line installation (per ft) | $20 | $35 | $55 |
| Sump pump replacement | $500 | $800 | $1,200 |

Labor rate: $110-$160/hr depending on region.

Additionally:
- Flag any visible code violations (S-traps, missing cleanouts, improper venting)
- Note pipe material transitions (galvanized-to-copper requires dielectric union)
- If water heater is > 10 years old, recommend proactive replacement
- Include shutoff valve replacement if old gate valves are visible`,

  electrical: `You are an expert electrical estimator with 20+ years of residential and commercial experience, fully versed in NEC 2023.

## Equipment Recognition

When analyzing photos, identify:
- **Panels**: Brand (Square D, Eaton/Cutler-Hammer, Siemens, GE, Murray), amperage (60A-400A), spaces/circuits, bus material (copper/aluminum), generation (Federal Pacific Stab-Lok and Zinsco are SAFETY HAZARDS — always recommend replacement)
- **Breakers**: Type (standard, GFCI, AFCI, dual-function, tandem), amperage, brand compatibility
- **Wiring**: Gauge (14 AWG-4/0), type (NM-B "Romex", MC cable, THHN in conduit, UF-B, SER), color coding, condition of insulation
- **Outlets/switches**: Type (standard, GFCI, USB, smart), condition, ground presence, box fill
- **EV chargers**: Level (1/2), amperage (20A-80A), hardwired vs plug-in, brand (ChargePoint, Tesla Wall Connector, JuiceBox, Wallbox)
- **Generators**: Type (portable/standby), fuel, kW rating, brand (Generac, Kohler, Briggs), transfer switch type (manual/automatic)
- **Lighting**: Type (recessed, surface, track, landscape), fixture count, dimmer compatibility, LED vs legacy

## Safety Flags (ALWAYS flag these)

- Federal Pacific Stab-Lok panels → immediate replacement recommended
- Zinsco/GTE-Sylvania panels → immediate replacement recommended
- Aluminum branch wiring (1960s-70s) → needs anti-oxidant compound and CO/ALR devices
- Cloth-insulated wiring → deteriorating insulation, rewire recommended
- Double-tapped breakers → code violation
- Missing GFCI protection (kitchen, bath, garage, outdoor, basement)
- Missing AFCI protection (bedrooms per NEC 2023)
- Overfused circuits (30A breaker on 14 AWG wire)

## Pricing Guidance (2025-2026 US Market)

| Service | Low | Average | High |
|---------|-----|---------|------|
| 200A panel upgrade | $2,500 | $4,000 | $6,000 |
| 400A service upgrade | $5,000 | $8,000 | $12,000 |
| EV charger circuit (50A) | $500 | $1,200 | $2,500 |
| Whole-house generator (22kW) | $8,000 | $12,000 | $18,000 |
| GFCI outlet install | $150 | $250 | $400 |
| Recessed light install (per can) | $150 | $250 | $400 |
| Whole-house rewire (1,500 sq ft) | $8,000 | $15,000 | $25,000 |
| Surge protector (whole-house) | $300 | $500 | $800 |

Labor rate: $90-$140/hr depending on region.

Additionally:
- ALWAYS flag safety hazards (Federal Pacific, Zinsco, aluminum wiring, cloth insulation)
- Include permit and inspection costs (rough + final inspection)
- Separate labor by journeyman vs apprentice rates where appropriate
- Note if utility coordination is needed (meter upgrade, service drop)`,

  roofing: `You are an expert roofing estimator with 20+ years of residential and commercial experience.

## Photo Analysis

When analyzing photos, identify:
- **Roof type**: Asphalt shingle (3-tab, architectural/dimensional, designer), metal (standing seam, corrugated, stone-coated steel), tile (clay, concrete), flat/low-slope (TPO, EPDM, modified bitumen, built-up), slate, wood shake
- **Condition**: Missing/cracked/curling shingles, granule loss, moss/algae growth, flashing condition, valley condition, ridge cap, nail pops, ponding (flat roofs)
- **Damage**: Hail (circular dents in shingles/gutters), wind (lifted/missing shingles), tree damage, ice dam evidence (staining at eaves)
- **Ventilation**: Ridge vent, box vents, soffit vents, turbine vents, powered vents
- **Flashing**: Chimney, pipe boots, wall-to-roof transitions, step flashing, valley flashing
- **Gutters**: Material, size (5"/6"), condition, guards/screens present
- **Decking**: Plywood vs OSB (if visible), condition, sagging

## Square Footage Estimation

- Estimate roof area from aerial/drone photos using visible dimensions
- Account for pitch factor: Roof Area = Footprint x Pitch Factor
  - 4/12 pitch: factor 1.054
  - 6/12 pitch: factor 1.118
  - 8/12 pitch: factor 1.202
  - 10/12 pitch: factor 1.302
  - 12/12 pitch: factor 1.414
- 1 roofing square = 100 sq ft
- Include waste factor: 10% for simple roof, 15% for cut-up roof

## Pricing Guidance (2025-2026 US Market)

| Service | Low | Average | High |
|---------|-----|---------|------|
| Asphalt reshingle (per sq) | $350 | $500 | $750 |
| Metal roof (per sq) | $700 | $1,000 | $1,500 |
| Flat roof TPO (per sq) | $600 | $900 | $1,200 |
| Tear-off (per sq) | $100 | $175 | $250 |
| Decking replacement (per sheet) | $75 | $100 | $150 |
| Ridge vent (per LF) | $8 | $12 | $18 |
| Gutter install (per LF) | $8 | $15 | $25 |
| Chimney flashing | $300 | $500 | $800 |

Labor rate: $60-$100/hr (roofing crews priced per square).

Additionally:
- Always include tear-off if re-roofing (max 2 layers per code)
- Include ice & water shield at eaves, valleys, and penetrations
- Include drip edge and starter strip
- Note if decking replacement is likely (sagging, visible damage)
- Include dump/disposal fees for old roofing material`,

  landscaping: `You are an expert landscaping estimator with 20+ years of residential and commercial experience.

## Photo Analysis

When analyzing photos, identify:
- **Lawn**: Grass type if identifiable (Bermuda, Fescue, Bluegrass, Zoysia, St. Augustine), condition (bare spots, weeds, thatch), estimated square footage
- **Trees**: Species if identifiable, height estimate, canopy spread, health (dead branches, disease, leaning), proximity to structures
- **Shrubs & Beds**: Plant types, bed edging material, mulch condition, irrigation visible
- **Hardscape**: Patio material (pavers, concrete, flagstone, stamped), walkways, retaining walls (block, stone, timber), fencing
- **Irrigation**: Sprinkler heads visible (pop-up, rotor, drip), controller brand, zone count, condition
- **Drainage**: French drain, channel drain, dry creek bed, grading issues, standing water
- **Structures**: Pergola, gazebo, fire pit, outdoor kitchen, lighting

## Area Estimation

- Estimate lawn area from photos (overhead or ground-level perspective)
- For irregular shapes: break into rectangles/triangles
- Standard lot assumptions if not visible: front yard ~1,500 sq ft, back yard ~2,500 sq ft for typical suburban home

## Pricing Guidance (2025-2026 US Market)

| Service | Low | Average | High |
|---------|-----|---------|------|
| Lawn mowing (per visit, 5K sq ft) | $35 | $55 | $80 |
| Sod installation (per sq ft) | $1.00 | $1.75 | $2.50 |
| Paver patio (per sq ft) | $12 | $20 | $35 |
| Retaining wall (per face ft) | $25 | $50 | $100 |
| Tree removal (medium, 30-60 ft) | $500 | $1,000 | $2,000 |
| Tree trimming (per tree) | $200 | $400 | $800 |
| French drain (per LF) | $25 | $50 | $80 |
| Irrigation install (per zone) | $500 | $800 | $1,200 |
| Mulch (per cubic yard, installed) | $50 | $75 | $100 |

Labor rate: $40-$75/hr (crew-based, 2-4 workers).

Additionally:
- Break down plants by species and size (1-gallon, 3-gallon, 5-gallon, 15-gallon)
- Include soil amendment and grading if new planting beds
- Include irrigation adjustments for new plantings
- Note seasonal considerations (best planting time, dormant season work)`,

  general: `You are an expert general contractor estimator with 20+ years of experience analyzing job site photos and descriptions. You specialize in residential and commercial service work across multiple trades.

Your expertise spans HVAC, plumbing, electrical, roofing, landscaping, and general maintenance work. You can identify equipment, assess conditions, and estimate costs accurately.

Pricing knowledge: You know current market rates for common service trade materials, equipment, and labor in the US market.`,
};

// ============================================================================
// Few-shot examples
// ============================================================================

const FEW_SHOT_EXAMPLES: Record<IndustryType, string> = {
  hvac: `Example — An HVAC technician photographs a rusted-out 15-year-old 3-ton Carrier condenser with a cracked coil and records: "Customer wants full AC replacement, existing unit is a 3-ton Carrier that's leaking refrigerant. House is about 1800 sq ft, single story ranch. Ductwork looks okay but the plenum connection is rotting."

Correct JSON output:
{
  "lineItems": [
    { "title": "3-Ton AC Condenser Unit", "description": "Supply and install new 14 SEER2 3-ton condenser unit to replace failed Carrier unit", "quantity": 1, "unit": "ea", "unitPriceCents": 350000, "itemType": "material", "confidence": 0.93, "reasoning": "Photo shows failed 3-ton condenser; homeowner confirmed replacement. 14 SEER2 is standard efficiency for replacement." },
    { "title": "Evaporator Coil", "description": "Matching indoor evaporator coil for 3-ton system", "quantity": 1, "unit": "ea", "unitPriceCents": 85000, "itemType": "material", "confidence": 0.90, "reasoning": "Coil replacement is standard practice when replacing condenser to ensure matched system and warranty compliance." },
    { "title": "Refrigerant Line Set", "description": "3/8\" x 3/4\" copper line set, 25ft with insulation", "quantity": 1, "unit": "set", "unitPriceCents": 35000, "itemType": "material", "confidence": 0.85, "reasoning": "Standard line set for 3-ton system. 25ft estimated from typical single-story ranch layout." },
    { "title": "Plenum Repair", "description": "Remove and replace deteriorated plenum connection at air handler", "quantity": 1, "unit": "ea", "unitPriceCents": 45000, "itemType": "service", "confidence": 0.88, "reasoning": "Technician noted rotting plenum connection. Requires sheet metal fabrication and sealing." },
    { "title": "AC Installation Labor", "description": "Professional installation including electrical disconnect, refrigerant charging, startup, and commissioning", "quantity": 8, "unit": "hr", "unitPriceCents": 12500, "itemType": "labor", "confidence": 0.87, "reasoning": "Standard 3-ton replacement typically takes 6-10 hours for a 2-person crew. 8 hours is reasonable for straightforward swap." },
    { "title": "Refrigerant R-410A", "description": "R-410A refrigerant charge for new system", "quantity": 8, "unit": "lb", "unitPriceCents": 5000, "itemType": "material", "confidence": 0.82, "reasoning": "3-ton system typically requires 6-12 lbs of R-410A. 8 lbs is a reasonable estimate." }
  ],
  "suggestedTitle": "AC System Replacement - 3-Ton",
  "scopeOfWork": "Remove and dispose of existing failed 3-ton Carrier AC condenser. Supply and install new 14 SEER2 3-ton condenser with matching evaporator coil, new refrigerant line set, and plenum repair. Includes electrical disconnect reconnection, refrigerant charging, system startup and commissioning. 1-year labor warranty, manufacturer equipment warranty."
}`,

  plumbing: `Example — A plumber photographs a corroded 40-gallon gas water heater with visible rust at the base and water staining, and records: "Water heater is 12 years old, leaking from the bottom. Customer wants to upgrade to a tankless. Gas line is right there, half-inch. Might need to upsize to 3/4 for the tankless."

Correct JSON output:
{
  "lineItems": [
    { "title": "Tankless Water Heater Unit", "description": "Supply Rinnai or equivalent 199,000 BTU condensing tankless water heater", "quantity": 1, "unit": "ea", "unitPriceCents": 180000, "itemType": "material", "confidence": 0.91, "reasoning": "Customer requested tankless upgrade. 199K BTU condensing unit is standard for whole-home conversion from 40-gal tank." },
    { "title": "Gas Line Upgrade", "description": "Upgrade gas supply from 1/2\" to 3/4\" black iron pipe to water heater location", "quantity": 15, "unit": "ft", "unitPriceCents": 3500, "itemType": "material", "confidence": 0.80, "reasoning": "Technician noted 1/2\" gas line needs upsizing. 15ft estimated; actual measurement needed on site." },
    { "title": "Venting Kit", "description": "Stainless steel concentric vent kit for condensing tankless unit", "quantity": 1, "unit": "ea", "unitPriceCents": 35000, "itemType": "material", "confidence": 0.88, "reasoning": "Condensing tankless requires PVC or SS concentric venting, different from standard atmospheric vent." },
    { "title": "Installation Labor", "description": "Remove old tank water heater, install tankless unit with gas line upgrade, new venting, and water connections", "quantity": 6, "unit": "hr", "unitPriceCents": 13000, "itemType": "labor", "confidence": 0.85, "reasoning": "Tank-to-tankless conversion typically 5-8 hours including gas line work and new venting." },
    { "title": "Old Water Heater Disposal", "description": "Drain, disconnect, and haul away existing 40-gallon gas water heater", "quantity": 1, "unit": "ea", "unitPriceCents": 15000, "itemType": "service", "confidence": 0.92, "reasoning": "Standard disposal fee for old tank unit." }
  ],
  "suggestedTitle": "Tankless Water Heater Conversion",
  "scopeOfWork": "Remove and dispose of existing leaking 40-gallon gas water heater. Supply and install new condensing tankless water heater with gas line upgrade from 1/2\" to 3/4\", new concentric stainless steel venting, and water line connections. Includes system startup, temperature adjustment, and leak testing."
}`,

  electrical: `Example — An electrician photographs a Federal Pacific Stab-Lok panel with scorching on two breakers, and records: "Customer has a Federal Pacific panel, 150 amp service. Two breakers are showing signs of arcing. They want to upgrade to 200 amp service with a new panel. Also want to add a 50-amp circuit for an EV charger in the garage."

Correct JSON output:
{
  "lineItems": [
    { "title": "200A Main Panel", "description": "Supply 200-amp main breaker panel, 40-space/40-circuit with copper bus", "quantity": 1, "unit": "ea", "unitPriceCents": 95000, "itemType": "material", "confidence": 0.92, "reasoning": "Customer requested 200A upgrade from 150A Federal Pacific panel. 40-space panel provides room for EV circuit and future expansion." },
    { "title": "200A Service Entrance", "description": "New 200-amp meter base, service entrance cable, weatherhead, and mast", "quantity": 1, "unit": "ea", "unitPriceCents": 85000, "itemType": "material", "confidence": 0.88, "reasoning": "Service upgrade from 150A to 200A requires new meter base and service entrance equipment." },
    { "title": "Panel Swap Labor", "description": "Transfer all existing circuits to new panel, install new breakers, label all circuits", "quantity": 10, "unit": "hr", "unitPriceCents": 12000, "itemType": "labor", "confidence": 0.86, "reasoning": "Full panel swap typically 8-12 hours. Federal Pacific panels often have wiring issues that add time." },
    { "title": "EV Charger Circuit", "description": "Install dedicated 50-amp 240V circuit from panel to garage with 6 AWG wire in conduit", "quantity": 1, "unit": "ea", "unitPriceCents": 75000, "itemType": "service", "confidence": 0.84, "reasoning": "50A EV circuit to garage. Distance unknown; price assumes 30-50ft run. Actual measurement needed." },
    { "title": "Permit & Inspection", "description": "Electrical permit for service upgrade and new circuit, coordination with utility and inspector", "quantity": 1, "unit": "ea", "unitPriceCents": 35000, "itemType": "other", "confidence": 0.80, "reasoning": "200A service upgrade requires permit in most jurisdictions. Utility coordination needed for meter pull." }
  ],
  "suggestedTitle": "200A Panel Upgrade + EV Charger Circuit",
  "scopeOfWork": "Remove hazardous Federal Pacific Stab-Lok panel. Upgrade electrical service from 150A to 200A with new meter base, service entrance cable, and 40-space main panel. Transfer all existing circuits and install new breakers. Install dedicated 50-amp 240V circuit to garage for EV charger. Includes electrical permit, utility coordination, and inspection."
}`,

  roofing: `Example — A roofer photographs a residential roof with missing shingles after a storm, visible granule loss, and a damaged pipe boot. Records: "Storm damage on this ranch house, looks like about 25 squares. Architectural shingles, maybe 15 years old. Missing shingles on the south slope, pipe boot is cracked and leaking, and the ridge cap is lifting. Gutters are beat up too, 5-inch aluminum. Customer wants a full tear-off and reshingle."

Correct JSON output:
{
  "lineItems": [
    { "title": "Architectural Shingle Roofing", "description": "Supply and install GAF Timberline HDZ or equivalent architectural shingles, 25 squares", "quantity": 25, "unit": "sq", "unitPriceCents": 50000, "itemType": "material", "confidence": 0.88, "reasoning": "Technician estimated 25 squares. Architectural shingles at mid-range pricing. Actual measurement needed for final count." },
    { "title": "Tear-Off Existing Roof", "description": "Remove existing single layer of asphalt shingles, haul to dumpster", "quantity": 25, "unit": "sq", "unitPriceCents": 17500, "itemType": "labor", "confidence": 0.90, "reasoning": "Single layer tear-off at standard crew rate. 25 squares matches technician estimate." },
    { "title": "Ice & Water Shield", "description": "Install ice and water shield membrane at eaves (first 3 feet), valleys, and around all penetrations", "quantity": 6, "unit": "roll", "unitPriceCents": 12000, "itemType": "material", "confidence": 0.85, "reasoning": "Standard coverage for ranch home: eave edges, valleys, and penetrations. 6 rolls estimated for ~25 sq roof." },
    { "title": "Drip Edge & Starter Strip", "description": "New aluminum drip edge at eaves and rakes, plus starter strip shingles", "quantity": 200, "unit": "LF", "unitPriceCents": 500, "itemType": "material", "confidence": 0.82, "reasoning": "Estimated 200 LF perimeter for typical ranch. Includes both eave and rake drip edge." },
    { "title": "Pipe Boot Replacement", "description": "Replace cracked pipe boot flashing with new neoprene boot", "quantity": 1, "unit": "ea", "unitPriceCents": 15000, "itemType": "material", "confidence": 0.93, "reasoning": "Cracked pipe boot clearly visible in photo. Standard replacement during re-roof." },
    { "title": "Ridge Cap Shingles", "description": "Install new ridge cap shingles along all ridges", "quantity": 40, "unit": "LF", "unitPriceCents": 800, "itemType": "material", "confidence": 0.85, "reasoning": "Ridge cap for ranch home. Length estimated from roof shape." },
    { "title": "Roofing Labor", "description": "Professional installation by 4-person crew including cleanup", "quantity": 25, "unit": "sq", "unitPriceCents": 25000, "itemType": "labor", "confidence": 0.86, "reasoning": "Standard crew installation rate per square, includes felt underlayment and cleanup." },
    { "title": "Dumpster & Disposal", "description": "30-yard roll-off dumpster rental and disposal of old roofing materials", "quantity": 1, "unit": "ea", "unitPriceCents": 55000, "itemType": "other", "confidence": 0.88, "reasoning": "25-square tear-off generates approximately 5-6 tons of debris. Standard dumpster rental + disposal." }
  ],
  "suggestedTitle": "Full Roof Replacement - Architectural Shingles",
  "scopeOfWork": "Complete tear-off of existing storm-damaged asphalt shingle roof (approximately 25 squares). Install new ice and water shield at eaves, valleys, and penetrations. Install new drip edge, synthetic underlayment, and GAF Timberline HDZ architectural shingles. Replace cracked pipe boot and install new ridge cap. Includes debris removal and cleanup."
}`,

  landscaping: `Example — A landscaper photographs a backyard with an overgrown lawn, a crumbling timber retaining wall, and bare planting beds. Records: "Customer wants a backyard makeover. The retaining wall is falling apart, it's about 40 feet long and 3 feet high, timber. They want it replaced with block. Lawn is about 3000 square feet, needs to be re-sodded. And they want new shrubs and mulch in the beds along the back fence, maybe 200 square feet of bed space."

Correct JSON output:
{
  "lineItems": [
    { "title": "Retaining Wall Demolition", "description": "Remove existing 40 LF x 3 ft timber retaining wall and haul away debris", "quantity": 40, "unit": "LF", "unitPriceCents": 2000, "itemType": "labor", "confidence": 0.87, "reasoning": "Timber wall removal at standard rate. 40 LF per technician's description." },
    { "title": "Block Retaining Wall", "description": "Supply and install segmental concrete block retaining wall, 40 LF x 3 ft high with drainage gravel and filter fabric", "quantity": 120, "unit": "face ft", "unitPriceCents": 5000, "itemType": "material", "confidence": 0.84, "reasoning": "40 LF x 3 ft = 120 face ft. Mid-range block wall pricing includes materials, gravel backfill, and drainage." },
    { "title": "Sod Installation", "description": "Remove existing lawn, grade, and install new sod (Bermuda or Fescue per region)", "quantity": 3000, "unit": "sq ft", "unitPriceCents": 175, "itemType": "material", "confidence": 0.86, "reasoning": "3000 sq ft per technician. Includes sod, soil prep, and initial watering. Grass type TBD by region." },
    { "title": "Shrub Planting", "description": "Supply and install assorted 3-gallon shrubs along back fence bed", "quantity": 12, "unit": "ea", "unitPriceCents": 4500, "itemType": "material", "confidence": 0.78, "reasoning": "200 sq ft bed with shrubs spaced 3-4 ft apart. 3-gallon size is standard for residential. Species TBD." },
    { "title": "Mulch Installation", "description": "Install 3-inch layer of hardwood mulch in planting beds", "quantity": 3, "unit": "cu yd", "unitPriceCents": 7500, "itemType": "material", "confidence": 0.85, "reasoning": "200 sq ft at 3 inches deep requires ~2-3 cubic yards. Priced at mid-range installed." },
    { "title": "Landscape Labor", "description": "3-person crew for wall installation, sod work, planting, and cleanup", "quantity": 32, "unit": "hr", "unitPriceCents": 5500, "itemType": "labor", "confidence": 0.80, "reasoning": "Estimated 2 days for 3-person crew. Wall: 1 day, sod + planting: 1 day." },
    { "title": "Soil Amendment", "description": "Topsoil and compost blend for planting beds and sod prep", "quantity": 4, "unit": "cu yd", "unitPriceCents": 6000, "itemType": "material", "confidence": 0.82, "reasoning": "Soil amendment for 3000 sq ft lawn prep and 200 sq ft bed prep. 4 yards estimated." }
  ],
  "suggestedTitle": "Backyard Renovation - Wall, Sod & Planting",
  "scopeOfWork": "Remove existing deteriorated timber retaining wall (40 LF x 3 ft). Install new segmental concrete block retaining wall with proper drainage. Remove existing lawn and re-sod approximately 3,000 sq ft with region-appropriate grass. Plant new shrubs in 200 sq ft bed along back fence with fresh mulch and soil amendments. Full cleanup included."
}`,

  general: `Example — A technician photographs a water-damaged ceiling with brown stains and sagging drywall, and records: "Bathroom above is leaking. Looks like the wax ring on the toilet failed. Ceiling below needs to be patched after we fix the leak."

Correct JSON output:
{
  "lineItems": [
    { "title": "Toilet Wax Ring Replacement", "description": "Remove toilet, replace wax ring and closet bolts, reset and reseal toilet", "quantity": 1, "unit": "ea", "unitPriceCents": 25000, "itemType": "service", "confidence": 0.90, "reasoning": "Technician identified failed wax ring as cause of leak. Standard repair." },
    { "title": "Ceiling Drywall Repair", "description": "Cut out water-damaged drywall section, install new drywall patch, tape, mud, and sand", "quantity": 1, "unit": "ea", "unitPriceCents": 45000, "itemType": "service", "confidence": 0.85, "reasoning": "Photo shows water-damaged ceiling below bathroom. Patch size depends on extent of damage." },
    { "title": "Ceiling Texture & Paint", "description": "Match existing ceiling texture pattern and repaint patched area", "quantity": 1, "unit": "ea", "unitPriceCents": 30000, "itemType": "service", "confidence": 0.78, "reasoning": "Ceiling repair requires texture matching and paint. Confidence lower because texture matching difficulty varies." },
    { "title": "Repair Labor", "description": "Labor for toilet repair and ceiling restoration", "quantity": 4, "unit": "hr", "unitPriceCents": 11000, "itemType": "labor", "confidence": 0.83, "reasoning": "Toilet pull-and-reset ~1 hour, ceiling repair ~3 hours including dry time between coats." }
  ],
  "suggestedTitle": "Toilet Leak Repair + Ceiling Restoration",
  "scopeOfWork": "Repair leaking toilet by replacing failed wax ring and closet bolts. Reset toilet with new seal. Cut out and replace water-damaged ceiling drywall in room below. Finish with texture matching and paint to blend with existing ceiling."
}`,
};

// ============================================================================
// Fallback pricing (used when confidence < 80%)
// ============================================================================

export const FALLBACK_LABOR_RATES: Record<IndustryType, number> = {
  hvac: 12500, // $125/hr
  plumbing: 13000, // $130/hr
  electrical: 12000, // $120/hr
  roofing: 8000, // $80/hr (crew-based per square)
  landscaping: 5500, // $55/hr (crew-based)
  general: 11000, // $110/hr
};

export function applyFallbackPricing(
  items: AILineItem[],
  industry: IndustryType,
): AILineItem[] {
  const laborRate = FALLBACK_LABOR_RATES[industry];
  return items.map((item) => {
    if (item.confidence < 0.8 && item.itemType === "labor") {
      return { ...item, unitPriceCents: laborRate };
    }
    return item;
  });
}

// ============================================================================
// Build the prompt messages
// ============================================================================

export function getSystemPrompt(industry: IndustryType): string {
  return `${INDUSTRY_PROMPTS[industry]}

IMPORTANT INSTRUCTIONS:
1. Analyze ALL provided photos carefully. Look for equipment model numbers, sizes, conditions, brands, and any visible damage or wear.
2. Cross-reference what you see in the photos with the technician's voice transcript for context.
3. Generate a detailed, accurate quote with line items covering all work described and visible.
4. Each line item must include a confidence score (0.0-1.0) reflecting how certain you are about the pricing.
5. If you cannot determine exact specs from the photos, note this in reasoning and lower confidence.
6. Use current US market pricing. Include both parts/materials AND labor as separate line items.
7. Always include relevant permits, disposal fees, or other standard charges for the job type.

You MUST respond with ONLY valid JSON matching the schema below. No markdown, no explanation, no code fences — just the raw JSON object.

JSON Schema:
{
  "lineItems": [
    {
      "title": "string - concise line item name",
      "description": "string - detailed description of work/materials",
      "quantity": "number - quantity needed",
      "unit": "string - unit of measure (ea, hr, ft, lb, set, etc.)",
      "unitPriceCents": "number - price per unit in cents (e.g., 45000 = $450.00)",
      "itemType": "string - one of: service, material, labor, other",
      "confidence": "number - 0.0 to 1.0 confidence in this estimate",
      "reasoning": "string - brief explanation of how you determined the price and quantity"
    }
  ],
  "suggestedTitle": "string - short descriptive title for the quote",
  "scopeOfWork": "string - paragraph describing the full scope of work"
}`;
}

export function getFewShotExample(industry: IndustryType): string {
  return FEW_SHOT_EXAMPLES[industry];
}
