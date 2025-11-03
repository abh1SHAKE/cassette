export interface Song {
    _id?: string;
    owner: string;
    title: string;
    artists: string[];
    album_art: string;
    genres: string[];
    colors: string[];
    video_preview?: string;
    audio_preview: string;
    audio_duration: number;
}