import { Component, HostListener, OnDestroy, AfterViewInit, ElementRef } from '@angular/core';

@Component({
  selector: 'app-song-card',
  imports: [],
  templateUrl: './song-card.component.html',
  styleUrl: './song-card.component.scss'
})
export class SongCardComponent implements OnDestroy, AfterViewInit {
  currSong = 0;

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.elementRef.nativeElement.focus();
    }, 100);
  }

  songs = [
    {
      owner: "Martin Garrix",
      title: "Pressure (feat. Tove Lo)",
      artists: "Martin Garrix, Tove Lo",
      albumArt: "https://i.scdn.co/image/ab67616d0000b273b3adecd5865a661d12d07b6d",
      genres: ["#edm", "#dance", "#electronics"]
    },
    {
      owner: "Marc Talein",
      title: "Lights On (feat. Haidara)",
      artists: "Marc Talein, Haidara",
      albumArt: "https://i.scdn.co/image/ab67616d0000b2731559bee4e15c2adae6f8b9f5",
      genres: ["#lounge-ambient", "#house"]
    },
    {
      owner: "Tame Impala",
      title: "The Less I Know The Better",
      artists: "Tame Impala",
      albumArt: "https://i.scdn.co/image/ab67616d0000b2739e1cfc756886ac782e363d79",
      genres: ["#indie", "#neo-psychedelic"]
    }
  ];

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
  private readonly GESTURE_LOCK_TIME = 150;
  private readonly FAST_SWIPE_VELOCITY = 0.5;
  private readonly FAST_SWIPE_TIME_LIMIT = 300;

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    event.preventDefault();
    
    if (this.isProcessingWheel) return;

    this.wheelDeltaAccumulator += Math.abs(event.deltaY);

    if (this.wheelTimeout) {
      clearTimeout(this.wheelTimeout);
    }

    if (this.wheelDeltaAccumulator >= this.WHEEL_THRESHOLD) {
      this.isProcessingWheel = true;
      this.changeSong(event.deltaY > 0 ? 1 : -1);
      
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
    if (this.isProcessingGesture) return;
    
    const now = Date.now();
    this.touchStartY = event.touches[0].clientY;
    this.touchStartTime = now;
    this.lastTouchTime = now;
    this.touchVelocity = 0;
    this.touchProcessed = false;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (!this.touchStartY || this.isProcessingGesture || this.touchProcessed) return;

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
      
      const isFastSwipe = this.touchVelocity >= this.FAST_SWIPE_VELOCITY && 
                         totalTime <= this.FAST_SWIPE_TIME_LIMIT;
      
      if (isFastSwipe) {
        this.touchProcessed = true;
        this.isProcessingGesture = true;
        this.changeSong(deltaY > 0 ? 1 : -1);
      } else {
        this.isProcessingGesture = true;
        this.changeSong(deltaY > 0 ? 1 : -1);
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
    if (this.isProcessingGesture) return;
    
    let direction = 0;
    
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      direction = 1;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      direction = -1;
    }
    
    if (direction !== 0) {
      event.preventDefault();
      this.isProcessingGesture = true;
      
      this.changeSong(direction);
      
      setTimeout(() => {
        this.isProcessingGesture = false;
      }, this.GESTURE_LOCK_TIME);
    }
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    (event.currentTarget as HTMLElement)?.focus();
  }

  private changeSong(direction: number) {
    const newIndex = this.currSong + direction;
    
    if (newIndex >= 0 && newIndex < this.songs.length) {
      this.currSong = newIndex;
    } else if (newIndex < 0) {
      this.currSong = this.songs.length - 1;
    } else {
      this.currSong = 0;
    }
  }

  ngOnDestroy() {
    if (this.wheelTimeout) {
      clearTimeout(this.wheelTimeout);
    }
  }
}