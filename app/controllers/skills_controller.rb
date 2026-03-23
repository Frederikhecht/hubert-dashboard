class SkillsController < ApplicationController

  def index
    render inertia: "Skills/Index", props: {}
  end
end
