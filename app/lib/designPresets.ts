// Centralized design presets — picking a preset auto-applies every detail
// (color, bullet, divider, border, texture, font pairing, icon usage).
// The downstream Edge Function reads these fields when building the resume HTML.
//
// Color-only customisation happens separately on the ResumeDesignScreen, which
// only edits the .accent / .sidebar / .background / .text fields and leaves
// every other detail untouched.

import type { ResumeDesignPrefs } from '../types/navigation';

export type BulletStyle = 'disc' | 'dash' | 'check' | 'diamond' | 'square';
export type DividerStyle = 'rule' | 'space' | 'dots' | 'none';
export type BorderStyle = 'none' | 'thin' | 'thick' | 'double' | 'shadow';
export type TextureStyle = 'flat' | 'paper' | 'linen' | 'gradient';
export type FontPair = 'serif' | 'sans' | 'display' | 'mono';
export type IconUsage = 'none' | 'subtle' | 'prominent';

export interface DesignPreset extends ResumeDesignPrefs {
  id: string;
  name: string;
  tagline: string;
  icon: 'book-outline' | 'flash-outline' | 'remove-outline' | 'flame-outline' | 'business-outline' | 'document-outline';
  // Detail fields (consumed by the tailor-resume Edge Function)
  bullet: BulletStyle;
  divider: DividerStyle;
  border: BorderStyle;
  texture: TextureStyle;
  font: FontPair;
  icons: IconUsage;
  // Display
  accentFontWeight: 600 | 700 | 800;
  headerAlign: 'left' | 'center';
  sidebarWidth: 0 | 30 | 35 | 40;
}

// Five curated presets. Each preset is internally consistent so the output
// resume reads cohesively. Colours picked for the brand identity but every
// preset stands on its own.

export const PRESETS: DesignPreset[] = [
  {
    id: 'antique',
    name: 'Antique',
    tagline: 'Warm tones, rich texture, timeless character. For roles where pedigree matters.',
    icon: 'book-outline',
    accent: '#B45309',
    sidebar: '#3B2100',
    background: '#FEF7E6',
    text: '#2D1B05',
    bullet: 'diamond',
    divider: 'rule',
    border: 'double',
    texture: 'paper',
    font: 'serif',
    icons: 'subtle',
    accentFontWeight: 700,
    headerAlign: 'left',
    sidebarWidth: 35,
  },
  {
    id: 'modern',
    name: 'Modern',
    tagline: 'Clean lines, deliberate whitespace. The go-to for tech, design, and product.',
    icon: 'flash-outline',
    accent: '#0076CE',
    sidebar: '#0F172A',
    background: '#FFFFFF',
    text: '#0F172A',
    bullet: 'disc',
    divider: 'space',
    border: 'thin',
    texture: 'flat',
    font: 'sans',
    icons: 'none',
    accentFontWeight: 700,
    headerAlign: 'left',
    sidebarWidth: 0,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    tagline: 'Maximum readability. ATS-optimized. Lets the content do the work.',
    icon: 'remove-outline',
    accent: '#1F2937',
    sidebar: '#FFFFFF',
    background: '#FFFFFF',
    text: '#1F2937',
    bullet: 'dash',
    divider: 'none',
    border: 'none',
    texture: 'flat',
    font: 'sans',
    icons: 'none',
    accentFontWeight: 600,
    headerAlign: 'left',
    sidebarWidth: 0,
  },
  {
    id: 'bold',
    name: 'Bold',
    tagline: 'High-contrast, impossible to ignore. Stand out in crowded applicant pools.',
    icon: 'flame-outline',
    accent: '#C8360B', // blood orange
    sidebar: '#1A1A1A',
    background: '#FFFFFF',
    text: '#111111',
    bullet: 'square',
    divider: 'rule',
    border: 'thick',
    texture: 'flat',
    font: 'display',
    icons: 'prominent',
    accentFontWeight: 800,
    headerAlign: 'left',
    sidebarWidth: 30,
  },
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'Corporate, trusted, polished. For finance, consulting, and enterprise.',
    icon: 'business-outline',
    accent: '#1E3A5F',
    sidebar: '#0F2540',
    background: '#FFFFFF',
    text: '#1F2937',
    bullet: 'disc',
    divider: 'rule',
    border: 'thin',
    texture: 'flat',
    font: 'serif',
    icons: 'subtle',
    accentFontWeight: 700,
    headerAlign: 'center',
    sidebarWidth: 0,
  },
];

export function getPreset(id: string): DesignPreset {
  return PRESETS.find(p => p.id === id) ?? PRESETS[1]; // default to Modern
}
