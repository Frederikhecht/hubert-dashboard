require "open3"

class OpenclawDispatchService
  OPENCLAW_CLI = ENV.fetch("OPENCLAW_CLI", "openclaw")
  DEFAULT_CHANNEL = ENV.fetch("OPENCLAW_DELIVERY_CHANNEL", "telegram")
  TIMEOUT_SECONDS = 600

  def dispatch_task(task)
    unless task.agent
      return { success: false, error: "Task has no assigned agent" }
    end

    args = build_command_args(task)
    Rails.logger.info("[Dispatch] Dispatching task ##{task.id} to agent #{task.agent.openclaw_agent_id}")

    stdout, stderr, status = Timeout.timeout(TIMEOUT_SECONDS) { Open3.capture3(*args) }

    if status.success?
      Rails.logger.info("[Dispatch] Task ##{task.id} completed successfully")
      { success: true, stdout: stdout, stderr: stderr }
    else
      Rails.logger.error("[Dispatch] Task ##{task.id} failed: #{stderr}")
      { success: false, error: stderr.presence || "Command exited with status #{status.exitstatus}", stdout: stdout }
    end
  rescue Timeout::Error
    Rails.logger.error("[Dispatch] Task ##{task.id} timed out after #{TIMEOUT_SECONDS}s")
    { success: false, error: "Task timed out after #{TIMEOUT_SECONDS} seconds" }
  rescue StandardError => e
    Rails.logger.error("[Dispatch] Task ##{task.id} error: #{e.message}")
    { success: false, error: e.message }
  end

  private

  def build_command_args(task)
    [
      OPENCLAW_CLI, "agent",
      "--agent", task.agent.openclaw_agent_id,
      "--message", TaskInstructionsBuilder.new(task).build,
      "--deliver",
      "--channel", DEFAULT_CHANNEL
    ]
  end
end
