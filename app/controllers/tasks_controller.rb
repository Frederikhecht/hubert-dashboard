class TasksController < ApplicationController

  def index
    render inertia: "Tasks/Index", props: {}
  end
end
