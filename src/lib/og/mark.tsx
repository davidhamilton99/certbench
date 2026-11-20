/**
 * The CertBench mark for generated images (next/og): the same route-to-a-blue-
 * dot glyph as the site's Logo, on a dark tile with a hairline edge, drawn
 * with inline SVG because image rendering has no stylesheet.
 */
export function OgMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28">
      <rect x="0.5" y="0.5" width="27" height="27" rx="7.5" fill="#0b0c10" stroke="#3a3f4c" strokeWidth="1" />
      <path d="M8.5 20.5v-5.25a5 5 0 0 1 5-5h4" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="20.25" cy="10.25" r="2.75" fill="#3d8bff" />
    </svg>
  );
}
