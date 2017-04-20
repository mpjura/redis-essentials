'use strict';

// get the timeseries module from args
const argv = process.argv;

if ( argv.length < 3 ) {
	console.log('Usage: `node using-timeseries.js [string|hash]`');
	process.exit(1);
}

const type = argv[2];

// redis client
const client = require('redis').createClient();

// flush all keys
client.flushall();

// import the TimeSeries class
const TimeSeries = require(`./timeseries-${type}`);

// create an instance of the timeseries to track
// purchases of an item
let purchases = new TimeSeries(client, 'purchases:item1');

// displays the results in a table
const displayResult = (name, results) => {
	console.log(`
Results from ${name}:
Timestamp \t| Value
--------------- | -------`);

	results.forEach(result => console.log(`${result.timestamp}\t\t| ${result.value}`));
};

let begin = 0;

// make a bunch of inserts
purchases.insert(begin);
for (let i = begin; i < 5000; i++ ) {
	purchases.insert(begin + Math.floor(Math.random() * 120));
}

// fetch results for 1sec and 1min time series
purchases.fetch('1sec', begin, begin + 4, displayResult);
purchases.fetch('1min', begin, begin + 120, displayResult);

client.quit();
