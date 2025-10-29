import {
  Component,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { SongCardComponent } from '../../components/song-card/song-card.component';

declare global {
  interface Window {
    THREE: any;
    createLiquidEther?: (container: HTMLElement, options: any) => any;
  }
}

@Component({
  selector: 'app-flow',
  imports: [SongCardComponent],
  templateUrl: './flow.component.html',
  styleUrl: './flow.component.scss',
})
export class FlowComponent implements OnDestroy, AfterViewInit {
  @ViewChild('liquidEtherContainer', { static: false })
  containerRef!: ElementRef<HTMLDivElement>;

  private liquidEtherInstance: any = null;
  private currentColors: string[] = ['#5227FF', '#FF9FFC', '#B19EEF'];
  private initAttempts = 0;
  private maxAttempts = 10;

  ngAfterViewInit() {
    this.waitForDependencies();
  }

  private waitForDependencies() {
    if (!window.THREE) {
      if (this.initAttempts < this.maxAttempts) {
        this.initAttempts++;
        setTimeout(() => this.waitForDependencies(), 100);
      } else {
        console.error('Three.js failed to load after multiple attempts');
      }
      return;
    }

    this.loadLiquidEtherScript()
      .then(() => {
        setTimeout(() => this.initLiquidEther(), 100);
      })
      .catch((err) => {
        console.error('Failed to load LiquidEther script:', err);
      });
  }

  private loadLiquidEtherScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.createLiquidEther) {
        resolve();
        return;
      }

      const existingScript = document.querySelector(
        'script[src*="liquid-ether.js"]'
      );
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () =>
          reject(new Error('Script failed to load'))
        );
        return;
      }

      const script = document.createElement('script');
      script.src = 'assets/liquid-ether.js';
      script.async = true;

      script.onload = () => {
        resolve();
      };

      script.onerror = (error) => {
        console.error('Failed to load LiquidEther script:', error);
        reject(new Error('Script load error'));
      };

      document.head.appendChild(script);
    });
  }

  private initLiquidEther() {
    if (!this.containerRef?.nativeElement) {
      console.error('Container element not found');
      return;
    }

    if (!window.THREE) {
      console.error('Three.js not loaded');
      return;
    }

    if (!window.createLiquidEther) {
      console.error('createLiquidEther function not found');
      return;
    }

    const container = this.containerRef.nativeElement;

    if (!document.body.contains(container)) {
      console.warn('Container not yet attached to DOM, retrying...');
      setTimeout(() => this.initLiquidEther(), 200);
      return;
    }

    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('Container has no dimensions, retrying...');
      setTimeout(() => this.initLiquidEther(), 200);
      return;
    }

    if (this.liquidEtherInstance?.dispose) {
      try {
        this.liquidEtherInstance.dispose();
      } catch (err) {
        console.warn('Error disposing old instance:', err);
      }
      this.liquidEtherInstance = null;
    }

    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.error('WebGL context creation failed. Check GPU/driver.');
        return;
      }
    } catch (err) {
      console.error('WebGL initialization test failed:', err);
      return;
    }

    try {
      this.liquidEtherInstance = window.createLiquidEther(container, {
        colors: this.currentColors,
        mouseForce: 20,
        cursorSize: 100,
        isViscous: false,
        viscous: 80,
        iterationsViscous: 32,
        iterationsPoisson: 32,
        resolution: 0.5,
        isBounce: false,
        autoDemo: true,
        autoSpeed: 0.5,
        autoIntensity: 2.2,
        takeoverDuration: 0.25,
        autoResumeDelay: 1000,
        autoRampDuration: 0.6,
        dt: 0.014,
        BFECC: true,
      });
    } catch (error) {
      console.error('Error initializing LiquidEther:', error);
    }
  }

  onColorsChanged(colors: string[]) {
    if (colors && colors.length >= 3) {
      this.currentColors = colors;
      if (this.liquidEtherInstance?.updateColors) {
        this.liquidEtherInstance.updateColors(colors);
      }
    }
  }

  ngOnDestroy() {
    if (this.liquidEtherInstance?.dispose) {
      try {
        this.liquidEtherInstance.dispose();
      } catch (error) {
        console.error('Error disposing LiquidEther:', error);
      }
    }
    this.liquidEtherInstance = null;
  }
}
