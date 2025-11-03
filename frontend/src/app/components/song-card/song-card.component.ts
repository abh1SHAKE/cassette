import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ElementRef,
  output,
} from '@angular/core';
import ColorThief from 'colorthief';
import {
  trigger,
  transition,
  style,
  animate,
  state,
} from '@angular/animations';
import { SongService } from '../../services/song.service';
import { Song } from '../../models/song.model';
import { CommonModule } from '@angular/common';
import { Howl } from 'howler';

@Component({
  selector: 'app-song-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './song-card.component.html',
  styleUrl: './song-card.component.scss',
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate(
          '400ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ transform: 'translateY(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        style({ position: 'absolute', width: '100%' }),
        animate(
          '400ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ transform: 'translateY(-100%)', opacity: 0 })
        ),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
    trigger('contentFade', [
      state('visible', style({ opacity: 1 })),
      state('hidden', style({ opacity: 0 })),
      transition('visible <=> hidden', animate('300ms ease-in-out')),
    ]),
  ],
})
export class SongCardComponent implements OnInit, OnDestroy, AfterViewInit {
  currSong = 0;
  colorsChanged = output<string[]>();

  animationCycle = 0;
  songKey = 0;
  isAnimating = false;
  isLoading = true;
  hasInteracted = false;
  error: string | null = null;
  audioProgress = 0;
  contentState = 'visible';

  private colorThief: ColorThief;
  private currentHowl: Howl | null = null;
  private progressInterval: any = null;
  private pendingSongIndex: number | null = null;
  songs: Song[] = [];

  constructor(
    private elementRef: ElementRef,
    private songService: SongService
  ) {
    this.colorThief = new ColorThief();
  }

  ngOnInit() {
    this.loadSongs();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.elementRef.nativeElement.focus();
    }, 100);
  }

  private loadSongs() {
    this.isLoading = true;
    this.error = null;

    this.songService.getSongs().subscribe({
      next: (songs) => {
        this.songs = songs;
        this.isLoading = false;

        if (this.songs.length > 0) {
          this.extractColorsFromCurrentSong();
        }
      },
      error: (err) => {
        console.error('Error loading songs:', err);
        this.error = 'Failed to load songs. Please try again later.';
        this.isLoading = false;

        this.colorsChanged.emit(['#121212', '#1a1a1a', '#2a2a2a']);
      },
    });
  }

  private initAudio() {
    if (this.songs.length === 0 || !this.songs[this.currSong]) return;

    const song = this.songs[this.currSong];

    if (this.currentHowl) {
      this.currentHowl.fade(this.currentHowl.volume(), 0, 300);
      setTimeout(() => {
        this.currentHowl?.unload();
        this.currentHowl = null;
        this.loadNewAudio(song);
      }, 300);
    } else {
      this.loadNewAudio(song);
    }
  }

  private loadNewAudio(song: Song) {
    this.currentHowl = new Howl({
      src: [song.audio_preview],
      html5: true,
      loop: true,
      volume: 0,
      onload: () => {
        this.currentHowl?.fade(0, 0.7, 500);
        this.startProgressTracking();
      },
      onloaderror: (id, error) => {
        console.error('Audio load error:', error);
      },
      onplayerror: (id, error) => {
        console.error('Audio play error:', error);
      },
    });

    this.currentHowl.play();
  }

  private startProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(() => {
      if (this.currentHowl && this.currentHowl.playing()) {
        const seek = this.currentHowl.seek() as number;
        const duration = this.currentHowl.duration();
        this.audioProgress = (seek / duration) * 100;
      }
    }, 100);
  }

  private touchStartY: number | null = null;
  private touchStartTime: number = 0;
  private lastTouchTime: number = 0;
  private touchVelocity: number = 0;
  private isProcessingGesture = false;
  private touchProcessed = false;

  private wheelTimeout: any = null;
  private wheelDeltaAccumulator = 0;
  private isProcessingWheel = false;

  private readonly WHEEL_THRESHOLD = 50;
  private readonly WHEEL_RESET_DELAY = 100;
  private readonly TOUCH_THRESHOLD = 30;
  private readonly GESTURE_LOCK_TIME = 400;
  private readonly FAST_SWIPE_VELOCITY = 0.5;
  private readonly FAST_SWIPE_TIME_LIMIT = 300;
  private readonly TRANSITION_DURATION = 300;

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    event.preventDefault();
    this.wheelDeltaAccumulator += Math.abs(event.deltaY);

    if (this.wheelTimeout) {
      clearTimeout(this.wheelTimeout);
    }

    if (this.wheelDeltaAccumulator >= this.WHEEL_THRESHOLD) {
      this.isProcessingWheel = true;
      this.changeSongSmooth(event.deltaY > 0 ? 1 : -1);

      this.wheelDeltaAccumulator = 0;
      setTimeout(() => {
        this.isProcessingWheel = false;
      }, this.GESTURE_LOCK_TIME);
    } else {
      this.wheelTimeout = setTimeout(() => {
        this.wheelDeltaAccumulator = 0;
      }, this.WHEEL_RESET_DELAY);
    }
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    const now = Date.now();
    this.touchStartY = event.touches[0].clientY;
    this.touchStartTime = now;
    this.lastTouchTime = now;
    this.touchVelocity = 0;
    this.touchProcessed = false;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (
      !this.touchStartY ||
      this.isProcessingGesture ||
      this.touchProcessed ||
      this.isAnimating ||
      this.songs.length === 0
    )
      return;

    const now = Date.now();
    const currentY = event.touches[0].clientY;
    const deltaY = this.touchStartY - currentY;
    const timeDelta = now - this.lastTouchTime;
    const totalTime = now - this.touchStartTime;

    if (timeDelta > 0) {
      this.touchVelocity = Math.abs(deltaY) / totalTime;
    }

    if (Math.abs(deltaY) >= this.TOUCH_THRESHOLD) {
      event.preventDefault();

      const isFastSwipe =
        this.touchVelocity >= this.FAST_SWIPE_VELOCITY &&
        totalTime <= this.FAST_SWIPE_TIME_LIMIT;

      if (isFastSwipe) {
        this.touchProcessed = true;
        this.isProcessingGesture = true;
        this.changeSongSmooth(deltaY > 0 ? 1 : -1);
      } else {
        this.isProcessingGesture = true;
        this.changeSongSmooth(deltaY > 0 ? 1 : -1);
        this.touchStartY = currentY;
        this.touchStartTime = now;

        setTimeout(() => {
          this.isProcessingGesture = false;
        }, 100);
      }
    }

    this.lastTouchTime = now;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    this.touchStartY = null;
    this.touchStartTime = 0;
    this.lastTouchTime = 0;
    this.touchVelocity = 0;
    this.touchProcessed = false;

    if (this.isProcessingGesture) {
      setTimeout(() => {
        this.isProcessingGesture = false;
      }, this.GESTURE_LOCK_TIME);
    }
  }

  @HostListener('touchcancel', ['$event'])
  onTouchCancel(event: TouchEvent) {
    this.touchStartY = null;
    this.touchStartTime = 0;
    this.lastTouchTime = 0;
    this.touchVelocity = 0;
    this.touchProcessed = false;

    if (this.isProcessingGesture) {
      setTimeout(() => {
        this.isProcessingGesture = false;
      }, this.GESTURE_LOCK_TIME);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    let direction = 0;

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      direction = 1;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      direction = -1;
    }

    if (direction !== 0) {
      event.preventDefault();
      this.isProcessingGesture = true;

      this.changeSongSmooth(direction);

      setTimeout(() => {
        this.isProcessingGesture = false;
      }, this.GESTURE_LOCK_TIME);
    }
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    if (!this.hasInteracted) {
      this.hasInteracted = true;
      this.initAudio();
    }
    (event.currentTarget as HTMLElement)?.focus();
  }

  onAnimationStart() {
    this.isAnimating = true;
  }

  onAnimationDone() {
    this.isAnimating = false;
  }

  private changeSongSmooth(direction: number) {
    if (this.pendingSongIndex !== null) return;

    const newIndex = this.calculateNewIndex(direction);
    this.pendingSongIndex = newIndex;

    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    this.audioProgress = 0;

    this.contentState = 'hidden';

    setTimeout(() => {
      this.currSong = this.pendingSongIndex!;
      this.pendingSongIndex = null;

      this.animationCycle++;
      this.songKey++;

      this.extractColorsFromCurrentSong();

      if (this.hasInteracted) {
        this.initAudio();
      }

      this.waitForImageLoad().then(() => {
        setTimeout(() => {
          this.contentState = 'visible';
        }, 50);
      });
    }, this.TRANSITION_DURATION);
  }

  private waitForImageLoad(): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = this.songs[this.currSong].album_art;
    });
  }

  private calculateNewIndex(direction: number): number {
    const newIndex = this.currSong + direction;

    if (newIndex >= 0 && newIndex < this.songs.length) {
      return newIndex;
    } else if (newIndex < 0) {
      return this.songs.length - 1;
    } else {
      return 0;
    }
  }

  // Original change song method
  private changeSong(direction: number) {
    const newIndex = this.currSong + direction;

    if (newIndex >= 0 && newIndex < this.songs.length) {
      this.currSong = newIndex;
    } else if (newIndex < 0) {
      this.currSong = this.songs.length - 1;
    } else {
      this.currSong = 0;
    }

    this.animationCycle++;
    this.songKey++;

    this.extractColorsFromCurrentSong();

    if (this.hasInteracted) {
      this.initAudio();
    }
  }

  private extractColorsFromCurrentSong() {
    const currentSong = this.songs[this.currSong];

    if (!currentSong) {
      this.colorsChanged.emit(['#121212', '#1a1a1a', '#2a2a2a']);
      return;
    }

    if (currentSong.colors && currentSong.colors.length > 0) {
      this.colorsChanged.emit(currentSong.colors);
    } else {
      this.extractColorsWithColorThief(currentSong);
    }
  }

  private extractColorsWithColorThief(song: Song) {
    if (!song.album_art) {
      this.colorsChanged.emit(['#121212', '#1a1a1a', '#2a2a2a']);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const dominantColor = this.colorThief.getColor(img);
        const palette = this.colorThief.getPalette(img, 5);

        const colors = palette.map((rgb: number[]) =>
          this.rgbToHex(rgb[0], rgb[1], rgb[2])
        );

        console.log('ColorThief extracted colors:', colors);
        this.colorsChanged.emit(colors);
      } catch (error) {
        console.error('Could not extract colors:', error);
        this.colorsChanged.emit(['#121212', '#1a1a1a', '#2a2a2a']);
      }
    };

    img.onerror = () => {
      console.error('Could not load album art image');
      this.colorsChanged.emit(['#121212', '#1a1a1a', '#2a2a2a']);
    };

    img.src = song.album_art;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  ngOnDestroy() {
    if (this.wheelTimeout) {
      clearTimeout(this.wheelTimeout);
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    if (this.currentHowl) {
      this.currentHowl.unload();
    }
  }
}
