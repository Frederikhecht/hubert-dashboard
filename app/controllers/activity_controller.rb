class ActivityController < ApplicationController

  def index
    render inertia: "Activity/Index", props: {}
  end
end
