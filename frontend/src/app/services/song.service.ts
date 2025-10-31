import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Song } from "../models/song.model";

@Injectable({
    providedIn: 'root'
})

export class SongService {
    private apiUrl = 'http://localhost:3000/api/v1/songs';

    constructor(
        private http: HttpClient
    ) {}

    getSongs(): Observable<Song[]> {
        return this.http.get<Song[]>(this.apiUrl);
    }
}