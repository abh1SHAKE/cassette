import { Component, OnDestroy } from '@angular/core';
import { SongCardComponent } from '../../components/song-card/song-card.component';

@Component({
  selector: 'app-flow',
  imports: [SongCardComponent],
  templateUrl: './flow.component.html',
  styleUrl: './flow.component.scss',
})
export class FlowComponent implements OnDestroy {
  backgroundGradient =
    'linear-gradient(135deg, #121212 0%, #1a1a1a 50%, #2a2a2a 100%)';
  private animationFrame: number | null = null;
  private startTime: number = 0;
  private currentColors: string[] = [];
  private isAnimating: boolean = false;

  onColorsChanged(colors: string[]) {
    if (colors && colors.length >= 3) {
      this.currentColors = colors;
      this.startFlowingAnimation();
    }
  }

  private startFlowingAnimation() {
    if (this.isAnimating) return;

    this.isAnimating = true;
    this.startTime = performance.now();
    this.animate();
  }

  private animate = () => {
    const currentTime = performance.now();
    const elapsed = (currentTime - this.startTime) / 1000;

    this.backgroundGradient = this.createFlowingGradient(
      this.currentColors,
      elapsed
    );

    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private createFlowingGradient(colors: string[], time: number): string {
    if (!colors || colors.length < 3) return this.backgroundGradient;

    const harmonizedColors = this.harmonizeColors(colors);
    const darkenedColors = harmonizedColors.map((color) => this.darkenColor(color, 0.2));
    const mutedColors = harmonizedColors.map((color) => this.darkenColor(color, 0.4));

    const speed1 = 20;
    const speed2 = 15;
    const speed3 = 25;

    const angle1 = (time * speed1) % 360;
    const angle2 = (time * speed2 + 120) % 360;
    const angle3 = (time * speed3 + 240) % 360;

    const offset1 = Math.sin(time * 0.5) * 20 + 50;
    const offset2 = Math.cos(time * 0.3) * 15 + 50;
    const offset3 = Math.sin(time * 0.4 + Math.PI) * 25 + 50;

    const blendFactor = (Math.sin(time * 0.2) + 1) / 2; 
    const primaryColor = this.blendColors(
      darkenedColors[0],
      mutedColors[0],
      blendFactor
    );
    const secondaryColor = this.blendColors(
      darkenedColors[1],
      mutedColors[1],
      1 - blendFactor
    );
    const tertiaryColor = this.blendColors(
      darkenedColors[2],
      mutedColors[2],
      blendFactor
    );

    return `
      radial-gradient(ellipse at ${offset1}% ${offset2}%, ${primaryColor} 0%, transparent 50%),
      radial-gradient(ellipse at ${offset3}% ${offset1}%, ${secondaryColor} 0%, transparent 60%),
      linear-gradient(${angle1}deg, ${primaryColor} 0%, ${secondaryColor} 40%, ${tertiaryColor} 100%),
      linear-gradient(${angle2}deg, ${tertiaryColor}33 0%, ${primaryColor}22 50%, ${secondaryColor}44 100%),
      linear-gradient(${angle3}deg, ${darkenedColors[0]} 0%, ${darkenedColors[1]} 100%)
    `
      .replace(/\s+/g, ' ')
      .trim();
  }

  private darkenColor(hex: string, factor: number): string {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const darkR = Math.round(r * (1 - factor));
    const darkG = Math.round(g * (1 - factor));
    const darkB = Math.round(b * (1 - factor));

    return `#${darkR.toString(16).padStart(2, '0')}${darkG
      .toString(16)
      .padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;
  }

  private lightenColor(hex: string, factor: number): string {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const lightR = Math.min(255, Math.round(r + (255 - r) * factor));
    const lightG = Math.min(255, Math.round(g + (255 - g) * factor));
    const lightB = Math.min(255, Math.round(b + (255 - b) * factor));

    return `#${lightR.toString(16).padStart(2, '0')}${lightG
      .toString(16)
      .padStart(2, '0')}${lightB.toString(16).padStart(2, '0')}`;
  }

  private blendColors(color1: string, color2: string, factor: number): string {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');

    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);

    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);

    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);

    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private harmonizeColors(colors: string[]): string[] {
    return colors.map(color => {
      const { h, s, l } = this.hexToHsl(color);
      
      const cappedL = Math.min(l, 0.5);
      const boostedS = s < 0.2 ? Math.min(s + 0.3, 0.6) : s;
      
      return this.hslToHex(h, boostedS, cappedL);
    });
  }

  private hexToHsl(hex: string): { h: number; s: number; l: number } {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h: h * 360, s, l };
  }

  private hslToHex(h: number, s: number, l: number): string {
    h = h / 360;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private getAverageBrightness(colors: string[]): number {
    const total = colors.reduce((sum, color) => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return sum + (r * 0.299 + g * 0.587 + b * 0.144);
    }, 0);
    return total / colors.length;
  }

  ngOnDestroy() {
    this.isAnimating = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}