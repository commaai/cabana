from flask import Flask, request, redirect
import requests
import json

CLIENT_ID = 'f1e42d14f45491f9ca34'
CLIENT_SECRET = ''

OAUTH_STATES = []
app = Flask(__name__)

@app.route('/auth_state')
def auth_state():
  # save anti csrf secret
  secret = request.args.get('state')
  OAUTH_STATES.append(secret)

@app.route('/callback')
def callback():
  code = request.args.get('code')
  state = request.args.get('state')

  data = {'client_id': CLIENT_ID,
          'client_secret': CLIENT_SECRET,
          'code': code,
          'state': state}

  resp = requests.post('https://github.com/login/oauth/access_token',
                        data=data,
                        headers={'Accept': 'application/json'})
  oauth_resp = resp.json()

  route = json.loads(state)['route']

  return redirect('http://127.0.0.1:3000/?route={}&gh_access_token={}'.format(route, oauth_resp['access_token']))

if __name__ == '__main__':
  app.run(port=1235)
