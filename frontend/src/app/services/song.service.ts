import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Song } from "../models/song.model";
import { environment } from "../../environments/environment";

@Injectable({
    providedIn: 'root'
})

export class SongService {
    private apiUrl = `${environment.apiUrl}/songs`;

    constructor(
        private http: HttpClient
    ) {}

    getSongs(): Observable<Song[]> {
        return this.http.get<Song[]>(this.apiUrl);
    }
}