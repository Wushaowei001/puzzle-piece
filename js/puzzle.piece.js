puzzle.piece = puzzle.piece || {};

/**
 * Function that is called when a piece enters the draggable start state, meaning it's just
 * began to be moved around the puzzle board.  This is a jQuery UI event.
 *
 * @param  {object} event The jQuery UI event
 * @param  {object} ui    The jQuery UI object
 */
puzzle.piece.draggableStart = function(event, ui) {
	// when we start to move a piece, we're essentially detaching it from
	// the other pieces that were snapped to it. This means we must modify
	// the piece model's IDs snapped array

	// let's start by looking at the pieces connected to this piece
	var model = puzzle.puzzlePieces[this.id].model;
	// if this piece has any connected pieces, we must do some work
	if (model.get("pieceIdsSnappedToMe").length > 0) {
		// for each piece ID connected, remove this piece ID from it's list of connected
		// (since we're moving this piece away from it)
		for (var i=0; i<model.get("pieceIdsSnappedToMe").length; i++) {
			var connectedPieceModel = puzzle.puzzlePieces[model.get("pieceIdsSnappedToMe")[i]].model;
			connectedPieceModel.removePieceIdSnappedToMe(this.id);
			console.log(connectedPieceModel.get("id") + " is no longer connected to " + this.id);

			// if at this point, this connected piece has no more pieces connected,
			if (connectedPieceModel.getSnappedToMeCounter() <= 0) {
				// then clear it's piece fits class
				$("#" + connectedPieceModel.get("id")).removeClass("piece-fits");
			}
		}

		// after that, clear the pieceIdsSnappedToMe since we're moving this piece out
		model.clearPieceIdsSnappedToMe();
		console.log(this.id + " is no longer connected to anything");
	}

	// finally let's clear the piece fits classes from our moving piece
	$(this).removeClass("piece-fits").removeClass("piece-does-not-fit");
};

/**
 * This function is called when a piece stops being dragged, or is placed somewhere
 * on the puzzle board.
 *
 * @param  {object} event The jQuery UI event
 * @param  {object} ui    The jQuery UI object
 */
puzzle.piece.draggableStop = function(event, ui) {
	// determine if there are any pieces snapped to the piece that was moved
	var piecesSnappedToMe = puzzle.piece.findPiecesSnappedToMe(this);

	// if the user snapped this piece to (at least) one other piece
	if (piecesSnappedToMe && piecesSnappedToMe.length > 0) {
		// show the user the outcome of the snap
		puzzle.piece.pieceWasSnapped(this, piecesSnappedToMe);
	}

	// after all is said and done, let's see if we won
	puzzle.didIWin();
};

/**
 * We now know a piece was snapped to some other piece, this function is called to determine
 * what to do next (was the snap a valid placement of this piece?)
 *
 * @param  {object} movedPiece The piece that was moved and snapped to other piece(s)
 * @param  {array} piecesSnappedToMovedPiece An array of pieces snapped to the movedPiece
 */
puzzle.piece.pieceWasSnapped = function(movedPiece, piecesSnappedToMovedPiece) {
	// define some vars used below
	var snapData = {};
	var snapDataArray = [];

	for (var i=0; i<piecesSnappedToMovedPiece.length; i++) {

		// find the data for the pieces snapped together
		snapData = puzzle.piece.loadSnapData(movedPiece, piecesSnappedToMovedPiece[i]);

		if (snapData) {
			// add each piece pair data to the array
			snapDataArray.push(snapData);
		}
	}

	// now alert the user if these pieces fit
	puzzle.piece.showUserIfPieceFits(snapDataArray);
};

/**
 * Finds pieces that were snapped to this piece
 * @param  {string} pieceQuery The query to use in jQuery to find the current piece
 * @return {array} An array of pieces (or the data about those pieces) snapped to this piece
 */
puzzle.piece.findPiecesSnappedToMe = function(pieceQuery) {
	var snappedToMe;

	var snapElements = $(pieceQuery).data("draggable").snapElements;
	if (snapElements) {
		snappedToMe = $.map(snapElements, function(snapElement) {
			return snapElement.snapping ? snapElement.item : null;
		});
	}

	return snappedToMe;
};

/**
 * This function takes data on two pieces and determines information relative for this puzzle
 * game (the sides, ids, and values touching) for this connection.
 *
 * @param  {object} pieceA The data jQuery has on our piece A
 * @param  {object} pieceB The data jQuery has on our piece B
 * @return {object} An object which contains the id, side, and number for piece A and piece B
 */
