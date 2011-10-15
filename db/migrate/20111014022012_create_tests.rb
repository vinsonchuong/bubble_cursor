class CreateTests < ActiveRecord::Migration
  def self.up
    create_table :results do |t|
      t.string :data
    end
  end

  def self.down
    drop_table :results
  end
end
