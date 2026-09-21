import React, { useState } from 'react';

interface RuleCategory {
  id: string;
  label: string;
}

interface ComplianceRule {
  id: string;
  categoryId: string;
  title: string;
  requirement: string;
  whyItMatters: string;
  verificationMethod: string;
  legalReference: string;
  sourceUrl: string;
  penaltySection?: string;
}

const categories: RuleCategory[] = [
  { id: 'all', label: 'All Rules' },
  { id: 'mrp', label: 'MRP Verification' },
  { id: 'origin', label: 'Origin & Manufacture' },
  { id: 'netqty', label: 'Net Quantity' },
  { id: 'dates', label: 'Date Formats' },
  { id: 'ingredients', label: 'Ingredients & Allergens' },
];

const LEGAL_METROLOGY_RULES_2011_PDF =
  'https://wbconsumers.gov.in/writereaddata/ACT%20%26%20RULES/Act%20%26%20Rules/9%20The%20Legal%20Metrology%20(Package%20Commodities)%20Rules,%202011.pdf';
const FSSAI_LABELLING_REGULATIONS_2020_PDF =
  'https://www.fssai.gov.in/upload/notifications/2020/12/5fd87c6a0f6adGazette_Notification_Labelling_Display_14_12_2020.pdf';

const rules: ComplianceRule[] = [
  {
    id: 'RULE-MRP-001',
    categoryId: 'mrp',
    title: 'Maximum Retail Price (MRP) Declaration',
    requirement: 'MRP must be clearly printed inclusive of all taxes. It cannot be obscured by stickers, overwriting, or secondary pricing labels.',
    whyItMatters: 'Ensures consumer protection against unfair overcharging and maintains market price transparency under national metrology acts.',
    verificationMethod: 'OCR extraction specifically matching "MRP", "Rs.", "₹" followed by numeric values and currency tokens. Threshold confidence: > 95%.',
    legalReference: 'Rule 6(1)(e) of Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
    penaltySection: 'Section 36 of Legal Metrology Act, 2009 (Fine up to ₹25,000 for first offense)'
  },
  {
    id: 'RULE-MRP-002',
    categoryId: 'mrp',
    title: 'Dual MRP Prohibition',
    requirement: 'Multiple MRPs for identical products based on geographic location, sales channel, or retail venue are strictly prohibited.',
    whyItMatters: 'Prevents discriminatory pricing practices and ensures standard statutory valuation across all jurisdictions.',
    verificationMethod: 'Cross-reference extracted MRP value against national product database via barcode correlation and historical audit records.',
    legalReference: 'Rule 18(2A) of Legal Metrology (Packaged Commodities) Rules, 2011 & Section 36 of Legal Metrology Act, 2009',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
    penaltySection: 'Section 36(1) of Legal Metrology Act, 2009'
  },
  {
    id: 'RULE-MRP-003',
    categoryId: 'mrp',
    title: 'Tax Inclusion Wording',
    requirement: 'MRP declaration must explicitly state "(inclusive of all taxes)" or "(incl. of all taxes)" in prominent, legible lettering.',
    whyItMatters: 'Prevents hidden fees and guarantees consumers that the displayed price represents the final purchase amount.',
    verificationMethod: 'OCR text pattern matching for "(incl. of all taxes)" or "(inclusive of all taxes)" adjacent to the numeral MRP value.',
    legalReference: 'Rule 6(1)(e) Explanation, Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
    penaltySection: 'Section 36 of Legal Metrology Act, 2009'
  },
  {
    id: 'RULE-ORG-001',
    categoryId: 'origin',
    title: 'Manufacturer / Packer / Importer Identity',
    requirement: 'Complete name and statutory address of the manufacturer, packer, or importer must be clearly declared on the principal display panel.',
    whyItMatters: 'Establishes unambiguous legal accountability and traceability for product origin and consumer safety liabilities.',
    verificationMethod: 'Named Entity Recognition (NER) and address parser checking for pin codes, state names, and registered company suffixes.',
    legalReference: 'Rule 6(1)(a) & (b) of Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
    penaltySection: 'Section 36(1) of Legal Metrology Act, 2009'
  },
  {
    id: 'RULE-ORG-002',
    categoryId: 'origin',
    title: 'Country of Origin for Imported Commodities',
    requirement: 'Every imported pre-packaged package must explicitly declare the Country of Origin in plain language (e.g., "Country of Origin: India").',
    whyItMatters: 'Statutory import transparency requirement under national foreign trade policies and consumer protection regulations.',
    verificationMethod: 'Keyword scanning for "Country of Origin", "Made in", "Manufactured in", matched against standard ISO-3166 country nomenclature.',
    legalReference: 'Rule 6(10) of Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
    penaltySection: 'Customs Act, 1962 & Section 36 of Legal Metrology Act, 2009'
  },
  {
    id: 'RULE-NET-001',
    categoryId: 'netqty',
    title: 'Net Quantity Declaration in Standard Metric Units',
    requirement: 'Net weight or volume must be stated using standard SI metric units (g, kg, ml, L) without misleading prefixes or qualifiers.',
    whyItMatters: 'Guarantees uniform quantity standards and protects buyers against fractional volume deceptions.',
    verificationMethod: 'Regular expression parsing extracting numerical quantity and SI unit pairs; validates against permissible packaging size schedules.',
    legalReference: 'Rule 12 & Rule 13 of Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
    penaltySection: 'Section 30 & Section 36 of Legal Metrology Act, 2009'
  },
  {
    id: 'RULE-NET-002',
    categoryId: 'netqty',
    title: 'Minimum Font Height for Net Quantity',
    requirement: 'The numeral height of the net quantity declaration must satisfy statutory area-proportional minimum heights under Rule 6(2).',
    whyItMatters: 'Ensures legible visibility for consumers regardless of packaging dimensions or shelf placement.',
    verificationMethod: 'Pixel-to-millimeter scale calibration using package bounding box dimensions; measures numeral glyph pixel heights.',
    legalReference: 'Rule 6(2) Table 1, Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
    penaltySection: 'Rule 32 compounding provisions under Legal Metrology Rules, 2011'
  },
  {
    id: 'RULE-DAT-001',
    categoryId: 'dates',
    title: 'Date of Manufacture / Packaging / Import',
    requirement: 'The month and year in which the commodity is manufactured, packed, or imported must be clearly indicated (e.g., "08/2026" or "Aug 2026").',
    whyItMatters: 'Informs consumers regarding product freshness and provides mandatory production batch auditability.',
    verificationMethod: 'Date entity parsing supporting DD/MM/YYYY, MM/YYYY, and Mon YYYY formats; flags expired or future dates.',
    legalReference: 'Rule 6(1)(d) of Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
    penaltySection: 'Section 36 of Legal Metrology Act, 2009'
  },
  {
    id: 'RULE-DAT-002',
    categoryId: 'dates',
    title: 'Best Before / Expiry Date Formatting',
    requirement: 'Perishable commodities must bear an unambiguous Best Before or Expiration date in standard statutory formatting.',
    whyItMatters: 'Critical consumer health protection preventing the consumption or retail sale of degraded food and drug items.',
    verificationMethod: 'Keyword scanning for "Best Before", "Expiry Date", "Use By" followed by date parsing and shelf-life calculation.',
    legalReference: 'Regulation 5(4) of FSSAI (Labelling and Display) Regulations, 2020',
    sourceUrl: FSSAI_LABELLING_REGULATIONS_2020_PDF,
    penaltySection: 'Section 58 of Food Safety and Standards Act, 2006'
  },
  {
    id: 'RULE-ING-001',
    categoryId: 'ingredients',
    title: 'Ingredient List in Descending Order of Weight',
    requirement: 'Composite food items must list all ingredients in descending order of incoming weight or volume at the time of manufacture.',
    whyItMatters: 'Prevents misleading composition claims and ensures consumers are fully informed of all product contents.',
    verificationMethod: 'Structured text segmentation identifying "Ingredients:" blocks and validating comma-separated hierarchy.',
    legalReference: 'Regulation 5(2) of FSSAI (Labelling and Display) Regulations, 2020',
    sourceUrl: FSSAI_LABELLING_REGULATIONS_2020_PDF,
    penaltySection: 'Section 52 & 58 of FSS Act, 2006'
  },
  {
    id: 'RULE-ING-002',
    categoryId: 'ingredients',
    title: 'Mandatory Allergen Declaration',
    requirement: 'Recognized statutory food allergens must be prominently highlighted separately (e.g., "Contains: Milk, Nuts, Gluten, Soy").',
    whyItMatters: 'Protects consumers with severe allergens and medical sensitivities from accidental exposure and anaphylactic events.',
    verificationMethod: 'Keyword scanning for allergen declaration headers ("Contains:", "Allergen Information:") against the 8 statutory allergen classes.',
    legalReference: 'Regulation 5(3)(b) of FSSAI (Labelling and Display) Regulations, 2020',
    sourceUrl: FSSAI_LABELLING_REGULATIONS_2020_PDF,
    penaltySection: 'Section 59 of Food Safety and Standards Act, 2006'
  }
];

