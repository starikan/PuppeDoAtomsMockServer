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
            const { routes = [], response: responseBody = [], appendRoutes = false } = data;
            if (!appendRoutes) {
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
        for (const route of Object.keys(serverData.routes)) {
          const { type, responseKey } = serverData.routes[route];
          if (request.method === type && request.url === route) {
            const data = serverData.response[responseKey];
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.write(JSON.stringify(data));
            response.end();
            resolve();
          }
        }
        reject(new Error('No route found.'));
      }
    });
  }

  const server = http.createServer(requestHandler);

  const runServer = (): void => {
    server.listen(port, (error) => {
      if (error) {
        this.log({ text: `Something bad happened with server on port: ${port}. ${error}`, level: 'error' });
      }
    });
  };

  runServer();

  await this.log({ text: `Starting server port: ${port}`, level: 'info' });
};
