Rails.application.routes.draw do
  resource :session
  resources :passwords, param: :token

  root "tasks#index"
  get "skills" => "skills#index"
  get "activity" => "activity#index"
  get "agents" => "agents#index"
  get "settings" => "settings#index"

  get "up" => "rails/health#show", as: :rails_health_check
end
