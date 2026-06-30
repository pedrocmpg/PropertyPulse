import React from 'react';
import { FormattedFII } from '../types/fii';

interface FIICardProps {
  fii: FormattedFII;
  onDetailClick?: () => void;
}

/**
 * FIICard Component
 * Displays FII data in a visual card with:
 * - Symbol, Name, Price (formatted)
 * - Yield (formatted), P/VP (formatted with visual indicators)
 * - Dark mode background with neon accents
 * - P/VP color tokens and intensity based on premium/discount status
 * - Fade-in transition over 300ms
 * 
 * Validates: Requirements 6.4, 6.5, 6.8, 6.9, 6.10, 6.11, 6.12, 7.1, 7.4, 7.5, 11.1, 11.2, 11.3
 */
export default function FIICard({ fii, onDetailClick }: FIICardProps) {
  // Determine P/VP styling based on status and intensity
  const getPVRatioStyles = () => {
    const pvStatus = fii.pvRatioFormatted.status;
    const intensity = fii.pvRatioFormatted.intensity;

    if (pvStatus === 'premium') {
      const textColor = intensity === 'high' 
        ? 'text-[#FF006B]'  // Full neon red
        : 'text-[#FF6B99]'; // 40% intensity neon red
      
      const bgClass = intensity === 'high'
        ? 'bg-[rgba(255,0,107,0.1)]'  // Full intensity background
        : 'bg-[rgba(255,0,107,0.04)]'; // 40% intensity background

      return {
        textColor,
        bgClass,
        ariaLabel: 'Premium (trading above NAV)',
      };
    } else if (pvStatus === 'discount') {
      const textColor = intensity === 'high'
        ? 'text-[#00FF9F]'  // Full neon green
        : 'text-[#66FF9F]'; // 40% intensity neon green

      const bgClass = intensity === 'high'
        ? 'bg-[rgba(0,255,159,0.1)]'  // Full intensity background
        : 'bg-[rgba(0,255,159,0.04)]'; // 40% intensity background

      return {
        textColor,
        bgClass,
        ariaLabel: 'Discount (trading below NAV)',
      };
    } else {
      return {
        textColor: 'text-[#FFFFFF]',
        bgClass: 'bg-transparent',
        ariaLabel: 'At NAV',
      };
    }
  };

  const pvStyles = getPVRatioStyles();

  return (
    <div
      onClick={() => onDetailClick?.()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onDetailClick?.();
        }
      }}
      className="fii-card bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-750 transition-all hover:shadow-lg hover:shadow-blue-500/20 transform hover:-translate-y-1"
      data-testid={`fii-card-${fii.symbol}`}
    >
      {/* Header: Symbol and Name */}
      <div className="mb-4 pb-4 border-b border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">{fii.symbol}</h3>
            <p className="text-sm text-gray-400 mt-1">{fii.administrator?.name || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="space-y-4">
        {/* Price Row */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Price</span>
          <span className="text-white font-semibold text-lg">{fii.priceFormatted}</span>
        </div>

        {/* NAV Row */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">NAV</span>
          <span className="text-gray-300 text-sm">{fii.navFormatted}</span>
        </div>

        {/* P/VP Ratio Row with Visual Indicators */}
        <div
          className={`flex justify-between items-center px-3 py-2 rounded transition-all duration-300 ${pvStyles.bgClass}`}
        >
          <span className="text-gray-400 text-sm">P/VP Ratio</span>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${pvStyles.textColor}`}>
              {fii.pvRatioFormatted.displayValue}
            </span>
            {fii.pvRatioFormatted.status !== 'neutral' && (
              <svg
                className={`w-4 h-4 ${pvStyles.textColor}`}
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-label={pvStyles.ariaLabel}
              >
                {fii.pvRatioFormatted.status === 'premium' ? (
                  // Premium badge (up arrow)
                  <path d="M3 10a7 7 0 1014 0 7 7 0 01-14 0zm7-4a.75.75 0 01.75.75v3.69l1.97-1.97a.75.75 0 111.06 1.06L10 10.94l-2.72-2.72a.75.75 0 01 1.06-1.06l1.97 1.97V6.75A.75.75 0 0110 6z" />
                ) : (
                  // Discount badge (down arrow)
                  <path d="M3 10a7 7 0 1014 0 7 7 0 01-14 0zm7 4a.75.75 0 01-.75-.75v-3.69l-1.97 1.97a.75.75 0 11-1.06-1.06L10 9.06l2.72 2.72a.75.75 0 01-1.06 1.06l-1.97-1.97v3.69a.75.75 0 01-.75.75z" />
                )}
              </svg>
            )}
          </div>
        </div>

        {/* Dividend Yield 1M */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">1M Yield</span>
          <span className="text-cyan-400 font-semibold">
            {fii.dividendYield1MonthFormatted}
          </span>
        </div>

        {/* Dividend Yield 12M */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">12M Yield</span>
          <span className="text-cyan-400 font-semibold">
            {fii.dividendYield12MonthFormatted}
          </span>
        </div>

        {/* Monthly Return */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Monthly Return</span>
          <span
            className={`font-semibold ${
              parseFloat(fii.monthlyReturnFormatted) >= 0
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            {fii.monthlyReturnFormatted}
          </span>
        </div>

        {/* Investor Count */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Investors</span>
          <span className="text-gray-300 text-sm">{fii.investorCountFormatted}</span>
        </div>

        {/* Total Assets */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Total Assets</span>
          <span className="text-gray-300 text-sm">{fii.totalAssetsFormatted}</span>
        </div>
      </div>

      {/* Footer: Click hint */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          Click to view full details
        </p>
      </div>
    </div>
  );
}
