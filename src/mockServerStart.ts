module.exports = async function atomRun(): Promise<void> {
  const http = __non_webpack_require__('http');

  const port = this.options.port || process.env.PPD_MOCK_SERVER_PORT || '9009';

  const serverData = {
    routes: {},
    response: [],
  };

  const { log } = this;

  const updateRules = (body: any): void => {
    const { data = {} } = JSON.parse(body);
    const { routes = [], response = {}, append = false } = data;
    if (!append) {
      serverData.routes = routes;
      serverData.response = response.responses ?? [];
    } else {
      serverData.routes = { ...serverData.routes, ...routes };

      const newResponseKeys = (response.responses ?? []).map((v) => v.responseKey);
      serverData.response = serverData.response.filter((v) => !newResponseKeys.includes(v.responseKey));

      serverData.response = [...serverData.response, ...(response.responses ?? [])];
    }
  };

  const resolverMock = (req: any, res: any): any => {
    for (const route of Object.keys(serverData.routes)) {
      const { type, responseKey } = serverData.routes[route];
      if (req.method === type && req.url === route) {
        try {
          const response = serverData.response.find((v) => v.responseKey === responseKey);
          const { body, code } = response ?? {};
          log({
            text: `Request Url: ${req.url}, Method: ${req.method}, Code: ${code}, Body: ${JSON.stringify(body)}`,
            level: 'info',
          });
          res.writeHead(code ?? 200, { 'Content-Type': 'application/json' });
          res.write(JSON.stringify(body ?? {}));
          break;
        } catch (error) {
          console.log(error);
        }
      }
    }

    return res;
  };

  async function requestHandler(request, response): Promise<void> {
    return new Promise((resolve, reject) => {
      if (request.method === 'DELETE' && request.url === '/ppd-mock-server-stop') {
        // eslint-disable-next-line no-use-before-define
        server.close();
        log({ text: 'Server Stoped.', level: 'info' });
        resolve(response.end());
      } else if (request.method === 'POST' && request.url === '/ppd-mock-server-routes') {
        let body = '';
        request.on('data', (data) => {
          body += data;
          log({ text: `Routes Data: ${data}`, level: 'info' });
        });
        request.on('end', () => {
          try {
            updateRules(body);
          } catch (error) {
            reject(error);
          }
          resolve(response.end());
        });
      } else {
        response.statusCode = 500;
        const resolvedResponse = resolverMock(request, response);
        resolve(resolvedResponse.end());
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
