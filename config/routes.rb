Rails.application.routes.draw do
  resource :session
  resources :passwords, param: :token

  root "tasks#index"
  get  "skills"      => "skills#index",  as: :skills
  post "skills/sync" => "skills#sync",   as: :sync_skills
  get  "activity" => "activity#index"
  get   "settings" => "settings#index"
  patch "settings" => "settings#update", as: :update_settings
  resources :daily_memory_entries, path: "daily-memory", only: %i[index create]

  namespace :api do
    resources :tasks, only: %i[index] do
      member do
        patch :complete
        post  :log
      end
    end
  end

  resources :tasks, only: %i[show create update destroy] do
    member do
      patch :reorder
      patch :archive
    end
  end

  resources :agents, only: %i[index show update] do
    collection do
      post :sync
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
