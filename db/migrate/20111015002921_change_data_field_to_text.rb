class ChangeDataFieldToText < ActiveRecord::Migration
  def self.up
    change_column :results, :data, :text
  end

  def self.down
    change_column :results, :data, :string
  end
end
