class CreateTaskRecurringSchedules < ActiveRecord::Migration[8.1]
  def change
    create_table :task_recurring_schedules do |t|
      t.references :task_template, null: false, foreign_key: true
      t.string :frequency_type
      t.integer :interval
      t.json :days_of_week
      t.integer :day_of_week
      t.integer :day_of_month
      t.integer :month_of_year
      t.json :times_of_day
      t.boolean :active, null: false, default: true
      t.datetime :next_run_at

      t.timestamps
    end
  end
end
