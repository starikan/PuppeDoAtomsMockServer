module.exports = async function atomRun(): Promise<void> {
  const axios = __non_webpack_require__('axios');

  const port = this.options.port || process.env.PPD_MOCK_SERVER_PORT || '9009';
  const { routes, response } = this.data;
  const append = this.data.append !== null ? this.data.append : false;

  await axios.post(`http://localhost:${port}/ppd-mock-server-routes`, { data: { routes, response, append } });
  await this.log({ text: `Update Routes on Mock Server on port: ${port}`, level: 'info' });
};
