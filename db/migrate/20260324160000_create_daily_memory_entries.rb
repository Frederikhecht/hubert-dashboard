class CreateDailyMemoryEntries < ActiveRecord::Migration[8.1]
  def change
    create_table :daily_memory_entries do |t|
      t.date :entry_date, null: false
      t.string :project
      t.text :summary, null: false
      t.text :details

      t.timestamps
    end

    add_index :daily_memory_entries, :entry_date
  end
end
