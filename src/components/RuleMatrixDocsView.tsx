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
}

const categories: RuleCategory[] = [
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
    requirement: 'MRP must be clearly printed inclusive of all taxes. It cannot be obscured by stickers, overwriting, or additional secondary pricing.',
    whyItMatters: 'Ensures consumer protection against unfair overcharging and maintains market price transparency under national metrology acts.',
    verificationMethod: 'OCR extraction specifically looking for "MRP", "Rs.", "₹" followed by numeric values. Confidence threshold: > 95%.',
    legalReference: 'Rule 6(1)(e) of Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
  },
  {
    id: 'RULE-MRP-002',
    categoryId: 'mrp',
    title: 'Dual MRP Prohibition',
    requirement: 'Multiple MRPs for identical products based on geographic location, sales channel, or retail venue are strictly prohibited.',
    whyItMatters: 'Prevents discriminatory pricing practices and ensures standard statutory valuation across all jurisdictions.',
    verificationMethod: 'Cross-reference extracted MRP value against national product database via barcode correlation.',
    legalReference: 'Rule 18(2A) of Legal Metrology (Packaged Commodities) Rules, 2011 & Section 36 of Legal Metrology Act, 2009',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
  },
  {
    id: 'RULE-MRP-003',
    categoryId: 'mrp',
    title: 'Tax Inclusion Wording',
    requirement: 'MRP must explicitly state "(inclusive of all taxes)" or "(incl. of all taxes)" in prominent, readable lettering.',
    whyItMatters: 'Prevents hidden fees and guarantees consumers that the displayed price represents the final purchase amount.',
    verificationMethod: 'OCR text matching for "(incl. of all taxes)" or "(inclusive of all taxes)" adjacent to MRP value.',
    legalReference: 'Rule 6(1)(e) Explanation, Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
  },
  {
    id: 'RULE-ORIG-001',
    categoryId: 'origin',
    title: 'Country of Origin Declaration',
    requirement: 'For imported goods, the country of origin must be explicitly and unambiguously declared on the principal display panel.',
    whyItMatters: 'Protects the consumer right to know commodity origin and enforces statutory international trade compliance.',
    verificationMethod: 'OCR text extraction for "Country of Origin:", "Made in", "Product of" followed by country name.',
    legalReference: 'Rule 6(10) & Rule 6(1)(a) of Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
  },
  {
    id: 'RULE-ORIG-002',
    categoryId: 'origin',
    title: 'Manufacturer & Packer Details',
    requirement: 'Complete name and complete physical address of the manufacturer, packer, or importer must be clearly declared.',
    whyItMatters: 'Enables complete supply chain traceability, official accountability, and product safety compliance.',
    verificationMethod: 'OCR field extraction for address-like text blocks with pin codes, city names, and registered entity details.',
    legalReference: 'Rule 6(1)(a) of Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
  },
  {
    id: 'RULE-NQ-001',
    categoryId: 'netqty',
    title: 'Standard SI Unit Compliance',
    requirement: 'Net quantity must use standardized SI unit symbols: g, kg, ml, L, or N. Non-standard abbreviations like "gms", "ML", "Ltr", "kilos" are illegal.',
    whyItMatters: 'Standardizes quantity expressions across commodities to eliminate consumer confusion and deception.',
    verificationMethod: 'Regex pattern matching against declared quantity values. Flags non-SI abbreviations automatically.',
    legalReference: 'Rule 12 & Rule 13 of Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
  },
  {
    id: 'RULE-NQ-002',
    categoryId: 'netqty',
    title: 'Numeral Height & Font Size for Net Quantity',
    requirement: 'Net quantity text height must satisfy Rule 6(2) minimum millimeter requirements based on Principal Display Panel (PDP) area.',
    whyItMatters: 'Ensures immediate readability and visibility of core net quantity declarations from standard viewing distance.',
    verificationMethod: 'Estimated font height via OCR bounding box analysis compared against PDP area requirements table.',
    legalReference: 'Rule 6(2) Table (Minimum Height of Numerals), Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
  },
  {
    id: 'RULE-DATE-001',
    categoryId: 'dates',
    title: 'Manufacturing / Packing Date Format',
    requirement: 'Month and year of manufacture or packing must be declared in standard format (MM/YYYY or DD/MM/YYYY or "Month, Year").',
    whyItMatters: 'Empowers consumers and regulatory enforcement officers to verify commodity freshness, age, and batch validity.',
    verificationMethod: 'Date pattern extraction (MM/YYYY, DD/MM/YYYY) from OCR text with statutory format validation.',
    legalReference: 'Rule 6(1)(d) of Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
  },
  {
    id: 'RULE-DATE-002',
    categoryId: 'dates',
    title: 'Best Before / Expiry Date',
    requirement: 'Expiry date or best-before timeframe must be prominently printed and legible on food and perishable packages.',
    whyItMatters: 'Critical safeguard for consumer health, safety, and shelf-life compliance.',
    verificationMethod: 'OCR extraction for "Best Before", "Expiry", "Use By" followed by date patterns and confidence scoring.',
    legalReference: 'Rule 6(1)(d) of Legal Metrology (Packaged Commodities) Rules, 2011 & FSSAI Labelling Regulations',
    sourceUrl: LEGAL_METROLOGY_RULES_2011_PDF,
  },
  {
    id: 'RULE-ING-001',
    categoryId: 'ingredients',
    title: 'Ingredients Declaration List',
    requirement: 'Complete list of ingredients in descending order of composition by weight or volume at the time of manufacture.',
    whyItMatters: 'Provides total product transparency and enables consumers with dietary restrictions to make safe choices.',
    verificationMethod: 'OCR text block detection for "Ingredients:" followed by comma-separated list. Completeness check.',
    legalReference: 'Food Safety and Standards (Labelling and Display) Regulations, 2020 (FSSAI)',
    sourceUrl: FSSAI_LABELLING_REGULATIONS_2020_PDF,
  },
  {
    id: 'RULE-ING-002',
    categoryId: 'ingredients',
    title: 'Mandatory Allergen Declaration',
    requirement: 'Recognized major allergens must be highlighted separately (e.g., "Contains: Milk, Nuts, Gluten, Soy").',
    whyItMatters: 'Protects consumers with severe food allergies from accidental exposure and adverse health reactions.',
    verificationMethod: 'Keyword scanning for allergen indicators ("Contains:", "Allergen Information:", "May contain").',
    legalReference: 'Regulation 5(3)(b) of FSSAI (Labelling and Display) Regulations, 2020',
    sourceUrl: FSSAI_LABELLING_REGULATIONS_2020_PDF,
  },
];

