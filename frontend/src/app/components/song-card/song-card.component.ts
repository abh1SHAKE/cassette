import { Component } from '@angular/core';

@Component({
  selector: 'app-song-card',
  imports: [],
  templateUrl: './song-card.component.html',
  styleUrl: './song-card.component.scss'
})
export class SongCardComponent {
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
}
