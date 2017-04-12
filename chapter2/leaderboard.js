const client = require('redis').createClient();

class Leaderboard {

	constructor(key) {
		// define a key for the leaderboard's sorted set
		this.key = key;
	}
	// adds a user to the leaderboard
	addUser(username, score) {
		// add a user to the sorted set with the given score
		client.zadd( [ this.key, score, username ], (err, reply) => {
			// handle errors
			if ( err ) {
				return this.handleError( err );
			}
			// log the success
			console.log(`User ${username} added to the leaderboard!`);
		});
	}
	// removes a user from the leaderboard
	removeUser(username) {
		// remove a user
		client.zrem( this.key, username, (err, reply) => {
			// handle errors
			if ( err ) {
				return this.handleError( err );
			}
			// log
			console.log(`User ${username} removed from the leaderboard!`);
		});
	}
	// gets a user's score and rank
	getUserScoreAndRank(username) {
		// get the user's score
		client.zscore( this.key, username, (err, scoreReply) => {
			// handle the error
			if ( err ) {
				return this.handleError( err );
			}
			// get the user's rank in the set (reversed, so highest->lowest)
			client.zrevrank( this.key, username, (err, rankReply) => {
				// handle the error
				if ( err ) {
					return this.handleError( err );
				}
				// log it
				console.log(`\nDetails of ${username}:`);
				console.log(`Score: ${scoreReply}, Rank #${(rankReply + 1)}`);
			});
		});
	}
	// get `quantity` users ranked around the given user
	// good for showing a user's place in a subset of a large leaderboard
	getUsersAroundUser(username, quantity, callback) {
		// get the user's rank reversed
		client.zrevrank( this.key, username, (err, rank) => {
			// handle the error
			if ( err ) {
				this.handleError( err );
			}
			// determine the start rank in the set
			// should be half of quantity before the user's rank
			let start = Math.floor( rank - (quantity / 2) + 1 );
			// if that took us below 0, start at 0
			if ( start < 0 ) { start = 0; }
			// determine the end
			let end = start + quantity - 1;
			// get the users in the given range, including their scores
			client.zrevrange( [ this.key, start, end, 'WITHSCORES' ], (err, range) => {
				// handle the error
				if ( err ) {
					this.handleError( err );
				}
				// start an empty list of user data
				let users = [];
				// loop over the replies
				for ( let i = 0, rank = 1; i < range.length; i += 2, rank++ ) {
					// add user data to the list
					users.push( {
						rank: start + rank,
						score: range[ i + 1 ],
						username: range[ i ],
					} );
				}
				// call the callback with the list
				callback( users );
			});
		});
	}
	// show the top users on the leaderboard
	showTopUsers(quantity) {
		// get a list of users starting at the top
		client.zrevrange( [ this.key, 0, quantity - 1, 'WITHSCORES' ], (err, reply) => {
			// handle errors
			if ( err ) {
				return this.handleError( err );
			}

			console.log(`\nTop ${quantity} users:`);
			// loop over the replies and log the users
			for ( let i = 0, rank = 1, len = reply.length; i < len; i += 2, rank++ ) {
				console.log(`#${rank} User:${reply[i]}, Score: ${reply[i+1]}`);
			}
		});
	}
	// logs errors
	handleError( err ) {
		console.error( 'Error: ', err );
	}
}

// create the leaderboard
let leaderboard = new Leaderboard( 'game-score' ),
// user data
users = [
	[ 'Bob', 70 ],
	[ 'Mike', 100 ],
	[ 'Steve', 30 ],
	[ 'Ray', 50 ],
	[ 'Tim', 50 ],
	[ 'Ron', 80 ],
	[ 'Dave', 110 ],
	[ 'Kate', 120 ],
	[ 'Jill', 110 ],
	[ 'Sue', 150 ],
	[ 'Lily', 100 ],
	[ 'Riley', 100 ],
	[ 'Skyler' ,100 ],
];

// add users to the leaderboard
users.forEach(user => leaderboard.addUser.apply(leaderboard, user));

// remove bob
leaderboard.removeUser( 'Bob' );
// get ray's score and rank
leaderboard.getUserScoreAndRank( 'Ray' );
// show the top 5 users
leaderboard.showTopUsers( 5 );
// get 5 users around kate
leaderboard.getUsersAroundUser( 'Kate', 5, (users) => {
	console.dir( users );

	client.quit();
});
