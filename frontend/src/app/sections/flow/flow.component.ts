import { Component } from '@angular/core';
import { SongCardComponent } from "../../components/song-card/song-card.component";

@Component({
  selector: 'app-flow',
  imports: [SongCardComponent],
  templateUrl: './flow.component.html',
  styleUrl: './flow.component.scss'
})
export class FlowComponent {
  backgroundGradient = 'linear-gradient(135deg, #121212 0%, #1a1a1a 50%, #2a2a2a 100%)';

  onColorsChanged(colors: string[]) {
    if (colors && colors.length >= 3) {
      this.backgroundGradient = this.createDynamicGradient(colors);
    }
  }

  private createDynamicGradient(colors: string[]): string {
    const darkenedColors = colors.map(color => this.darkenColor(color, 0.3));

    const gradientOptions = [
      `linear-gradient(135deg, ${darkenedColors[0]} 0%, ${darkenedColors[1]} 50%, ${darkenedColors[2]} 100%)`,
      `radial-gradient(ellipse at center, ${darkenedColors[0]} 0%, ${darkenedColors[1]} 50%, ${darkenedColors[2]} 100%)`,
      `linear-gradient(45deg, ${darkenedColors[0]} 0%, ${darkenedColors[1]} 33%, ${darkenedColors[2]} 66%, ${darkenedColors[0]} 100%)`,

      colors.length >= 4 
        ? `linear-gradient(180deg, ${darkenedColors[0]} 0%, ${darkenedColors[1]} 25%, ${darkenedColors[2]} 75%, ${darkenedColors[3]} 100%)`
        : `linear-gradient(180deg, ${darkenedColors[0]} 0%, ${darkenedColors[1]} 50%, ${darkenedColors[2]} 100%)`
    ];

    const avgBrightness = this.getAverageBrightness(colors);

    if (avgBrightness > 128) {
      return gradientOptions[1];
    } else if (avgBrightness > 64) {
      return gradientOptions[0];
    } else {
      return gradientOptions[2];
    }
  }

  private darkenColor(hex: string, factor: number): string {
    hex = hex.replace('#', '');

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const darkR = Math.round(r * (1 - factor));
    const darkG = Math.round(g * (1 - factor));
    const darkB = Math.round(b * (1 - factor));

    return `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;
  }

  private getAverageBrightness(colors: string[]): number {
    const total = colors.reduce((sum, color) => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 2), 16);
      const b = parseInt(hex.substring(4, 2), 16);

      return sum + (r * 0.299 + g * 0.587 + b * 0.144);
    }, 0);

    return total / colors.length;
  }
}
