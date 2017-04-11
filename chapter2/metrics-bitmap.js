// Simple metrics with redis bitmaps

// redis client
var client = require( "redis" ).createClient( {
	// manipulate buffers instead of strings
	// easier when dealing with bits
	return_buffers: true,
} );

storeDailyVisit( '2015-01-01', '1' );
storeDailyVisit( '2015-01-01', '2' );
storeDailyVisit( '2015-01-01', '10' );
storeDailyVisit( '2015-01-01', '55' );

countDailyVisits( '2015-01-01' );

showVisitorIdsFromDate( '2015-01-01' );


function storeDailyVisit( date, id ) {
	// create a key
	var key = createKey( "daily", date );
	// set the bit at the given id to 1
	client.setbit( key, id, 1, function( err, reply ) {
		// handle error
		if ( err ) {
			return handleError( err );
		}

		console.log( "User", id, "visited on", date );
	} );
}

function countDailyVisits( date ) {
	// get the key
	var key = createKey( "daily", date );
	// get the bit count for this key
	client.bitcount( key, function( err, reply ) {
		// handle error
		if ( err ) {
			return handleError( err );
		}

		// log it
		console.log( date, "had", reply, "visits." );
	} );
}

function showVisitorIdsFromDate( date ) {
	// get the key
	var key = createKey( "daily", date );
	// get the whole bitmap
	// returns a node buffer because we set return_buffers above
	client.get( key, function( err, bitmap ) {
		if ( err ) {
			return handleError( err );
		}
		// empty list of visitor ids
		var ids = [],
		// get the bitmap data
		data = bitmap.toJSON().data;
		// loop over the bytes
		data.forEach( function( byte, index ) {
			// loop over the bits in the byte
			for ( var bit = 7; bit >= 0; bit-- ) {
				// shift a bit and compare with a bitmask of 1
				visited = byte >> bit & 1;
				// check if 1
				if ( visited == 1 ) {
					// get the index (user id) of the visited bit
					var id = index * 8 + ( 7 - bit );
					// push on to visited ids
					ids.push( id );
				}
			}
		} );
		// log it
		console.log( "Users " + ids + " visited on " + date );
	} );
}

// creates a key with a given prefix and date `visits:{prefix}:{date}`
function createKey( prefix, date ) {
	return [ "visits", prefix, date ].join( ":" );
}

// logs errors
function handleError( err ) {
	console.error( "error:", err );
}