export const RuleMatrixDocsView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('mrp');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRules = rules.filter(r => {
    const matchesCat = searchQuery.trim() ? true : r.categoryId === activeCategory;
    const matchesSearch = !searchQuery.trim() || (
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requirement.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.legalReference.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-lg">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-primary font-bold">Compliance Rules</h2>
          <p className="font-body-lg text-body-lg text-text-muted mt-xs">
            Master statutory library of Government of India Legal Metrology and FSSAI packaging verification standards.
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-sm bg-surface-container-lowest border border-border-subtle rounded-lg px-md py-sm w-full md:w-80 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all shadow-2xs">
          <span className="material-symbols-outlined text-text-muted text-[20px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rules, acts, or sections..."
            className="border-none bg-transparent outline-none font-body-md text-body-md text-text-main placeholder:text-text-muted w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-text-muted hover:text-text-main cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Rule Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
        {/* Category Navigation */}
        <div className="md:col-span-3 flex flex-row md:flex-col gap-sm overflow-x-auto pb-4 md:pb-0 border-b md:border-b-0 md:border-r border-border-subtle md:pr-md">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }}
              className={`flex-shrink-0 text-left px-md py-sm rounded-lg font-label-md text-label-md transition-colors flex items-center justify-between group cursor-pointer ${
                activeCategory === cat.id && !searchQuery
                  ? 'bg-secondary-container text-on-secondary-container font-semibold'
                  : 'text-text-muted hover:bg-surface-container-high'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`material-symbols-outlined text-[16px] ${
                  activeCategory === cat.id && !searchQuery ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'
                }`}
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                chevron_right
              </span>
            </button>
          ))}
        </div>

        {/* Rule Cards Grid */}
        <div className="md:col-span-9 grid grid-cols-1 lg:grid-cols-2 gap-md">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              className="bg-surface-container-lowest border border-border-subtle rounded-xl p-md hover:border-primary/50 hover:shadow-md transition-all group flex flex-col h-full relative"
            >
              {/* Card Top: Rule ID Badge & Official Government Reference Link */}
              <div className="flex justify-between items-start mb-md">
                <span className="inline-flex items-center gap-xs px-2.5 py-1 rounded-full bg-surface-container-low text-text-main font-mono text-[11px] font-semibold border border-border-subtle">
                  <span className="material-symbols-outlined text-[14px] text-text-muted" style={{ fontVariationSettings: "'FILL' 0" }}>tag</span>
                  {rule.id}
                </span>

                <a
                  href={rule.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open official Government PDF: ${rule.legalReference}`}
                  className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-container-high transition-all flex items-center gap-1 cursor-pointer group/link border border-transparent hover:border-border-subtle"
                  aria-label={`Official Government PDF for ${rule.title}`}
                >
                  <span className="text-[11px] font-medium text-text-muted group-hover/link:text-primary hidden sm:inline">Govt PDF</span>
                  <span className="material-symbols-outlined text-[18px] text-primary group-hover/link:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 0" }}>
                    open_in_new
                  </span>
                </a>
              </div>

              {/* Rule Title */}
              <h3 className="font-headline-md text-base sm:text-lg font-bold text-text-main mb-xs group-hover:text-primary transition-colors">
                {rule.title}
              </h3>

              {/* Statutory Reference Tag */}
              <p className="text-[11px] font-semibold text-primary/90 bg-primary-fixed/40 px-2.5 py-1 rounded-md border border-primary-fixed-dim/50 mb-sm">
                Statutory Reference: {rule.legalReference}
              </p>

              {/* Card Sections */}
              <div className="flex-grow space-y-md mt-xs">
                <div>
                  <h4 className="font-label-md text-xs text-text-muted uppercase tracking-wider mb-xs font-semibold">Requirement</h4>
                  <p className="font-body-md text-xs sm:text-sm text-text-main leading-relaxed">{rule.requirement}</p>
                </div>
                <div>
                  <h4 className="font-label-md text-xs text-text-muted uppercase tracking-wider mb-xs font-semibold">Why it matters</h4>
                  <p className="font-body-md text-xs sm:text-sm text-text-main leading-relaxed">{rule.whyItMatters}</p>
                </div>
                <div className="bg-surface p-sm rounded-lg border border-border-subtle">
                  <h4 className="font-label-md text-xs text-text-muted uppercase tracking-wider mb-xs flex items-center gap-xs font-semibold">
                    <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>rule</span>
                    Verification Method
                  </h4>
                  <p className="font-body-md text-xs sm:text-sm text-text-main leading-relaxed">{rule.verificationMethod}</p>
                </div>
              </div>
            </div>
          ))}
          {filteredRules.length === 0 && (
            <div className="col-span-2 text-center py-xl text-text-muted font-body-md text-body-md">
              No compliance rules found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