puzzle.piece.loadSnapData = function(pieceA, pieceB) {
	// We can determine where it's snapped based on the offsets
	if (pieceA.offsetLeft === pieceB.offsetLeft) {
		// they are on top of eachother
		if (pieceA.offsetTop > pieceB.offsetTop) {
			// piece A is below piece B
			return {
				pieceAId: pieceA.id,
				pieceASide: "top",
				pieceANumber: puzzle.puzzlePieces[pieceA.id].topValue,
				pieceBId: pieceB.id,
				pieceBSide: "bottom",
				pieceBNumber: puzzle.puzzlePieces[pieceB.id].bottomValue
			};
		} else {
			// piece A is above piece B
			return {
				pieceAId: pieceA.id,
				pieceASide: "bottom",
				pieceANumber: puzzle.puzzlePieces[pieceA.id].bottomValue,
				pieceBId: pieceB.id,
				pieceBSide: "top",
				pieceBNumber: puzzle.puzzlePieces[pieceB.id].topValue
			};
		}
	} else if (pieceA.offsetTop === pieceB.offsetTop) {
		// they are side by side
		if (pieceA.offsetLeft > pieceB.offsetLeft) {
			// piece A is to the right of piece B
			return {
				pieceAId: pieceA.id,
				pieceASide: "left",
				pieceANumber: puzzle.puzzlePieces[pieceA.id].leftValue,
				pieceBId: pieceB.id,
				pieceBSide: "right",
				pieceBNumber: puzzle.puzzlePieces[pieceB.id].rightValue
			};
		} else {
			// piece A is to the left of piece B
			return {
				pieceAId: pieceA.id,
				pieceASide: "right",
				pieceANumber: puzzle.puzzlePieces[pieceA.id].rightValue,
				pieceBId: pieceB.id,
				pieceBSide: "left",
				pieceBNumber: puzzle.puzzlePieces[pieceB.id].leftValue
			};
		}
	} else {
		// in this case, we're dealing with data from surrounding pieces that
		// were not part of this piece's direct neighbors. jQueryUI provides
		// additional data, but it's of no use to us here, so ignore it.
	}
};

/**
 * Depending on if the piece fits with all other pieces it is now connected to, this
 * function will either display a success or error animation.
 *
 * @param  {array} snapDataArray An array of data on the pieces snapped together
 */
puzzle.piece.showUserIfPieceFits = function(snapDataArray) {
	var failurePairs = {};
	var successPairs = {};
	var i, pieceAId, snapData;

	// sanity check just to make sure there's some data to act on
	if (snapDataArray && snapDataArray.length > 0) {
		// What we're going to do here is basically two things. First, we loop
		// through the snap data which contains each "snap" or connection between
		// two pieces. Looking at this will tell us if the two pieces actually
		// fit together (if their numbers are equal). We store this in a *Pairs
		// object based on if it fit or not. After all that is done, if any failures
		// exist, we consider the piece not to fit and show the animation. However,
		// if no failures exist, we consider the piece to fit and show success.

		// loop on the array to make sure each pieceA fits with pieceB
		for (i=0; i<snapDataArray.length; i++) {
			snapData = snapDataArray[i];

			console.log("piece: " + snapData.pieceAId + " side " + snapData.pieceANumber +
				" connected to " + snapData.pieceBId + " side " + snapData.pieceBNumber);

			// if the numbers are NOT equal they do not fit
			if (snapData.pieceANumber !== snapData.pieceBNumber) {
				// record this for later in our failure object of arrays
				if (!failurePairs[snapData.pieceAId]) {
					// store piece B's ID under piece A
					failurePairs[snapData.pieceAId] = [snapData.pieceBId];
				} else {
					// add piece B's ID to piece A's list of failures
					failurePairs[snapData.pieceAId].push(snapData.pieceBId);
				}
			} else {
				// yay! win! let's store off the ids to set if there are no failures
				if (!successPairs[snapData.pieceAId]) {
					// store piece B's ID under piece A
					successPairs[snapData.pieceAId] = [snapData.pieceBId];
				} else {
					// add piece B's ID to piece A's list of successes
					successPairs[snapData.pieceAId].push(snapData.pieceBId);
				}
			}
		}

		// if there are some failures, handle them all at once
		if (!$.isEmptyObject(failurePairs)) {
			// play the failure sound
			document.getElementById("audio-failure").play();
			for (pieceAId in failurePairs) {
				// first show failure on the main piece
				$("#" + pieceAId).addClass("piece-does-not-fit");
				// now for every additional piece, mark it as so too
				for (i=0; i<failurePairs[pieceAId].length; i++) {
					$("#" + failurePairs[pieceAId][i]).addClass("piece-does-not-fit");
				}
				// move the main piece back to the start
				$("#" + pieceAId).delay(300).animate({
					top: 0,
					left: 0
				}, {
					duration: 1000,
					complete: function() {
						// remove that you've failed (and/or that you've won for piece A)
						$("#" + pieceAId).removeClass("piece-does-not-fit").removeClass("piece-fits");
						for (i=0; i<failurePairs[pieceAId].length; i++) {
							$("#" + failurePairs[pieceAId][i]).removeClass("piece-does-not-fit");
						}
					}
				});
			}
		// else if there were no failures and some success...
		} else if (!$.isEmptyObject(successPairs)) {
			// play the success sound
			document.getElementById("audio-success").play();
			// loop over all the success IDs, update the models, and highlight them
			for (pieceAId in successPairs) {
				// highlight piece A
				$("#" + pieceAId).addClass("piece-fits");
				for (i=0; i<successPairs[pieceAId].length; i++) {
					// add this piece to piece A's connected to array
					puzzle.puzzlePieces[pieceAId].model.addPieceIdSnappedToMe(successPairs[pieceAId][i]);
					console.log(pieceAId + " is now connected to " + successPairs[pieceAId][i]);
					// and add piece A to this piece's connected array
					puzzle.puzzlePieces[successPairs[pieceAId][i]].model.addPieceIdSnappedToMe(pieceAId);
					console.log(successPairs[pieceAId][i] + " is now connected to " + pieceAId);
					// and highlight this piece
					$("#" + successPairs[pieceAId][i]).addClass("piece-fits");
				}
			}
		}
	}
};
