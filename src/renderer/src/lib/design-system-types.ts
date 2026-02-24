export type TokenCategory =
  | 'color'
  | 'font-family'
  | 'font-size'
  | 'font-weight'
  | 'tracking'
  | 'leading'
  | 'spacing'
  | 'radius'
  | 'shadow'
  | 'gradient'
  | 'transition'
  | 'z-index';

export type TokenControl = 'color' | 'text' | 'number' | 'shadow' | 'font-stack';

export interface DesignSystemToken {
  variable: string;
  value: string;
  category: TokenCategory;
  control: TokenControl;
  label: string;
  group: string;
}

export interface ColorPalette {
  name: string;
  shades: DesignSystemToken[];
}

export interface DesignSystem {
  colors: {
    palettes: ColorPalette[];
  };
  typography: {
    families: DesignSystemToken[];
    sizes: DesignSystemToken[];
    weights: DesignSystemToken[];
    tracking: DesignSystemToken[];
    leading: DesignSystemToken[];
  };
  spacing: DesignSystemToken[];
  radius: DesignSystemToken[];
  shadows: DesignSystemToken[];
  gradients: DesignSystemToken[];
  transitions: DesignSystemToken[];
  zIndex: DesignSystemToken[];
  fonts: string[];
}
