export interface Song {
    _id?: string;
    owner: string;
    title: string;
    artists: string[];
    album_art: string;
    genres: string[];
    video_preview?: string;
    audio_preview?: string;
    audio_duration?: number;
}