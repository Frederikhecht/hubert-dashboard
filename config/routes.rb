Rails.application.routes.draw do
  resource :session
  resources :passwords, param: :token

  root "tasks#index"
  get  "skills"   => "skills#index"
  get  "activity" => "activity#index"
  get  "settings" => "settings#index"

  resources :agents, only: %i[index show update] do
    collection do
      post :sync
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
