class Admin::SongsController < ApplicationController
    def new
        @song = Song.new
    end

    def create
        processed_params = process_artists_genres_and_colors(admin_song_params)
        processed_params.except!(:album_art_file, :video_preview_file, :audio_preview_file)
        @song = Song.new(processed_params)

        upload_media_files(@song)

        if @song.save
            redirect_to admin_songs_path, notice: 'Song created successfully!'
        else
            render :new
        end
    end

    def index
        @songs = Song.all
    end

    def edit
        @song = Song.find(params[:id])
    end

    def update
        @song = Song.find(params[:id])
        processed_params = process_artists_genres_and_colors(admin_song_params)
        processed_params.except!(:album_art_file, :video_preview_file, :audio_preview_file)

        upload_media_files(@song)

        if @song.update(processed_params)
            redirect_to admin_songs_path, notice: 'Song updated successfully!'
        else
            render :edit
        end
    end

    def destroy
        @song = Song.find(params[:id])
        @song.destroy
        redirect_to admin_songs_path, notice: 'Song deleted successfully!'
    end

    private

    def admin_song_params
        params.require(:song).permit(
            :owner, :title, :album_art, :video_preview, :audio_preview, :audio_duration,
            :album_art_file, :video_preview_file, :audio_preview_file,
            :artists, :genres, :colors
        )
    end

    def process_artists_genres_and_colors(params)
        data = params.to_h

        data[:artists] = 
            if data[:artists].is_a?(String)
                begin
                    parsed = JSON.parse(data[:artists])
                    parsed.is_a?(Array) ? parsed : data[:artists].split(',').map(&:strip)
                rescue JSON::ParserError
                    data[:artists].split(',').map(&:strip)
                end
            else
                data[:artists] || []
            end

        data[:genres] = 
            if data[:genres].is_a?(String)
                begin
                    parsed = JSON.parse(data[:genres])
                    parsed.is_a?(Array) ? parsed : data[:genres].split(',').map(&:strip)
                rescue JSON::ParserError
                    data[:genres].split(',').map(&:strip)
                end
            else
                data[:genres] || []
            end

        data[:colors] = 
            if data[:colors].is_a?(String) && data[:colors].present?
                begin
                    parsed = JSON.parse(data[:colors])
                    parsed.is_a?(Array) ? parsed : data[:colors].split(',').map(&:strip)
                rescue JSON::ParserError
                    data[:colors].split(',').map(&:strip)
                end
            else
                data[:colors] || []
            end
        
        data
    end

    def upload_media_files(song)
        if params[:song][:album_art_file].present?
            upload = Cloudinary::Uploader.upload(params[:song][:album_art_file].tempfile.path, folder: "songs/album_art")
            song.album_art = upload['secure_url']
        end

        if params[:song][:video_preview_file].present?
            upload = Cloudinary::Uploader.upload(params[:song][:video_preview_file].tempfile.path,
                                                resource_type: "video",
                                                folder: "songs/video_previews")
            song.video_preview = upload['secure_url']
        end

        if params[:song][:audio_preview_file].present?
            upload = Cloudinary::Uploader.upload(params[:song][:audio_preview_file].tempfile.path,
                                                resource_type: "video",
                                                folder: "songs/audio_previews")
            song.audio_preview = upload['secure_url']
            song.audio_duration = upload['duration']
        end
    end
end