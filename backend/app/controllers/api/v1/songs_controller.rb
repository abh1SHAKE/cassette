class Api::V1::SongsController < ApplicationController
    before_action :set_song, only: [:show, :update, :destroy]

    # GET /api/v1/songs
    def index
        @songs = Song.all
        render json: @songs
    end

    # GET /api/v1/songs/:id
    def show
        render json: @song
    end

    # POST /api/v1/songs
    def create
        @song = Song.new(song_params)

        if @song.save
            render json: @song, status: :created
        else
            render json: { errors: @song.errors.full_messages }, status: :unprocessable_entity
        end
    end

    # PATCH/PUT /api/v1/songs/:id
    def update
        if @song.update(song_params)
            render json: @song
        else
            render json: { errors: @song.errors.full_messages }, status: :unprocessable_entity
        end
    end

    # DELETE /api/v1/songs/:id
    def destroy
        @song.destroy
        head :no_content
    end


    private 

    def set_song
        @song = Song.find(params[:id])
    rescue Mongoid::Errors::DocumentNotFound
        render json: { error: 'Song not found' }, status: :not_found
    end

    def song_params
        params.require(:song).permit(:owner, :title, :album_art, :video_preview, :audio_preview, 
                                    :audio_duration, 
                                    artists: [], genres: [])
    end
end
