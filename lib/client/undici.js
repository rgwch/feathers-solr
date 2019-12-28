const qs = require('qs');
const debug = require('debug')('feathers-solr-client-undici');
const debugError = require('debug')('feathers-solr-client-undici');
const { FeathersError } = require('@feathersjs/errors');

class UndiciClient {
  constructor(undici, conn, options = {}) {
    this.options = Object.assign(
      {
        connections: 100,
        pipelining: 10
      },
      options
    );

    this.client = new undici.Client(conn, this.options);
  }

  get(api, params = {}) {
    const { url, options } = this._options(api, null, params);
    debug('GET', url);
    return this._request(options);
  }

  post(api, data, params = {}) {
    const { url, options } = this._options(api, data, params);
    debug('POST:', url, data);
    return this._request(options);
  }

  _options(api, data, params) {
    const url = `${this.client.url.pathname}/${api}?${qs.stringify(params, { encode: false })}`;
    const options = {
      headers: {
        'content-type': 'application/json'
      },
      path: url,
      method: data ? 'POST' : 'GET'
    };
    if (data) options.body = Buffer.from(JSON.stringify(data));

    return { url, options };
  }

  _request(options) {
    const self = this;
    return new Promise(function(resolve, reject) {
      self.client.request(options, function(err, data) {
        if (err) reject(err);
        try {
          const { statusCode, headers, body } = data;
          if (statusCode >= 200 && statusCode < 300) {
            debug('Response:', statusCode);
            const bufs = [];
            body.on('data', buf => {
              bufs.push(buf);
            });
            body.on('end', () => {
              return resolve(JSON.parse(Buffer.concat(bufs).toString('utf8')));
            });
          } else {
            reject(statusCode);
          }
        } catch (error) {
          // throw new FeathersError(res.status, res.statusText);
          reject(statusCode, error);
        }
      });
    });
  }
}

module.exports = UndiciClient;