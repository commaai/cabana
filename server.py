from flask import Flask, request, redirect
import requests

CLIENT_ID = '4b43250e7499a97d62a5'
CLIENT_SECRET = '65dbd43f3e298e024a7aff85b2a9ed261ffc9fcf'

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
          'code': code}

  resp = requests.post('https://github.com/login/oauth/access_token',
                        data=data,
                        headers={'Accept': 'application/json'})
  oauth_resp = resp.json()
  print(oauth_resp)

  return redirect('http://127.0.0.1:3000/?gh_access_token={}'.format(oauth_resp['access_token']))

if __name__ == '__main__':
  app.run(port=1235)