import { Component, HostListener, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-song-card',
  imports: [],
  templateUrl: './song-card.component.html',
  styleUrl: './song-card.component.scss'
})
export class SongCardComponent implements OnDestroy {
  currSong = 0;

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
  private touchHasMoved = false;
  private isProcessingGesture = false;

  private wheelTimeout: any = null;
  private wheelDeltaAccumulator = 0;
  private isProcessingWheel = false;

  private readonly WHEEL_THRESHOLD = 50;
  private readonly WHEEL_RESET_DELAY = 100;
  private readonly TOUCH_THRESHOLD = 50;
  private readonly GESTURE_LOCK_TIME = 200;

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
    
    this.touchStartY = event.touches[0].clientY;
    this.touchHasMoved = false;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (!this.touchStartY || this.isProcessingGesture) return;

    this.touchHasMoved = true;
    const currentY = event.touches[0].clientY;
    const deltaY = this.touchStartY - currentY;

    if (Math.abs(deltaY) >= this.TOUCH_THRESHOLD) {
      event.preventDefault();
      this.isProcessingGesture = true;
      
      this.changeSong(deltaY > 0 ? 1 : -1);
      
      this.touchStartY = null;
      this.touchHasMoved = false;
      
      setTimeout(() => {
        this.isProcessingGesture = false;
      }, this.GESTURE_LOCK_TIME);
    }
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    this.touchStartY = null;
    this.touchHasMoved = false;
  }

  @HostListener('touchcancel', ['$event'])
  onTouchCancel(event: TouchEvent) {
    this.touchStartY = null;
    this.touchHasMoved = false;
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