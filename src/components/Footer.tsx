import React from 'react';
import type { ActiveTab } from '../types/metrology';

interface FooterProps {
  activeTab?: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  return (
    <footer className="border-t border-[#E2DFD8] bg-[#FAF9F6] text-[#6E6D67] text-xs py-8 mt-16">
      <div className="disha-workspace flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Branding */}
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="font-bold tracking-wider text-[#141413] text-sm">DISHA</span>
            <span className="text-[11px] text-[#A8A59C]">|</span>
            <span className="text-xs text-[#5A5955]">Digital Inspection & Standards Hub</span>
          </div>
          <p className="text-[11px] text-[#8F8E87] mt-1">
            Department of Consumer Affairs &bull; Legal Metrology Enforcement Portal
          </p>
        </div>

        {/* Center: Navigation Links */}
        <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-medium text-[#5A5955]">
          <button 
            onClick={() => setActiveTab?.('dashboard')}
            className="hover:text-[#D4381D] transition-colors cursor-pointer"
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab?.('scan')}
            className="hover:text-[#D4381D] transition-colors cursor-pointer"
          >
            Live Scan
          </button>
          <button 
            onClick={() => setActiveTab?.('repository')}
            className="hover:text-[#D4381D] transition-colors cursor-pointer"
          >
            Audit Register
          </button>
          <button 
            onClick={() => setActiveTab?.('rules')}
            className="hover:text-[#D4381D] transition-colors cursor-pointer"
          >
            Rules Handbook
          </button>
          <button 
            onClick={() => setActiveTab?.('resources')}
            className="hover:text-[#D4381D] transition-colors cursor-pointer"
          >
            Resources
          </button>
        </nav>

        {/* Right: Technical Metadata & Compliance */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-[#8F8E87]">
          <span>v1.0.0</span>
          <span>&bull;</span>
          <span className="hover:text-[#141413] cursor-pointer">Privacy</span>
          <span>&bull;</span>
          <span className="hover:text-[#141413] cursor-pointer">Statutory Terms</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
