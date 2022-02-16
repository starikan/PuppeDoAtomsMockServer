module.exports = async function atomRun(): Promise<void> {
  const http = __non_webpack_require__('http');

  const port = this.options.port || process.env.PPD_MOCK_SERVER_PORT || '9009';

  const serverData = {
    routes: {},
    response: {},
  };

  async function requestHandler(request, response): Promise<void> {
    return new Promise((resolve, reject) => {
      if (request.method === 'DELETE' && request.url === '/ppd-mock-server-stop') {
        // eslint-disable-next-line no-use-before-define
        server.close();
        resolve(response.end());
      } else if (request.method === 'POST' && request.url === '/ppd-mock-server-routes') {
        let body = '';
        request.on('data', (data) => {
          body += data;
        });
        request.on('end', () => {
          try {
            const { data = {} } = JSON.parse(body);
            const { routes = [], response: responseBody = [], append = false } = data;
            if (!append) {
              serverData.routes = routes;
              serverData.response = responseBody;
            } else {
              serverData.routes = { ...serverData.routes, ...routes };
              serverData.response = { ...serverData.response, ...responseBody };
            }
          } catch (error) {
            reject(error);
          }
          resolve(response.end());
        });
      } else {
        response.writeHead(500, { 'Content-Type': 'application/json' });
        for (const route of Object.keys(serverData.routes)) {
          const { type, responseKey } = serverData.routes[route];
          if (request.method === type && request.url === route) {
            try {
              const data = serverData.response[responseKey];
              response.writeHead(200, { 'Content-Type': 'application/json' });
              response.write(JSON.stringify(data));
              break;
            } catch (error) {
              console.log(error);
            }
          }
        }
        resolve(response.end());
      }
    });
  }

  const server = http.createServer(requestHandler);
  server.listen(port, (error) => {
    if (error) {
      this.log({ text: `Something bad happened with server on port: ${port}. ${error}`, level: 'error' });
    }
  });

  await this.log({ text: `Starting server port: ${port}`, level: 'info' });
};
