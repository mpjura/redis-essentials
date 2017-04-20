'use strict';

// Time Series class
module.exports = class TimeSeries {
	/**
	 * Constructs the TimeSeries instance.
	 *
	 * @param  {Object} client    Redis client.
	 * @param  {String} namespace Namespace for the time series keys.
	 */
	constructor(client, namespace) {
		this.namespace = namespace;
		this.client = client;
		// define unit measurements
		this.units = {
			second: 1,
			minute: 60,
			hour: 60 * 60,
			day: 24 * 60 * 60,
		};
		// define granularites with name, ttl, duration
		// NOTE: null ttl should not be expired
		this.granularities = {
			'1sec' : { name: '1sec', ttl: this.units.hour * 2, duration: this.units.second },
			'1min' : { name: '1min', ttl: this.units.day * 7, duration: this.units.minute },
			'1hour' : { name: '1hour', ttl: this.units.day * 60, duration: this.units.hour },
			'1day' : { name: '1day', ttl: null, duration: this.units.day },
		}
	}

	/**
	 * Fetches an range of data points for a given granularity. Executes a callback
	 * with the results.
	 *
	 * @param  {String}   name           Granularity name.
	 * @param  {Number}   beginTimestamp Beginning timestamp.
	 * @param  {Number}   endTimestamp   Ending timestamp.
	 * @param  {Function} callback       Callback function.
	 */
	fetch(name, beginTimestamp, endTimestamp, callback) {
		// get the granularity
		const granularity = this.granularities[name];
		// store the duration
		const duration = granularity.duration;
		// get rounded beginning and ending timestamps
		const begin = this._getRoundedTimestamp(beginTimestamp, duration);
		const end = this._getRoundedTimestamp(endTimestamp, duration);
		// create an empty array to hold keys
		let keys = [];
		// loop through rounded timestamps from beginning to end
		// and add the key names to the keys array
		for (let timestamp = begin; timestamp <= end; timestamp += duration) {
			keys.push( this._getKeyName(granularity, timestamp) );
		}
		// attempt to get the values for all of the keys
		this.client.mget(keys, (err, replies) => {
			// create an empty array to hold individual result data
			let results = [];
			// loop over key values
			replies.forEach((reply, index) => {
				// derive a timestamp from our place in the loop
				const timestamp = beginTimestamp + (index * duration);
				// parse the string value into an int
				const value = parseInt(reply, 10) || 0;
				// add the data points to the results
				results.push({timestamp, value});
			});
			// execute the callback passing the name and results
			callback(name, results);
		});
	}

	/**
	 * Registers an event with multiple granularities at a given timestamp.
	 *
	 * @param {Number} timestamp Timestamp in seconds.
	 */
	insert(timestamp) {
		// iterate over the granularity names
		for (const name in this.granularities) {
			// get this granularity
			const granularity = this.granularities[name];
			// generate a key for the timestamp at this granularity
			const key = this._getKeyName(granularity, timestamp);
			// increment the key
			this.client.incr(key);
			// if a ttl exists on this granularity, expire the key after that ttl
			if (granularity.ttl !== null) {
				this.client.expire(key, granularity.ttl);
			}
		}
	}

	/**
	 * Returns a key string based on granularity and timestamp.
	 *
	 * @param  {Object} granularity Granularity object.
	 * @param  {Number} timestamp   Timestamp.
	 *
	 * @return {String}             String key based on timestamp and granularity.
	 */
	_getKeyName(granularity, timestamp) {
		const rounded = this._getRoundedTimestamp(timestamp, granularity.duration);

		return `${this.namespace}:${granularity.name}:${rounded}`;
	}

	/**
	 * Returns a normalized timestamp based on the duration. Ex. If the duration is
	 * 60 and the timestamp is between 0 and 60, 0 will be returned. If the duration
	 * is between 60 and 120, 60 will be returned, etc.
	 *
	 * @param  {Number} timestamp Timestamp.
	 * @param  {Number} duration  Duration of the granularity.
	 *
	 * @return {Number}           Normalized timestamp.
	 */
	_getRoundedTimestamp(timestamp, duration) {
		return Math.floor(timestamp / duration) * duration;
	}
};
