'use strict';
// Simple metrics with redis bitmaps

// redis client
const client = require( "redis" ).createClient( {
	// manipulate buffers instead of strings
	// easier when dealing with bits
	return_buffers: true,
} );

let storeDailyVisit = (date, id) => {
	// create a key
	let key = createKey("daily", date);
	// set the bit at the given id to 1
	client.setbit(key, id, 1, (err, reply) => {
		// handle error
		if (err) {
			return handleError(err);
		}

		console.log(`User ${id} visited on ${date}.`);
	});
};

let countDailyVisits = (date) => {
	// get the key
	let key = createKey("daily", date);
	// get the bit count for this key
	client.bitcount(key, (err, reply) => {
		// handle error
		if ( err ) {
			return handleError( err );
		}

		// log it
		console.log(`${date} had ${reply} visits.`);
	});
};

let showVisitorIdsFromDate = (date) => {
	// get the key
	let key = createKey("daily", date);
	// get the whole bitmap
	// returns a node buffer because we set return_buffers above
	client.get(key, (err, bitmap) => {
		if (err) {
			return handleError(err);
		}
		// empty list of visitor ids
		let ids = [],
		// get the bitmap data
		data = bitmap.toJSON().data;
		// loop over the bytes
		data.forEach( (byte, index) => {
			// loop over the bits in the byte
			for (let bit = 7; bit >= 0; bit--) {
				// shift a bit and compare with a bitmask of 1
				let visited = byte >> bit & 1;
				// check if 1
				if (visited == 1) {
					// get the index (user id) of the visited bit
					let id = index * 8 + (7 - bit);
					// push on to visited ids
					ids.push(id);
				}
			}
		});
		// log it
		console.log(`Users ${ids} visited on ${date}`);
	});
};

// creates a key with a given prefix and date `visits:{prefix}:{date}`
let createKey = (prefix, date) => {
	return `visits:${prefix}:${date}`;
};

// logs errors
let handleError = (err) => {
	console.error( "error:", err );
};

// store some visits
storeDailyVisit( '2015-01-01', '1' );
storeDailyVisit( '2015-01-01', '2' );
storeDailyVisit( '2015-01-01', '10' );
storeDailyVisit( '2015-01-01', '55' );
// count visits
countDailyVisits( '2015-01-01' );
// show visitor ids
showVisitorIdsFromDate( '2015-01-01' );

// close the redis connection
client.quit();
