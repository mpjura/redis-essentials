'use strict';

// redis client
const client = require('redis').createClient();

// adds a visitor to the hyperloglog at the given date
const addVisit = (date, user) => {
	client.pfadd(`visits:${date}`, user)
};

// counts unique visitors for the given array of dates
const count = (dates) => {
	let keys = [];

	dates.forEach( date => keys.push(`visits:${date}`) );

	client.pfcount(keys, (err, reply) => {
		console.log(`Dates ${dates.join(', ')} had ${reply} visits.`);
	});
};

// merges visitors from hours of a given day to
// a single hyperloglog of unique visitors for the day
const aggregateDate = date => {
	// first date is the target of the merge
	let keys = [`visits:${date}`];
	// rest of these keys will be merged
	for (let i = 0; i <24; i++) {
		keys.push(`visits:${date}T${i}`);
	}
	// merge 'em
	client.pfmerge(keys, (err, reply) => {
		console.log(`Aggregated date: ${date}`);
	});
}

// mock some visits
const MAX_USERS = 200;
const TOTAL_VISITS = 1000;

for (let i = 0; i < TOTAL_VISITS; i++ ) {
	let username = `user_${Math.floor(1 + Math.random() * MAX_USERS)}`;
	let hour = Math.floor( Math.random() * 24);

	addVisit(`2015-01-01T${hour}`, username);
}

// count visits for 0 hour
count(['2015-01-01T0']);
// count more shit
count(['2015-01-01T5', '2015-01-01T6', '2015-01-01T7']);

// aggregate all uniques for 1/1
aggregateDate('2015-01-01');

// count the uniques on 1/1
count(['2015-01-01']);

// close the redis connection
client.quit();
