class SettingsController < ApplicationController

  def index
    render inertia: "Settings/Index", props: {}
  end
end
