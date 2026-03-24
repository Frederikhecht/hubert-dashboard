# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_03_24_160000) do
  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "agents", force: :cascade do |t|
    t.boolean "active"
    t.datetime "created_at", null: false
    t.string "name"
    t.string "openclaw_agent_id"
    t.string "role"
    t.datetime "updated_at", null: false
    t.index ["openclaw_agent_id"], name: "index_agents_on_openclaw_agent_id", unique: true
  end

  create_table "daily_memory_entries", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "details"
    t.date "entry_date", null: false
    t.string "project"
    t.text "summary", null: false
    t.datetime "updated_at", null: false
    t.index ["entry_date"], name: "index_daily_memory_entries_on_entry_date"
  end

  create_table "sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "ip_address"
    t.datetime "updated_at", null: false
    t.string "user_agent"
    t.integer "user_id", null: false
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "skills", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "description"
    t.string "name"
    t.string "slug"
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_skills_on_slug", unique: true
  end

  create_table "task_activities", force: :cascade do |t|
    t.string "action"
    t.datetime "created_at", null: false
    t.string "details"
    t.integer "task_id", null: false
    t.datetime "timestamp"
    t.datetime "updated_at", null: false
    t.index ["task_id"], name: "index_task_activities_on_task_id"
  end

  create_table "task_recurring_schedules", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.integer "day_of_month"
    t.integer "day_of_week"
    t.json "days_of_week"
    t.string "frequency_type"
    t.integer "interval"
    t.integer "month_of_year"
    t.datetime "next_run_at"
    t.integer "task_template_id", null: false
    t.json "times_of_day"
    t.datetime "updated_at", null: false
    t.index ["task_template_id"], name: "index_task_recurring_schedules_on_task_template_id"
  end

  create_table "task_templates", force: :cascade do |t|
    t.integer "agent_id"
    t.datetime "created_at", null: false
    t.text "description"
    t.string "skill"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["agent_id"], name: "index_task_templates_on_agent_id"
  end

  create_table "tasks", force: :cascade do |t|
    t.integer "agent_id"
    t.datetime "archived_at"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.text "description"
    t.datetime "dispatched_at"
    t.integer "position", default: 0, null: false
    t.datetime "scheduled_for"
    t.string "session_key"
    t.string "skill"
    t.string "status", default: "queue", null: false
    t.bigint "task_recurring_schedule_id"
    t.integer "task_template_id"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["agent_id"], name: "index_tasks_on_agent_id"
    t.index ["archived_at"], name: "index_tasks_on_archived_at"
    t.index ["status"], name: "index_tasks_on_status"
    t.index ["task_recurring_schedule_id"], name: "index_tasks_on_task_recurring_schedule_id"
    t.index ["task_template_id"], name: "index_tasks_on_task_template_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email_address", null: false
    t.string "password_digest", null: false
    t.text "task_pre_instructions"
    t.string "timezone"
    t.datetime "updated_at", null: false
    t.index ["email_address"], name: "index_users_on_email_address", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "sessions", "users"
  add_foreign_key "task_activities", "tasks"
  add_foreign_key "task_recurring_schedules", "task_templates"
  add_foreign_key "task_templates", "agents"
  add_foreign_key "tasks", "agents"
  add_foreign_key "tasks", "task_templates"
end
