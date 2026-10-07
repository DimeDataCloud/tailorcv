// Single source of truth for the TailorCV brand palette and spacing tokens.
// All screens import from here so the visual identity stays consistent.
//
// Identity: blood-orange accent + white surface + ink/charcoal text + subtle
// warm-orange highlights. Deliberately restrained — orange is loud enough on
// its own; everything else is neutral so the brand stays confident.

export const BRAND = {
  // Primary
  accent:        '#C8360B', // blood orange — CTAs, focus rings, primary icons
  accentDark:    '#9C2A07', // hover/pressed
  accentSoft:    '#FFE4D9', // tinted backgrounds, badges
  accentWash:    '#FFF5EF', // very light tint for hero/empty states

  // Ink / text
  ink:           '#1F2937', // headlines, primary text
  inkSoft:       '#475569', // secondary text
  muted:         '#94A3B8', // tertiary / placeholders
  hairline:      '#E4EAF0', // dividers, borders

  // Surfaces
  surface:       '#FFFFFF',
  surfaceAlt:    '#F8FAFC', // input bg, section bg
  surfaceDark:   '#0F172A', // welcome / processing hero

  // Status
  success:       '#16A34A',
  successSoft:   '#F0FDF4',
  error:         '#EF4444',
  errorSoft:     '#FEF2F2',
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export const SPACE = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};
