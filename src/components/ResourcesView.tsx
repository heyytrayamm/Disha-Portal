import React from 'react';

interface StatutoryResource {
  id: string;
  title: string;
  category: string;
  description: string;
  url: string;
  isExternalPdf?: boolean;
}

const STATUTORY_RESOURCES: StatutoryResource[] = [
  {
    id: 'RES-01',
    title: 'The Legal Metrology (Packaged Commodities) Rules, 2011',
    category: 'STATUTORY RULES',
    description: 'Statutory requirements for mandatory label declarations, minimum numeral heights (Rule 6(2)), MRP declarations, and packer/importer specifications.',
    url: 'https://wbconsumers.gov.in/writereaddata/ACT%20%26%20RULES/Act%20%26%20Rules/9%20The%20Legal%20Metrology%20(Package%20Commodities)%20Rules,%202011.pdf',
    isExternalPdf: true
  },
  {
    id: 'RES-02',
    title: 'The Legal Metrology Act, 2009 (Act No. 1 of 2010)',
    category: 'CENTRAL LEGISLATION',
    description: 'Parent legislative statute establishing legal metrology inspection powers, compounding procedures, and penalty thresholds under Section 36 for non-standard packages.',
    url: 'https://consumeraffairs.nic.in/acts-and-rules/legal-metrology/legal-metrology-act-2009',
    isExternalPdf: false
  },
  {
    id: 'RES-03',
    title: 'Food Safety and Standards (Labelling and Display) Regulations, 2020',
    category: 'FSSAI REGULATION',
    description: 'Mandatory statutory regulations governing ingredient declarations, major allergen disclosures, nutritional information panels, and date format standards.',
    url: 'https://www.fssai.gov.in/upload/notifications/2020/12/5fd87c6a0f6adGazette_Notification_Labelling_Display_14_12_2020.pdf',
    isExternalPdf: true
  },
  {
    id: 'RES-04',
    title: 'Ministry of Consumer Affairs — Legal Metrology Division',
    category: 'STATUTORY AUTHORITY',
    description: 'Government of India central portal for statutory enforcement circulars, advisory notifications, and State Controller of Legal Metrology directorates.',
    url: 'https://consumeraffairs.nic.in/',
    isExternalPdf: false
  },
  {
    id: 'RES-05',
    title: 'FSSAI Standards & Enforcement Portal',
    category: 'REGULATORY BODY',
    description: 'Food Safety and Standards Authority of India gazette repository, packaging advisory circulars, and national product compliance guidelines.',
    url: 'https://www.fssai.gov.in/',
    isExternalPdf: false
  }
];

export const ResourcesView: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="border-b border-[#E2DFD8] pb-6">
        <span className="section-tag">REFERENCE / RESOURCES</span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#141413] mt-1">
          Resources
        </h1>
        <p className="text-xs sm:text-sm text-[#6E6D67] mt-1.5 max-w-2xl">
          Official statutory reference documents, gazette notifications, and enforcement circulars under Legal Metrology and FSSAI packaging guidelines.
        </p>
      </div>

      {/* Clean Vertical Resource List */}
      <div className="disha-card overflow-hidden divide-y divide-[#E2DFD8]">
        {STATUTORY_RESOURCES.map((res) => (
          <a
            key={res.id}
            href={res.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 group hover:bg-[#FAF9F6] transition-colors cursor-pointer"
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="tech-tag text-[10px] text-[#D4381D] bg-[#FDE8E5] px-2 py-0.5 rounded-xs">
                  {res.category}
                </span>
                {res.isExternalPdf && (
                  <span className="text-[10px] font-mono text-[#6E6D67] bg-[#EFECE6] px-1.5 py-0.5 rounded-xs">
                    OFFICIAL PDF
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-[#141413] group-hover:text-[#D4381D] transition-colors">
                {res.title}
              </h2>
              <p className="text-xs text-[#6E6D67] leading-relaxed max-w-3xl">
                {res.description}
              </p>
            </div>

            <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-[#D5D2C8] group-hover:border-[#D4381D] group-hover:bg-[#FAF4F2] text-[#6E6D67] group-hover:text-[#D4381D] transition-all self-center">
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </a>
        ))}
      </div>

      {/* Statutory Advisory Note */}
      <div className="p-4 bg-[#F4F2EB] border border-[#E2DFD8] rounded-xs text-xs text-[#6E6D67] flex items-start gap-3">
        <span className="material-symbols-outlined text-[#D4381D] text-[18px] shrink-0 mt-0.5">
          verified_user
        </span>
        <div>
          <p className="font-semibold text-[#141413]">Official Legal Notice</p>
          <p className="mt-0.5 leading-relaxed">
            All inspectors and enforcement officials are instructed to reference the latest gazetted amendments published in the Gazette of India. Automated evaluations performed by DISHA are cross-referenced with these statutory baselines.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResourcesView;
