Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
        allowed_origins = ENV.fetch('ALLOWED_ORIGINS', 'http://localhost:4200').split(',').map(&:strip)
        origins allowed_origins

        resource '*',
            headers: :any,
            methods: [:get, :post, :put, :patch, :delete, :options, :head],
            credentials: true
    end
end