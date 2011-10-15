ActionController::Routing::Routes.draw do |map|
  map.resources(
      :results,
      :only => :create
  )
end
