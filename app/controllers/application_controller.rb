class ApplicationController < ActionController::Base
  include Authentication
  allow_browser versions: :modern

  inertia_share do
    {
      auth: {
        user: Current.user ? { email_address: Current.user.email_address } : nil
      },
      flash: {
        notice: flash[:notice],
        alert: flash[:alert]
      }
    }
  end
end
