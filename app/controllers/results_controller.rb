class ResultsController < ApplicationController
  # POST /tests
  def create
    Result.create(:data => params[:data])
    render :nothing => true
  end
end
