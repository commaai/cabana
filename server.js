const handler = require('serve-handler');
const http = require('http');

const server = http.createServer((request, response) => {
  // You pass two more arguments for config and middleware
  // More details here: https://github.com/zeit/serve-handler#options

  request.url = request.url.replace('/cabana', '');

  handler(request, response, {
    public: 'build',
    redirects: [
      { source: 'cabana/:page', destination: '/:page' },
      { source: 'cabana/', destination: '/index.js' },
    ]
  });
});

server.listen(3002, () => {
  console.log('Running at http://localhost:3002');
});
