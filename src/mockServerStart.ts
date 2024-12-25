module.exports = async function atomRun(): Promise<void> {
  const http = __non_webpack_require__('http');

  const port = this.options.port || process.env.PPD_MOCK_SERVER_PORT || '9009';

  const serverData: {
    routes: { type: string; responseKey: string; data?: string; route: string; dataRegExp?: boolean }[];
    response: { body: string; code: string; responseKey: string }[];
  } = {
    routes: [],
    response: [],
  };

  const { log } = this;

  const updateRules = (body: any): void => {
    const { data = {} } = JSON.parse(body);
    const { response = [], append = false } = data;
    let { routes = [] } = data;

    if (!Array.isArray(routes)) {
      const newRoutes = [];
      for (const route of Object.keys(routes)) {
        newRoutes.push([...routes[route], route]);
      }
      routes = newRoutes;
    }

    if (!append) {
      serverData.routes = routes;
      serverData.response = response.responses ?? [];
    } else {
      serverData.routes = [...serverData.routes, ...routes];

      const newResponseKeys = (response.responses ?? []).map((v) => v.responseKey);
      serverData.response = serverData.response.filter((v) => !newResponseKeys.includes(v.responseKey));

      serverData.response = [...serverData.response, ...(response.responses ?? [])];
    }
  };

  const resolverMock = (req, res): any => {
    let requestBody = '';
    req.on('data', (chunk) => {
      requestBody += chunk;
    });
    req.on('end', () => {
      try {
        for (const routeData of serverData.routes) {
          const { type, responseKey, data, route, dataRegExp = false } = routeData;

          if (req.method === type && req.url === route) {
            let dataMatch = true;

            // eslint-disable-next-line security/detect-non-literal-regexp
            if (data && (dataRegExp ? new RegExp(data, 'gm').test(requestBody) : data !== requestBody)) {
              dataMatch = false;
            }

            if (dataMatch) {
              const response = serverData.response.find((v) => v.responseKey === responseKey);
              const { body, code } = response ?? {};
              log({
                text: `Request Url: ${req.url}, Method: ${req.method}, Code: ${code}, Body: ${JSON.stringify(body)}`,
                level: 'info',
              });
              res.writeHead(code ?? 200, { 'Content-Type': 'application/json' });
              res.write(JSON.stringify(body ?? {}));
              return res.end();
            }
          }
        }
      } catch (error) {
        console.log(error);
        res.write(error);
      } finally {
        res.statusCode = 500;
        // eslint-disable-next-line no-unsafe-finally
        return res.end();
      }
    });
    return null; // return null, because we will handle 'end' events in this function
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
        resolverMock(request, response);
        resolve(); // Resolve the promise because response.end() will be called inside resolverMock
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
