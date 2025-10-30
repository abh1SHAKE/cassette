Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :songs
    end
  end

  namespace :admin do
    resources :songs
  end

  root 'admin/songs#index'
end
