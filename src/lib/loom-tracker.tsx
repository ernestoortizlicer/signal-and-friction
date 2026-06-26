/**
 * Loom Deal Acceleration Tracking
 * ════════════════════════════════════════════════════════════════════════════
 * Client-side utility to track when prospects view their diagnostic Loom videos.
 * 
 * Usage:
 * ```tsx
 * import { trackLoomView } from '@/lib/loom-tracker'
 * 
 * useEffect(() => {
 *   trackLoomView({
 *     clientKey: 'startuphub',
 *     prospectId: client?.id,
 *   })
 * }, [])
 * ```
 */

import React, { ReactNode } from 'react';

interface TrackLoomParams {
  clientKey: string;
  prospectId?: string;
  timestamp?: string;
}

export async function trackLoomView(params: TrackLoomParams): Promise<void> {
  try {
    const {
      clientKey,
      prospectId,
      timestamp = new Date().toISOString(),
    } = params;

    // Get browser info
    const userAgent = navigator.userAgent;
    const referrer = document.referrer;

    // Call tracking endpoint
    const response = await fetch(
      'https://signal-and-friction.com/api/loom/track',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientKey,
          prospectId,
          timestamp,
          userAgent,
          referrer,
        }),
      }
    );

    if (!response.ok) {
      console.warn('Failed to track Loom view:', response.statusText);
      return;
    }

    const data = await response.json();
    console.log('✅ Loom view tracked:', data);

    // Optional: Log inferred bottlenecks to console for debugging
    if (data.bottlenecks) {
      console.group('🔍 Inferred Bottlenecks:');
      data.bottlenecks.forEach((b: string, i: number) => {
        console.log(`${i + 1}. ${b}`);
      });
      console.groupEnd();
    }
  } catch (error) {
    console.error('Loom tracking error:', error);
    // Fail silently - don't break video playback if tracking fails
  }
}

/**
 * Get Loom embed URL with client key
 */
export function getLoomEmbedUrl(
  loomVideoId: string,
  clientKey: string
): string {
  // Format: https://www.loom.com/embed/{videoId}?client={clientKey}
  return `https://www.loom.com/embed/${loomVideoId}?client=${clientKey}`;
}

/**
 * Wrapper component for Loom iframe with automatic tracking
 */
export function LoomViewer({
  videoId,
  clientKey,
  prospectId,
  className = '',
}: {
  videoId: string;
  clientKey: string;
  prospectId?: string;
  className?: string;
}): ReactNode {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    // Track when iframe becomes visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackLoomView({ clientKey, prospectId });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (iframeRef.current) {
      observer.observe(iframeRef.current);
    }

    return () => observer.disconnect();
  }, [clientKey, prospectId]);

  return (
    <iframe
      ref={iframeRef}
      src={getLoomEmbedUrl(videoId, clientKey)}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className={`w-full aspect-video rounded-lg ${className}`}
      title="Diagnostic Loom Video"
    />
  );
}

// Support CommonJS export for edge functions
export default { trackLoomView, getLoomEmbedUrl, LoomViewer };
