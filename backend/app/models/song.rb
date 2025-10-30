class Song
  include Mongoid::Document
  include Mongoid::Timestamps

  field :owner, type: String
  field :title, type: String
  field :artists, type: Array, default: []
  field :album_art, type: String
  field :video_preview, type: String
  field :audio_preview, type: String
  field :audio_duration, type: Float
  field :genres, type: Array, default: []

  validates :title, presence: true
  validates :owner, presence: true
  validates :artists, presence: true

  index({ title: 1 })
  index({ owner: 1 })
  index({ artists: 1 })
end
