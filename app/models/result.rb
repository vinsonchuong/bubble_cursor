class Result < ActiveRecord::Base
  serialize :data

  def unserialize_data
    ActiveSupport::JSON.decode(data)
  end
end
