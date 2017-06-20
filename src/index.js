if (!global._babelPolyfill) { require('babel-polyfill'); }

import { _, filter, requestParserJson, requestParser, responseParser, responseDocsParser, deleteParser, definitionParser } from './utils';
import errors from 'feathers-errors';
import Solr from './client/solr';
import makeDebug from 'debug';

const debug = makeDebug('feathers-solr');

class Service {

	constructor(options = {}) {

		this.options = options;

		this.Solr = new Solr({
			scheme: this.options.scheme || 'http',
			host: this.options.host || 'localhost',
			port: this.options.port || 8983,
			path: this.options.path || '/solr',
			core: this.options.core || '/gettingstarted',
			managedScheme: this.options.managedScheme || false,
			/*commitStrategy softCommit: true, commit: true, commitWithin: 50*/
			commitStrategy: this.options.commitStrategy || {
				softCommit: true,
				commitWithin: 50000,
				overwrite: true
			}
		});

		console.log('feather-solr Service started');
	}

	status() {
		let coreAdmin = this.Solr.coreAdmin();
		coreAdmin.status()
			.then(function(res) {
				console.log('core status',res);
			})
			.catch(function(err){
				console.error(err);
				// return reject(new errors.BadRequest());
			});
	}

	define(fields) {
		let schemaApi = this.Solr.schema();
		schemaApi.addField(definitionParser('add', fields))
			.then(function(res) {
				console.log('schemaApi.addField',res.errors);
			})
			.catch(function(err){
				console.error(err);
			});
	}

	describe() {
		let schemaApi = this.Solr.schema();
		schemaApi.fields()
			.then(function(res) {
				console.log('schemaApi.fields',res.fields);
			})
			.catch(function(err){
				console.error(err);
			});
	}

	find(params) {
		let _self = this;
		// params._query = Object.assign({}, params.query);
		return new Promise((resolve, reject) => {
			this.Solr.json(requestParserJson(params, _self.options))
				.then(function(res) {
					resolve(responseParser(params, _self.options, res));
				})
				.catch(function(err) {
					return reject(new errors.BadRequest());
				});
		});
	}

	get(id) {
		let _self = this;
		// console.log(requestParserJson({query:{id: id}}),'get ????');
		return new Promise((resolve, reject) => {
			this.Solr.json(requestParserJson({ query: { id: id } }))
				.then(function(res) {
					let docs = responseDocsParser(res);
					// console.log('docs',docs);
					if (typeof docs !== 'undefined') {
						return resolve(docs);
					} else {
						return reject(new errors.NotFound(`No record found for id '${id}'`));
					}
				})
				.catch(function(err) {
					console.log('err', err);
					return reject(new errors.NotFound(`No record found for id '${id}'`));
				});
		});
	}

	create(data) {

		let _self = this;

		return new Promise((resolve, reject) => {
			this.Solr.update(data)
				.then(function(res) {
					if (res.responseHeader.status === 0) {
						resolve(data);
					} else {
						return reject(new errors.BadRequest());
					}
				})
				.catch(function(err) {
					return reject(new errors.BadRequest());
				});
		});
	}

	update(id, data) {

		if (id === null || Array.isArray(data)) {
			return Promise.reject(new errors.BadRequest(
				`You can not replace multiple instances. Did you mean 'patch'?`
			));
		}

		let _self = this;

		return new Promise((resolve, reject) => {
			this.Solr.json(requestParserJson({ query: { id: id, $limit: 1 } }, this.options))
				.then(function(res) {

					res = responseDocsParser(res);
					data.id = id;
					let copy = {};

					Object.keys(res).forEach(key => {
						if (typeof data[key] === 'undefined') {
							copy[key] = null;
						} else {
							copy[key] = data[key];
						}
					});

					_self.create(copy)
						.then(function(res) {
							resolve(copy);
						})
						.catch(function(err) {
							return reject(new errors.BadRequest());
						});
				})
				.catch(function(err) {
					console.log('err', err);
					return reject(new errors.BadRequest());
				});
		});
	}

	patch(id, data, params) {}

	remove(id, params) {
		// console.log('id, params',id, params);
		let _self = this;

		return new Promise((resolve, reject) => {
			this.Solr.delete(deleteParser(id, params))
				.then(function(res) {
					resolve(res);
				})
				.catch(function(err) {
					return reject(new errors.BadRequest());
				});
		});
	}

	test(param) {
		// this.Solr.search.testMe('wow',param);
		this.Solr.req('test solr client' + param);
		return param;
	}

	init(param) {
		console.log('wow');
		console.log('wow', param);
		console.log('wow', this.Solr);
		// if()
	}

	client() {
		return this.Solr;
	}
}

export default function init(options) {
	debug('Initializing feathers-solr plugin');
	console.log('Initializing feathers-solr plugin', options);
	return new Service(options);
}

init.Service = Service;
