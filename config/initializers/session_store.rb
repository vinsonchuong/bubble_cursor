# Be sure to restart your server when you modify this file.

# Your secret key for verifying cookie session data integrity.
# If you change this key, all old sessions will become invalid!
# Make sure the secret is at least 30 characters and all random, 
# no regular words or you'll be exposed to dictionary attacks.
ActionController::Base.session = {
  :key         => '_BubbleCursor_session',
  :secret      => '671f549392d92d30fc34e4ab3b8f3d62f94fc5d9ed745c9602d765c7db440c37edc5f426afb82c55128e3b212632f5bce7f2edd75340e99cc293b0cb56c8d8e3'
}

# Use the database for sessions instead of the cookie-based default,
# which shouldn't be used to store highly confidential information
# (create the session table with "rake db:sessions:create")
# ActionController::Base.session_store = :active_record_store
