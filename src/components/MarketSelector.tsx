import Link from 'next/link';
import {
  COUNTRY_MARKETS,
  MARKET_SELECTOR_ORDER,
  type MarketCountryCode,
} from '@/lib/market-profiles';

export default function MarketSelector({
  active,
  compact = false,
}: {
  active: MarketCountryCode;
  compact?: boolean;
}) {
  return (
    <nav aria-label="Market" className="w-full">
      <div
        className={`flex items-center gap-1 overflow-x-auto rounded-full border border-[#D4A853]/15 bg-[#0A0908]/75 p-1 backdrop-blur ${
          compact ? 'max-w-max' : 'max-w-full'
        }`}
      >
        {MARKET_SELECTOR_ORDER.map((code) => {
          const profile = COUNTRY_MARKETS[code];
          const selected = active === code;
          return (
            <Link
              key={code}
              href={profile.route}
              aria-current={selected ? 'page' : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                selected
                  ? 'bg-[#D4A853] text-[#0A0908]'
                  : 'text-[#8F857B] hover:bg-[#D4A853]/8 hover:text-[#F5F0EB]'
              }`}
            >
              {profile.shortLabel}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
