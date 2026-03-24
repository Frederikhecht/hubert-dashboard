class SettingsController < ApplicationController
  def index
    render inertia: "Settings/Index", props: {
      preInstructions: Current.user.task_pre_instructions || "",
      timezone: Current.user.timezone || ""
    }
  end

  def update
    Current.user.update!(
      task_pre_instructions: params[:preInstructions],
      timezone: params[:timezone].presence
    )
    redirect_to settings_path, notice: "Settings saved."
  rescue ActiveRecord::RecordInvalid => e
    redirect_to settings_path, alert: e.message
  end
end
