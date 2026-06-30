import React, { useEffect } from 'react';
import { FormattedFII } from '@/types';

interface FIIDetailViewProps {
  fii: FormattedFII | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

/**
 * FIIDetailView Component
 * Displays detailed FII information in a responsive modal/drawer:
 * - Modal layout for desktop (width > 1024px)
 * - Drawer layout for mobile/tablet (width ≤ 1024px)
 * - All FII metrics: price, NAV, P/VP, yields, monthly return, investor count, total assets
 * - Administrator details: name, CNPJ, email
 * - Refresh button to fetch latest data
 * - P/VP ratio styling based on premium/discount status with visual indicators
 * - Smooth animations and dark mode theming
 *
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5
 */
export default function FIIDetailView({
  fii,
  isOpen,
  onClose,
  onRefresh,
  isRefreshing = false,
}: FIIDetailViewProps) {
  const [isDrawer, setIsDrawer] = React.useState(window.innerWidth <= 1024);
  const [isAnimating, setIsAnimating] = React.useState(false);

  // Handle responsive layout changes
  useEffect(() => {
    const handleResize = () => {
      const newIsDrawer = window.innerWidth <= 1024;
      setIsDrawer(newIsDrawer);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle animation state
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  if (!isOpen || !fii) return null;

  // Determine P/VP styling based on status and intensity
  const getPVRatioStyles = () => {
    const pvStatus = fii.pvRatioFormatted.status;
    const intensity = fii.pvRatioFormatted.intensity;

    if (pvStatus === 'premium') {
      const textColor = intensity === 'high'
        ? 'text-[#FF006B]'
        : 'text-[#FF6B99]';

      const bgClass = intensity === 'high'
        ? 'bg-[rgba(255,0,107,0.15)]'
        : 'bg-[rgba(255,0,107,0.08)]';

      return {
        textColor,
        bgClass,
        ariaLabel: 'Premium (trading above NAV)',
      };
    } else if (pvStatus === 'discount') {
      const textColor = intensity === 'high'
        ? 'text-[#00FF9F]'
        : 'text-[#66FF9F]';

      const bgClass = intensity === 'high'
        ? 'bg-[rgba(0,255,159,0.15)]'
        : 'bg-[rgba(0,255,159,0.08)]';

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

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  // Render as drawer for mobile/tablet or modal for desktop
  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-200 z-40 ${
          isAnimating ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={handleClose}
        data-testid="detail-view-backdrop"
      />

      {/* Modal or Drawer Container */}
      <div
        className={`fixed inset-0 z-50 pointer-events-none ${
          isDrawer ? 'bottom-0 top-auto' : 'flex items-center justify-center'
        }`}
        data-testid="detail-view-container"
      >
        {/* Modal Content (for desktop) or Drawer Content (for mobile/tablet) */}
        <div
          className={`pointer-events-auto bg-gray-800 transition-all duration-300 ${
            isDrawer
              ? `fixed bottom-0 left-0 right-0 rounded-t-xl max-h-[90vh] overflow-y-auto ${
                  isAnimating ? 'translate-y-0' : 'translate-y-full'
                }`
              : `w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg ${
                  isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                }`
          }`}
          data-testid="detail-view-content"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-start z-50">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">{fii.symbol}</h2>
              {fii.administrator?.name && (
                <p className="text-sm text-gray-400">{fii.administrator.name}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 ml-4">
              {/* Refresh Button */}
              {onRefresh && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Refresh data"
                  data-testid="detail-view-refresh-btn"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={isRefreshing ? 'animate-spin' : ''}
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0114.85-3.36M20.49 15a9 9 0 01-14.85 3.36" />
                  </svg>
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors"
                aria-label="Close"
                data-testid="detail-view-close-btn"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Price and NAV Section */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-2">
                Price & Valuation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Current Price</p>
                  <p className="text-2xl font-bold text-white">{fii.priceFormatted}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">NAV (Net Asset Value)</p>
                  <p className="text-2xl font-bold text-white">{fii.navFormatted}</p>
                </div>
              </div>
            </section>

            {/* P/VP Ratio Section */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-2">
                Premium/Discount
              </h3>
              <div className={`p-4 rounded-lg ${pvStyles.bgClass}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">P/VP Ratio</p>
                    <div className="flex items-center gap-2">
                      <p className={`text-3xl font-bold ${pvStyles.textColor}`}>
                        {fii.pvRatioFormatted.displayValue}
                      </p>
                      {fii.pvRatioFormatted.status !== 'neutral' && (
                        <svg
                          className={`w-6 h-6 ${pvStyles.textColor}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-label={pvStyles.ariaLabel}
                        >
                          {fii.pvRatioFormatted.status === 'premium' ? (
                            <path d="M3 10a7 7 0 1014 0 7 7 0 01-14 0zm7-4a.75.75 0 01.75.75v3.69l1.97-1.97a.75.75 0 111.06 1.06L10 10.94l-2.72-2.72a.75.75 0 01 1.06-1.06l1.97 1.97V6.75A.75.75 0 0110 6z" />
                          ) : (
                            <path d="M3 10a7 7 0 1014 0 7 7 0 01-14 0zm7 4a.75.75 0 01-.75-.75v-3.69l-1.97 1.97a.75.75 0 11-1.06-1.06L10 9.06l2.72 2.72a.75.75 0 01-1.06 1.06l-1.97-1.97v3.69a.75.75 0 01-.75.75z" />
                          )}
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs mb-1">Status</p>
                    <p className={`font-semibold text-sm ${pvStyles.textColor}`}>
                      {fii.pvRatioFormatted.status === 'premium'
                        ? 'Premium'
                        : fii.pvRatioFormatted.status === 'discount'
                          ? 'Discount'
                          : 'At NAV'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Dividend Yields Section */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-2">
                Dividend Yields
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 text-sm mb-1">1-Month Yield</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {fii.dividendYield1MonthFormatted}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">12-Month Yield</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {fii.dividendYield12MonthFormatted}
                  </p>
                </div>
              </div>
            </section>

            {/* Performance Section */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-2">
                Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Monthly Return</p>
                  <p
                    className={`text-2xl font-bold ${
                      parseFloat(fii.monthlyReturnFormatted) >= 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {fii.monthlyReturnFormatted}
                  </p>
                </div>
              </div>
            </section>

            {/* Investor & Asset Information Section */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-2">
                Fund Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Investor Count</p>
                  <p className="text-xl font-bold text-white">
                    {fii.investorCountFormatted}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Assets</p>
                  <p className="text-xl font-bold text-white">
                    {fii.totalAssetsFormatted}
                  </p>
                </div>
              </div>
            </section>

            {/* Administrator Information Section */}
            {fii.administrator && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-2">
                  Administrator Details
                </h3>
                <div className="bg-gray-700 bg-opacity-50 p-4 rounded-lg space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Company Name</p>
                    <p className="text-white">{fii.administrator.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">CNPJ</p>
                    <p className="text-white font-mono">{fii.administrator.cnpj || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Email</p>
                    {fii.administrator.email ? (
                      <a
                        href={`mailto:${fii.administrator.email}`}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        {fii.administrator.email}
                      </a>
                    ) : (
                      <p className="text-white">N/A</p>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Footer spacing for drawer */}
          {isDrawer && <div className="h-8" />}
        </div>
      </div>
    </>
  );
}