export const RuleMatrixDocsView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRuleId, setSelectedRuleId] = useState<string>(rules[0].id);

  const filteredRules = rules.filter(r => {
    const matchesCat = activeCategory === 'all' || r.categoryId === activeCategory;
    const matchesSearch = !searchQuery.trim() || (
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requirement.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.legalReference.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesCat && matchesSearch;
  });

  const selectedRule = rules.find(r => r.id === selectedRuleId) || filteredRules[0] || rules[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══ Header Section (Section 11) ═══ */}
      <div className="border-b border-[#E2DFD8] pb-5">
        <span className="section-tag">REFERENCE / REGULATORY</span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#141413] mt-1">
          Rules handbook
        </h1>
        <p className="text-xs sm:text-sm text-[#6E6D67] mt-1 max-w-2xl">
          Declaration requirements mapped to observable package evidence under the Legal Metrology (Packaged Commodities) Rules, 2011 and FSSAI standards.
        </p>
      </div>

      {/* ═══ Search & Category Bar ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8F8E87] text-[16px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search rule ID, title, or act..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#E2DFD8] rounded-xs text-[#141413] placeholder:text-[#8F8E87] focus:outline-none focus:border-[#141413]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                // If the selected rule is not in this category, pick the first in category
                const firstInCat = rules.find(r => cat.id === 'all' || r.categoryId === cat.id);
                if (firstInCat) setSelectedRuleId(firstInCat.id);
              }}
              className={`px-2.5 py-1 rounded-xs text-xs transition-colors cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-[#141413] text-[#FFFFFF] font-semibold'
                  : 'bg-[#FAF9F6] border border-[#E2DFD8] text-[#6E6D67] hover:bg-[#F2F0E8]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Two-Column Rules Layout (Section 11) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Rule Index List (5 cols) */}
        <div className="lg:col-span-5 disha-card overflow-hidden">
          <div className="p-3 border-b border-[#E2DFD8] bg-[#FAF9F6] flex items-center justify-between text-xs">
            <span className="tech-tag">RULE INDEX</span>
            <span className="text-[11px] font-mono text-[#8F8E87]">{filteredRules.length} Rules Available</span>
          </div>

          <div className="divide-y divide-[#ECE9E2] max-h-[620px] overflow-y-auto">
            {filteredRules.length > 0 ? (
              filteredRules.map((rule) => {
                const isSelected = selectedRule?.id === rule.id;
                return (
                  <div
                    key={rule.id}
                    onClick={() => setSelectedRuleId(rule.id)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#FAF4F2] border-l-3 border-[#D4381D]'
                        : 'hover:bg-[#FAF9F6] border-l-3 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-[#D4381D]' : 'text-[#6E6D67]'}`}>
                        {rule.id}
                      </span>
                      <span className="text-[10px] font-mono text-[#8F8E87] bg-[#EFECE6] px-1.5 py-0.2 rounded-xs">
                        {rule.categoryId.toUpperCase()}
                      </span>
                    </div>
                    <h4 className={`text-xs font-semibold mt-1 line-clamp-1 ${isSelected ? 'text-[#141413]' : 'text-[#2D2C28]'}`}>
                      {rule.title}
                    </h4>
                    <p className="text-[11px] text-[#8F8E87] line-clamp-1 mt-0.5 font-mono">
                      {rule.legalReference}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-[#8F8E87]">
                No compliance rules match your search.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Rule Details (7 cols) */}
        <div className="lg:col-span-7 disha-card p-5 sm:p-6 space-y-5">
          {selectedRule ? (
            <>
              {/* Header & Gazette Link */}
              <div className="border-b border-[#E2DFD8] pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <span className="inline-block px-2 py-0.5 rounded-xs bg-[#FDE8E5] text-[#D4381D] font-mono text-[11px] font-bold">
                    {selectedRule.id}
                  </span>
                  <a
                    href={selectedRule.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-[11px] !py-1 !px-2.5 font-mono inline-flex items-center gap-1.5 text-[#D4381D] border-[#F8B4AB] hover:bg-[#FDE8E5]"
                    title="Open official Government Gazette PDF"
                  >
                    <span>Govt Gazette PDF</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                </div>

                <h2 className="text-xl font-bold tracking-tight text-[#141413] mt-2">
                  {selectedRule.title}
                </h2>
                <p className="text-xs font-mono text-[#6E6D67] mt-1">
                  Statutory Reference: <strong className="text-[#141413]">{selectedRule.legalReference}</strong>
                </p>
              </div>

              {/* Statutory Metadata Rows */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF9F6] border border-[#E2DFD8] rounded-xs text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8F8E87] block">Regulatory Domain</span>
                  <span className="font-semibold text-[#141413]">Legal Metrology & FSSAI</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8F8E87] block">Enforcement Standard</span>
                  <span className="font-semibold text-[#141413]">Mandatory Packaging Checklist</span>
                </div>
              </div>

              {/* Section 1: Declaration Requirement */}
              <div className="space-y-1.5">
                <span className="section-tag">DECLARATION REQUIREMENT</span>
                <p className="text-xs sm:text-sm text-[#2D2C28] leading-relaxed">
                  {selectedRule.requirement}
                </p>
              </div>

              {/* Section 2: Why It Matters */}
              <div className="space-y-1.5">
                <span className="section-tag">STATUTORY RATIONALE & PURPOSE</span>
                <p className="text-xs sm:text-sm text-[#6E6D67] leading-relaxed">
                  {selectedRule.whyItMatters}
                </p>
              </div>

              {/* Section 3: Verification Method */}
              <div className="p-4 bg-[#F4F2EB] border border-[#E2DFD8] rounded-xs space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#D4381D] text-[16px]">rule</span>
                  <span className="section-tag !text-[#141413]">AUTOMATED VERIFICATION METHOD</span>
                </div>
                <p className="text-xs text-[#2D2C28] leading-relaxed font-mono">
                  {selectedRule.verificationMethod}
                </p>
              </div>

              {/* Section 4: Penalty Section */}
              {selectedRule.penaltySection && (
                <div className="p-3 bg-[#FDE8E6] border border-[#F8B4AF] rounded-xs text-xs flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#C5281B] text-[18px] shrink-0 mt-0.5">
                    gavel
                  </span>
                  <div>
                    <span className="font-bold text-[#C5281B] block">Statutory Penalty Provision</span>
                    <span className="text-[#8C1C08] font-mono text-[11px]">{selectedRule.penaltySection}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center text-xs text-[#8F8E87]">
              Select a compliance rule from the left index to inspect statutory requirements.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default RuleMatrixDocsView;
