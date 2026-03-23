class AgentsController < ApplicationController

  def index
    render inertia: "Agents/Index", props: {}
  end
end
