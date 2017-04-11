// Leaderboard constructor - hoisted
function Leaderboard( key ) {
	// define a key for the leaderboard's sorted set
	this.key = key;
}

Leaderboard.prototype = {
	// adds a user to the leaderboard
	addUser: function( username, score ) {
		// add a user to the sorted set with the given score
		client.zadd( [ this.key, score, username ], function( err, replies ) {
			// handle errors
			if ( err ) {
				return this.handleError( err );
			}
			// log the success
			console.log( "User", username, "added to the leaderboard!" );
		}.bind( this ) );
	},
	// removes a user from the leaderboard
	removeUser: function( username ) {
		// remove a user
		client.zrem( this.key, username, function( err, reply ) {
			// handle errors
			if ( err ) {
				return this.handleError( err );
			}
			// log
			console.log( "User", username, "removed from the leaderboard!" );
		}.bind( this ) );
	},
	// gets a user's score and rank
	getUserScoreAndRank: function( username ) {
		// get the user's score
		client.zscore( this.key, username, function( err, scoreReply ) {
			// handle the error
			if ( err ) {
				return this.handleError( err );
			}
			// get the user's rank in the set (reversed, so highest->lowest)
			client.zrevrank( this.key, username, function( err, rankReply ) {
				// handle the error
				if ( err ) {
					return this.handleError( err );
				}
				// log it
				console.log( "\nDetails of " + username + ":");
				console.log( "Score:", scoreReply + ", Rank #" + ( rankReply + 1 ) );
			}.bind( this ) );
		}.bind( this ) );
	},
	// get `quantity` users ranked around the given user
	// good for showing a user's place in a subset of a large leaderboard
	getUsersAroundUser: function( username, quantity, callback ) {
		// get the user's rank reversed
		client.zrevrank( this.key, username, function( err, rank ) {
			// handle the error
			if ( err ) {
				this.handleError( err );
			}
			// determine the start rank in the set
			// should be half of quantity before the user's rank
			var start = Math.floor( rank - ( quantity / 2 ) + 1 );
			// if that took us below 0, start at 0
			if ( start < 0 ) { start = 0; }
			// determine the end
			var end = start + quantity - 1;
			// get the users in the given range, including their scores
			client.zrevrange( [ this.key, start, end, "WITHSCORES" ], function( err, range ) {
				// handle the error
				if ( err ) {
					this.handleError( err );
				}
				// start an empty list of user data
				var users = [];
				// loop over the replies
				for ( var i = 0, rank = 1; i < range.length; i += 2, rank++ ) {
					// add user data to the list
					users.push( {
						rank: start + rank,
						score: range[ i + 1 ],
						username: range[ i ],
					} );
				}
				// call the callback with the list
				callback( users );
			}.bind( this ) );
		}.bind( this ) );
	},
	// show the top users on the leaderboard
	showTopUsers: function( quantity ) {
		// get a list of users starting at the top
		client.zrevrange( [ this.key, 0, quantity - 1, "WITHSCORES" ], function( err, reply ) {
			// handle errors
			if ( err ) {
				return this.handleError( err );
			}

			console.log( "\nTop", quantity, "users:" );
			// loop over the replies and log the users
			for ( var i = 0, rank = 1, len = reply.length; i < len; i += 2, rank++ ) {
				console.log( "#" + rank, "User:" + reply[ i ] + ", score:", reply[ i + 1 ])
			}
		}.bind( this ) );
	},
	// logs errors
	handleError: function( err ) {
		console.error( "Error: ", err );
	}
};

// redis client
var client = require( "redis" ).createClient();
// create the leaderboard
leaderboard = new Leaderboard( "game-score" ),
// user data
users = [
	[ "Bob", 70 ],
	[ "Mike", 100 ],
	[ "Steve", 30 ],
	[ "Ray", 50 ],
	[ "Tim", 50 ],
	[ "Ron", 80 ],
	[ "Dave", 110 ],
	[ "Kate", 120 ],
	[ "Jill", 110 ],
	[ "Sue", 150 ],
	[ "Lily", 100 ],
	[ "Riley", 100 ],
	[ "Skyler" ,100 ],
];

// add users to the leaderboard
users.forEach( function( user ) {
	leaderboard.addUser.apply( leaderboard, user );
} );
// remove bob
leaderboard.removeUser( "Bob" );
// get ray's score and rank
leaderboard.getUserScoreAndRank( "Ray" );
// show the top 5 users
leaderboard.showTopUsers( 5 );
// get 5 users around kate
leaderboard.getUsersAroundUser( "Kate", 5, function( users ) {
	console.dir( users );

	client.quit();
} );
