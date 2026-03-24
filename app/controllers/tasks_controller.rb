class TasksController < ApplicationController
  before_action :set_task, only: %i[show update destroy reorder archive]

  def index
    Task.auto_archive_old_done_tasks!

    tasks = Task.not_archived.includes(:agent).map { |task| serialize_task(task) }
    templates = TaskTemplate.includes(:agent).order(title: :asc).map { |t| serialize_template(t) }
    agents = Agent.order(:name).map { |a| { id: a.id.to_s, name: a.name, avatarUrl: a.avatar_url } }
    skills = Skill.ordered.map { |s| { id: s.id.to_s, slug: s.slug, name: s.name } }

    render inertia: "Tasks/Index", props: {
      tasks: tasks,
      agents: agents,
      templates: templates,
      skills: skills
    }
  end

  def show
    activities = @task.task_activities.order(timestamp: :desc)
    schedule = @task.task_recurring_schedule

    render inertia: "Tasks/Show", props: {
      task: serialize_task(@task),
      activities: activities.map { |a| serialize_task_activity(a) },
      assignedAgent: @task.agent ? { id: @task.agent.id.to_s, name: @task.agent.name, avatarUrl: @task.agent.avatar_url } : nil,
      recurringDescription: schedule&.human_description,
      executionLogs: TaskLogService.new(@task).verbose_logs
    }
  end

  def create
    @task = Task.new(task_params)
    if @task.save
      @task.task_activities.create!(action: "assigned", details: "Task created")
      if @task.agent_id.present?
        @task.task_activities.create!(action: "assigned", details: "Assigned to #{@task.agent.name}")
      end

      if params.dig(:task, :make_recurring) == "true" || params.dig(:task, :make_recurring) == true
        make_task_recurring!(@task)
      end

      redirect_to tasks_path, notice: "Task created."
    else
      redirect_to tasks_path, alert: @task.errors.full_messages.join(", ")
    end
  end

  def update
    old_status = @task.status
    old_agent_id = @task.agent_id

    if @task.update(task_update_params)
      if @task.status != old_status
        @task.task_activities.create!(
          action: "status_changed",
          details: "Status changed to #{@task.status.humanize}"
        )
        @task.update_column(:completed_at, Time.current) if @task.status == "done"
      end

      if @task.agent_id != old_agent_id && @task.agent_id.present?
        @task.task_activities.create!(
          action: "assigned",
          details: "Assigned to #{@task.agent.name}"
        )
      end

      redirect_to tasks_path, notice: "Task updated."
    else
      redirect_to tasks_path, alert: @task.errors.full_messages.join(", ")
    end
  end

  def destroy
    @task.destroy
    redirect_to tasks_path, notice: "Task deleted."
  end

  def reorder
    new_status = params[:status]
    new_position = params[:position].to_i

    unless Task::STATUSES.include?(new_status)
      return render json: { error: "Invalid status" }, status: :unprocessable_entity
    end

    old_status = @task.status
    @task.move_to(new_status: new_status, new_position: new_position)

    if old_status != new_status
      @task.task_activities.create!(
        action: "status_changed",
        details: "Moved to #{new_status.humanize}"
      )
      if new_status == "done"
        @task.update_column(:completed_at, Time.current)
      end
    end

    render json: { ok: true }
  end

  def archive
    @task.archive!
    redirect_to tasks_path, notice: "Task archived."
  end

  private

  def set_task
    @task = Task.unscoped.find(params[:id])
  end

  def task_params
    params.require(:task).permit(
      :title, :description, :skill, :status, :agent_id,
      :task_template_id, :scheduled_for
    )
  end

  def task_update_params
    params.require(:task).permit(
      :title, :description, :skill, :status, :agent_id, :scheduled_for
    )
  end

  def make_task_recurring!(task)
    rs_params = params.dig(:task, :recurring_schedule)
    return unless rs_params

    template = TaskTemplate.create!(
      title: task.title,
      description: task.description,
      agent_id: task.agent_id,
      skill: task.skill
    )
    task.update!(task_template_id: template.id)

    schedule = template.task_recurring_schedules.create!(
      frequency_type: rs_params[:frequency_type],
      interval: rs_params[:interval].presence&.to_i,
      times_of_day: Array(rs_params[:times_of_day]).reject(&:blank?),
      days_of_week: Array(rs_params[:days_of_week]).map(&:to_i),
      day_of_week: rs_params[:day_of_week].presence&.to_i,
      day_of_month: rs_params[:day_of_month].presence&.to_i,
      month_of_year: rs_params[:month_of_year].presence&.to_i,
      active: true
    )
    task.update!(task_recurring_schedule_id: schedule.id)
  rescue StandardError => e
    Rails.logger.error("[Tasks#create] Failed to make task recurring: #{e.message}")
  end

  def serialize_task(task)
    {
      id: task.id.to_s,
      title: task.title,
      description: task.description || "",
      skill: task.skill,
      status: task.status,
      agentId: task.agent_id&.to_s,
      agentName: task.agent&.name,
      agentAvatarUrl: task.agent&.avatar_url,
      templateId: task.task_template_id&.to_s,
      scheduledFor: task.scheduled_for&.iso8601,
      completedAt: task.completed_at&.iso8601,
      position: task.position
    }
  end

  def serialize_template(template)
    {
      id: template.id.to_s,
      title: template.title,
      description: template.description || "",
      skill: template.skill,
      agentId: template.agent_id&.to_s
    }
  end

  def serialize_task_activity(activity)
    {
      id: activity.id.to_s,
      action: activity.action,
      details: activity.details,
      timestamp: activity.timestamp.iso8601,
      taskId: @task.id.to_s,
      taskTitle: @task.title,
      agentId: @task.agent_id&.to_s,
      agentName: @task.agent&.name,
      agentAvatarUrl: @task.agent&.avatar_url
    }
  end
end
