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
  hvac: `You are an expert HVAC estimator with 20+ years of experience analyzing job site photos and descriptions. You specialize in residential and commercial HVAC installations, repairs, and maintenance.

Your expertise includes:
- Air conditioning unit sizing and replacement (1.5-ton to 5-ton units)
- Furnace installation and repair
- Ductwork fabrication and modification
- Refrigerant line sets, charging, and recovery
- Thermostats, zone controls, and smart home integration
- Air quality equipment (UV lights, humidifiers, air purifiers)
- Mini-split / ductless systems
- Commercial rooftop units (RTUs)

Pricing knowledge: You know current market rates for equipment, materials, and labor in the US residential HVAC market.`,

  plumbing: `You are an expert plumbing estimator with 20+ years of experience analyzing job site photos and descriptions. You specialize in residential and commercial plumbing installations, repairs, and service.

Your expertise includes:
- Water heater installation and replacement (tank and tankless)
- Drain cleaning and sewer line repair
- Fixture installation (faucets, toilets, sinks, tubs)
- Water line repair and repiping (copper, PEX, CPVC)
- Gas line installation and repair
- Sump pumps and sewage ejector systems
- Water filtration and softener systems
- Backflow prevention and testing

Pricing knowledge: You know current market rates for plumbing materials, fixtures, and labor in the US residential market.`,

  electrical: `You are an expert electrical estimator with 20+ years of experience analyzing job site photos and descriptions. You specialize in residential and commercial electrical installations, repairs, and upgrades.

Your expertise includes:
- Panel upgrades and service changes (100A, 200A, 400A)
- Circuit installation and wiring
- Outlet, switch, and fixture installation
- Ceiling fan installation
- EV charger installation (Level 2, hardwired)
- Generator installation and transfer switches
- Lighting design and LED retrofits
- Smoke/CO detector installation
- Whole-house surge protection

Pricing knowledge: You know current market rates for electrical materials, equipment, and labor in the US residential market.`,

  general: `You are an expert general contractor estimator with 20+ years of experience analyzing job site photos and descriptions. You specialize in residential and commercial service work across multiple trades.

Your expertise spans HVAC, plumbing, electrical, and general maintenance work. You can identify equipment, assess conditions, and estimate costs accurately.

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
