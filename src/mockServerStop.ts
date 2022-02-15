module.exports = async function atomRun(): Promise<void> {
  const axios = __non_webpack_require__('axios');

  const port = this.options.port || process.env.PPD_MOCK_SERVER_PORT || '9009';

  await axios.delete(`http://localhost:${port}/ppd-mock-server-stop`);
  await this.log({ text: `Stop Mock Server on port: ${port}`, level: 'info' });
};
