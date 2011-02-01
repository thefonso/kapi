/*global clearTimeout: true, setTimeout: true, window: true, console: true */

/*	Kapi - Keyframe API (for canvas)
 *	jeremyckahn@gmail.com
 * 
 * A keyframe interface for the HTML 5 canvas.
 */

function kapi(canvas, params, events) {

	var version = '0.0.1',
		defaults = {
			fillColor: '#f0f',
			fRate: 20
		},
		toStr = Object.prototype.toString,
		calcKeyframe = {
			'ms': function (num) {
				return (num * this._params.fRate) / 1000;
			},

			's': function (num) {
				return num * this._params.fRate;
			}
		},
		modifiers = {
			'+=': function (original, amount) {
				return original + amount;
			},
			
			'-=': function (original, amount) {
				return original - amount;
			},
			
			'*=': function (original, amount) {
				return original * amount;
			},
			
			'/=': function (original, amount) {
				return original / amount;
			}
		};

		/**
		 * @hide
		 * Copy over properties from `parents` into `child`.  If multiple `parents` are supplied as an Array, `extend` them in order from right to left, and finally onto `child`.
		 * 
		 * @codestart
		 * extend({a:true, b:true}, {c:true});
		 *   --> {a:true, b:true, c:true}
		 * @codeend
		 * 
		 * @codestart
		 * extend({a:true}, [{b:true}, {c:true}]);
		 *   --> {a:true, b:true, c:true}
		 * @codeend
		 * 
		 * Another handy use for this method is to create a new copy of an object, free of any Object references.  You can do this like so:
		 * @codestart
		 * extend({}, objToCopy);
		 * @endcode
		 * 
		 * By default, `extend` will not overwrite properties that are present in the objects that it is extending into.  You can force this with `doOverwrite`.
		 * @codestart
		 * extend({a:5, c:20}, {a: 10, b:15});
		 *   --> {a:5, b:15, c:20}
		 *   
		 * extend({a:5, c:20}, {a: 10, b:15}, true);
		 *   --> {a:10, b:15, c:20}
		 * @codeend
		 * 
		 * This is adapted from the book, "JavaScript Patterns" by Stoyan Stefanov.  Contains some modifications to improve performance for Kapi, so just copy/pasting this for other implementations is likely not wise.  
		 * @param {Object} child The object to extend into.
		 * @param {Object|Array} parents Either the single parent to extend from, of an Array of Objects to extend from.  If multiple parents are give, they are extended sequentially from right to left, and finally onto `child`.
		 * @param {Boolean} doOverwrite Force the properties that are present in the parent object into child object, whether or not that property is already defined on the child object.
		 * @returns {Object} The extended `child`.
		 */
		function extend (child, parents, doOverwrite) {
			var i, parent, extraParents;

			if (!parents) {
				return child;
			}

			if (isArray(parents)) {
				if (!parents.length) {
					return child;
				}

				extraParents = parents.slice(1);
				parent = parents.shift();
			} else {
				parent = parents;
			}

			child = child || {};

			for (i in parent) {
				if (parent.hasOwnProperty(i)) {
					if (typeof parent[i] === 'object' && i !== 'prototype') {
						if (!child[i] || doOverwrite) {
							child[i] = isArray(parent[i]) ? [] : {};
						}
						extend(child[i], parent[i], doOverwrite);
					} else {
						if (typeof child[i] === 'undefined' || doOverwrite) {
							child[i] = parent[i];
						}
					}
				}
			}

			return extend(child, extraParents, doOverwrite);
		}

	/**
	 * @hide
	 * Applies an easing formula defined in `kapi.tween`.
	 * @param {String} easing The name of the easing formula to apply.
	 * @param {Number} previousKeyframe The ID of the keyframe to ease from.
	 * @param {Number} nextKeyframe The ID of the keyframe to ease to.
	 * @param {Number} currProp The the current value of the property that is being eased.
	 * @param {Number} nextProp The value to ease to.
	 * @param {Number} currentProp The current frame that animation is processing.
	 */
	function applyEase (easing, previousKeyframe, nextKeyframe, currProp, nextProp, currentFrame) {
		if ((currentFrame || this._currentFrame) >= previousKeyframe) {
			return kapi.tween[easing]((currentFrame || this._currentFrame) - previousKeyframe, currProp, nextProp - currProp, (nextKeyframe - previousKeyframe) || 1);
		}
	}

	/**
	 * @hide
	 * Returns whether or not `arr` is an Array.
	 * @param {Array} arr The item to inspect.
	 * @returns {Boolean} Whether or not `arr` is an Array.
	 */
	function isArray (arr) {
		return (toStr.call(arr) === '[object Array]');
	}

	/** 
	 * @hide
	 * Return the last element in an array.
	 * @param {Array} arr The array to get the last item from
	 * @returns {Object|undefined} If there are no items in the `arr`, this returns `undefined`.
	 */
	function last (arr) {
		return arr.length > 0 ? arr[arr.length - 1] : undefined;
	}

	/**
	 * @hide
	 * Get a dimension value (height/width) and set it on a DOM element.  This gets the value from the element's CSS and applies it inline.  Useful for changing the `height` and `width` of the `canvas` element, because according to the HTML5 spec, as CSS styles are not the same as the inline dimension values unless specified.
	 * Note:  This is meant to be called with `Function.call()`.
	 * @param {String} dim The dimension to set (either "height" or "width")
	 */
	function setDimensionVal (dim) {
		this[dim] = this.style[dim].replace(/px/gi, '') || this._params[dim];
	}

	/**
	 * @hide
	 * Get the current UNIX time as an integer
	 * @returns {Number} An integer representing the current timestamp.
	 */
	function now () {
		return +new Date();
	}

	function generateUniqueName () {
		return parseInt(('' + Math.random()).substr(2), 10) + now();
	}

	function sortArrayNumerically (array) {
		return array.sort(function (a, b) {
			return a - b;
		});
	}

	function isHexString (str) {
		return typeof str === 'string' && (/^#([0-9]|[a-f]){6}$/i).test(str);
	}

	function isRGBString (str) {
		return typeof str === 'string' && (/^rgb\(\d+\s*,\d+\s*,\d+\s*\)\s*$/i).test(str);
	}

	function isColorString (str) {
		return isHexString(str) || isRGBString(str);
	}

	function hexToDec (hex) {
		return parseInt(hex, 16);
	}

	function hexToRGBArr (hex) {
		if (typeof hex === 'string') {
			hex = hex.replace(/#/g, '');
			return [hexToDec(hex.substr(0, 2)), hexToDec(hex.substr(2, 2)), hexToDec(hex.substr(4, 2))];
		}
	}
	
	function getRGBArr (str) {
		var arr;
		
		if (typeof str !== 'string') {
			return str;
		}
		
		if (/^(#|rgb)/.test(str)) {
			if (/^#/.test(str)) {
				return hexToRGBArr(str);
			} else {
				arr = str.match(/\d+/g);
				return [+arr[0], +arr[1], +arr[2]];
			}
		} else {
			// This isn't a valid color string, return it
			return str;
		}
	}

	function hexToRGBStr (hexStr) {
		if (isRGBString(hexStr)) {
			return hexStr;
		}

		var arr = hexToRGBArr(hexStr);

		return 'rgb(' + arr[0] + ',' + arr[1] + ',' + arr[2] + ')';
	}

	function isModifierString (str) {
		return (typeof str === 'string' && (/^\s*(\+|\-|\*|\/)\=\d+\s*$/).test(str));
	}
	
	// This assumes that `str` is a valid modifier string ('+=x', '-=x', '*=x', '/=x')
	function getModifier (str) {
		return str.match(/(\+|\-|\*|\/)\=/)[0];
	}

	function isKeyframeableProp (prop) {
		return (typeof prop === 'number' || typeof prop === 'function' || isModifierString(prop) || isColorString(prop));
	}

	return {
		// init() is called immediately after this object is defined
		init: function (canvas, params, events) {
			var style;

			params = params || {};
			extend(params, defaults);
			this._params = params;
			
			// Save a reference to original canvas object
			this._params.canvas = canvas;
			this.events = events;
			this.el = canvas;
			this.ctx = canvas.getContext('2d');

			// Initialize some internal properties
			this._keyframeIds = [];
			this._reachedKeyframes = [];
			this._keyframes = {};
			this._objStateIndex = {};
			this._keyframeCache = {};
			this._originalStates = {};
			this._liveCopies = {};
			this._currentState = {};
			this._animationDuration = 0;

			this.state = {
				fCount: 0
			};

			for (style in this._params.styles) {
				if (this._params.styles.hasOwnProperty(style)) {
					this.el.style[style] = this._params.styles[style];
				}
			}

			// The height and width of the canvas draw area do not sync
			// up with the CSS height/width values, so set those manually here
			if (this._params.styles) {
				if (this._params.styles.height) {
					setDimensionVal.call(this.el, 'height');
				}
				if (this._params.styles.width) {
					setDimensionVal.call(this.el, 'width');
				}
			}

			return this;
		},

		getVersion: function () {
			return version;
		},

		isPlaying: function () {
			return (this._isStopped === false && this._isPaused === false);
		},

		play: function () {
			var pauseDuration,
				currTime = now();

			if (this.isPlaying()) {
				return;
			}

			this._isStopped = this._isPaused = false;

			if (!this._startTime) {
				this._startTime = currTime;
			}

			// If the animation was previously playing but was then stopped,
			// adjust for the time that the animation was not runnning.
			if (this._loopStartTime) {
				pauseDuration = currTime - this._pausedAtTime;
				this._loopStartTime += pauseDuration;

				// _startTime needs to be adjusted so that the loop doesn't
				// start somewhere other than the beginning in update()
				this._startTime += pauseDuration;
			} else {
				this._loopStartTime = currTime;
			}

			this.update();
		},

		pause: function () {
			clearTimeout(this._updateHandle);
			this._pausedAtTime = now();
			this._isPaused = true;
		},

		stop: function () {
			var obj;
			
			clearTimeout(this._updateHandle);
			delete this._loopStartTime;
			delete this._pausedAtTime;
			this._isStopped = true;
			
			// Delete any queued Immediate Actions
			for (obj in this._objStateIndex) {
				if (this._objStateIndex.hasOwnProperty(obj)) {
					this._objStateIndex[obj].queue = [];
				}
			}
		},

		add: function (implementationFunc, initialParams) {
			var inst = {};
			inst.draw = implementationFunc;
			inst.params = initialParams;
			inst.constructor = implementationFunc;
			inst.name = implementationFunc.name;

			return this._keyframize(inst);
		},

		// This is not really designed to work correctly with dynamic keyframes, because 
		// there is really no good way to ensure accuracy for skipped dynamic keyframes.
		// This functionality may come in a future release.  Who knows.
		gotoFrame: function (frame) {
			var currTime = now();
			
			if (this.isPlaying()) {
				this.stop();
			}
			
			frame = this._getRealKeyframe(frame) % this._lastKeyframe;
			
			// Fake a bunch of properties to make `update` properly emulate the desired `frame`
			this._currentFrame = frame;
			this._loopStartTime = this._startTime = currTime - (frame * this._params.fRate);
			this._pausedAtTime = currTime;
			this._reachedKeyframes = this._keyframeIds.slice(0, this._getLatestKeyframeId(this._keyframeIds));
			this.ctx.clearRect(0, 0, this.el.width, this.el.height);
			this._update();
		},
		
		gotoAndPlay: function (frame) {
			this.gotoFrame(frame);
			this.play();
		},

		getState: function () {
			return this._currentState;
		},

		// Handle high-level frame management logic
		update: function () {
			// Abandon all hope, ye who enter here.
			var self = this,
				currTime = now();

			this.state.fCount++;
			this._updateHandle = setTimeout(function () {
				var reachedKeyframeLastIndex, prevKeyframe, cachedObject;

				// Calculate how long this iteration of the loop has been running for
				self._loopLength = currTime - self._loopStartTime;

				// Start the loop over if need be.
				if ( (self._loopLength > self._animationDuration) && self._reachedKeyframes.length === self._keyframeIds.length) {
					self._hasHitValidFrame = false;
	
					// Reset the loop start time relative to when the animation began,
					// not to when the final keyframe last completed
					self._loopStartTime = self._startTime + parseInt((currTime - self._startTime) / (self._animationDuration || 1), 10) * self._animationDuration;
					self._loopLength -= self._animationDuration || self._loopLength;
					self._reachedKeyframes = [];
					
					// Clear out the dynamic keyframe cache
					self._keyframeCache = {};
				}

				// Determine where we are in the loop
				if (self._animationDuration) {
					self._loopPosition = self._loopLength / self._animationDuration;
				} else {
					self._loopPosition = 0;
				}
				
				// Calculate the current frame of the loop
				self._currentFrame = parseInt(self._loopPosition * self._lastKeyframe, 10);
				
				prevKeyframe = self._getLatestKeyframeId(self._keyframeIds);
				prevKeyframe = prevKeyframe === -1 ? self._lastKeyframe : self._keyframeIds[prevKeyframe];
				
				// Maintain a record of keyframes that have been run for this loop iteration
				if (prevKeyframe > (last(self._reachedKeyframes) || 0)) {
					self._reachedKeyframes.push(prevKeyframe);
					
					// Flush half of the `_keyframeCache` to maintain the "from" dynamic states
					// when transitioning to the new keyframe segment
					for (cachedObject in self._keyframeCache) {
						if (self._keyframeCache.hasOwnProperty(cachedObject)) {
							self._keyframeCache[cachedObject] = {
								'from': self._keyframeCache[cachedObject].to,
								'to': {}
							};
						}
					}
				}
				
				reachedKeyframeLastIndex = self._reachedKeyframes.length ? self._reachedKeyframes.length - 1 : 0;

				// If a keyframe was skipped, set self._currentFrame to the first skipped keyframe
				if (self._reachedKeyframes[reachedKeyframeLastIndex] !== self._keyframeIds[reachedKeyframeLastIndex] ) {
					self._currentFrame = self._reachedKeyframes[reachedKeyframeLastIndex] = self._keyframeIds[reachedKeyframeLastIndex];
				}
				
				// Only update the canvas if _currentFrame has not gone past the _lastKeyframe
				if (self._currentFrame <= self._lastKeyframe) {
					// Clear out the canvas
					self.ctx.clearRect(0, 0, self.el.width, self.el.height);

					if (typeof self.events.enterFrame === 'function') {
						self.events.enterFrame.call(self);
					}

					self._update(self._currentFrame);
				}
				
				self.update();
			}, 1000 / this._params.fRate);

			return this._updateHandle;
		},

		// Handle low-level drawing logic
		_update: function (currentFrame) {
			// Here be dragons.
			var objName, 
				currentFrameStateProperties, 
				adjustedProperties,
				objActionQueue, 
				oldQueueLength, 
				keyframeToModify;

			for (objName in this._objStateIndex) {
				if (this._objStateIndex.hasOwnProperty(objName)) {

					// The current object may have a first keyframe greater than 0.
					// If so, we don't want to calculate or draw it until we have
					// reached this object's first keyframe
					if (typeof this._objStateIndex[objName][0] !== 'undefined' && this._currentFrame >= this._objStateIndex[objName][0]) {
						currentFrameStateProperties = this._getObjectState(objName);

						// If there are remaining keyframes for this object, draw it.
						if (currentFrameStateProperties !== null) {
							objActionQueue = this._objStateIndex[objName].queue;
							
							// If there is a queued action, apply it to the current frame
							if ((oldQueueLength = objActionQueue.length) > 0) {
								if (objActionQueue[0]._internals.fromState === null) {
									objActionQueue[0]._internals.fromState = currentFrameStateProperties;
								}
								
								adjustedProperties = this._getQueuedActionState(objActionQueue);
								extend(currentFrameStateProperties, adjustedProperties, true);
								
								// If an immediate action finished running and was removed from the queue
								if (oldQueueLength !== objActionQueue.length) {
									
									// Save the modified state to the most recent keyframe for this object
									keyframeToModify = this._getLatestKeyframeId(this._objStateIndex[objName]);
									this._keyframes[ this._keyframeIds[keyframeToModify] ][objName] = currentFrameStateProperties;
									
									// TODO:  Fire an "action completed" event for the immediate action
								}
							}
		
							currentFrameStateProperties.prototype.draw.call(currentFrameStateProperties, this.ctx);
						}
					}
					this._currentState[objName] = currentFrameStateProperties;
				}
			}
		},

		_getObjectState: function (stateObjName) {

			var stateObjKeyframeIndex = this._objStateIndex[stateObjName],
				latestKeyframeId = this._getLatestKeyframeId(stateObjKeyframeIndex),
				nextKeyframeId, 
				latestKeyframeProps, 
				nextKeyframeProps, 
				prop;

			// Do a check to see if any more keyframes remain in the animation loop for this object
			if (latestKeyframeId === -1) {
				return null;
			}

			nextKeyframeId = this._getNextKeyframeId(stateObjKeyframeIndex, latestKeyframeId);
			latestKeyframeProps = this._keyframes[stateObjKeyframeIndex[latestKeyframeId]][stateObjName];
			nextKeyframeProps = this._keyframes[stateObjKeyframeIndex[nextKeyframeId]][stateObjName];

			// If we are on or past the last keyframe
			if (latestKeyframeId === nextKeyframeId  && this._lastKeyframe > 0) {
				if ( this._keyframeIds[latestKeyframeId] === this._lastKeyframe) {
					// If the most recent keyframe is the last keyframe, just draw the "to" position
					// Use extend to create a copy of the object and not just a pointer to the actual keyframe data
					nextKeyframeProps = extend({}, nextKeyframeProps);
					
					// Ensure there any property functions are run
					for (prop in nextKeyframeProps) {
						if (nextKeyframeProps.hasOwnProperty(prop)) {
							if (typeof nextKeyframeProps[prop] === 'function') {
								nextKeyframeProps[prop] = nextKeyframeProps[prop].call(nextKeyframeProps);
							}
						}
					}
					
					// Something dumb must have happened for this code to have been reached.
					return nextKeyframeProps;
					
				} else {
					// Otherwise just don't draw anything
					return null;
				}
			}
			
			if (!this._keyframeCache[stateObjName]) {
				this._keyframeCache[stateObjName] = {
					'from': {},
					'to': {}
				};
			}

			return this._calculateCurrentFrameProps(
				latestKeyframeProps, 
				nextKeyframeProps, 
				stateObjKeyframeIndex[latestKeyframeId], 
				stateObjKeyframeIndex[nextKeyframeId], 
				nextKeyframeProps.easing
			);
		},

		_getQueuedActionState: function (queuedActionsArr) {
			var currTime = now(),
				queuedAction = queuedActionsArr[0],
				internals = queuedAction._internals;

			if (internals.startTime === null) {
				internals.startTime = currTime;
			}
			
			if (!internals.pauseBufferUpdated) {
				internals.pauseBufferUpdated = currTime;
			}
			
			// Account for any animation pauses during the life of the action
			if (internals.pauseBufferUpdated < this._pausedAtTime) {
				internals.pauseBuffer += (currTime - this._pausedAtTime);
				internals.pauseBufferUpdated = currTime;
			}

			if (internals.toState === null) {
				internals.toState = {};
				extend(internals.toState, internals.fromState);
				extend(internals.toState, queuedAction.state, true);
			}
			
			internals.currFrame = ((currTime - (internals.startTime + internals.pauseBuffer)) / 1000) * this._params.fRate;

			if (internals.currFrame > queuedAction.duration) {
				queuedActionsArr.shift();
			}

			return this._calculateCurrentFrameProps(
				internals.fromState, 
				internals.toState, 
				0, 
				+queuedAction.duration, 
				(queuedAction.easing || internals.fromState.easing), 
				{
					currentFrame: internals.currFrame
				}
			);
		},

		_calculateCurrentFrameProps: function (fromState, toState, fromKeyframe, toKeyframe, easing, options) {
			// Magic.
			var i, 
				keyProp, 
				fromProp, 
				toProp, 
				isColor,
				fromStateId,
				toStateId,
				modifier,
				previousPropVal,
				currentFrameProps = {};
			
			easing = kapi.tween[easing] ? easing : 'linear';
			options = options || {};

			for (keyProp in fromState) {

				if (fromState.hasOwnProperty(keyProp)) {
					fromProp = fromState[keyProp];
					fromStateId = fromState.prototype.id;

					if (typeof this._keyframeCache[fromStateId].from[keyProp] !== 'undefined') {
						fromProp = this._keyframeCache[fromStateId].from[keyProp];
					} else if (typeof fromProp === 'function' || isModifierString(fromProp)) {
						// If fromProp is dynamic, preprocess it
						if (typeof fromProp === 'function') {
							fromProp = fromProp.call(fromState) || 0;
						} else {
							modifier = getModifier(fromProp);
							previousPropVal = this._getPreviousKeyframeId(this._objStateIndex[fromStateId]);
							
							// Convert the keyframe ID to its corresponding property value
							if (previousPropVal === -1) {
								// This is the first keyframe for this object, so modify the original parameter if it is available.
								previousPropVal = fromState.prototype.params[keyProp] || 0;
							} else {
								previousPropVal = this._keyframes[previousPropVal][fromStateId][keyProp];
							}
							
							// Convert the value into a number and perform the value modification
							fromProp = modifiers[modifier](previousPropVal, +fromProp.replace(/\D/g, ''));
						}
						
						// Update the cache
						this._keyframeCache[fromStateId].from[keyProp] = fromProp;
					}
					
					if (isKeyframeableProp(fromProp)) {
						isColor = false;
						toProp = toState[keyProp];
						toStateId = toState.prototype.id;
						
						if (typeof this._keyframeCache[toStateId].to[keyProp] !== 'undefined') {
							toProp = this._keyframeCache[toStateId].to[keyProp];
						} else if (typeof toProp === 'function' || isModifierString(toProp)) {
							if (typeof toProp === 'function') {
								toProp = toProp.call(toState) || 0;
							} else {
								modifier = getModifier(toProp);
								toProp = modifiers[modifier](fromProp, +toProp.replace(/\D/g, ''));
							}
							
							this._keyframeCache[toStateId].to[keyProp] = toProp;
						}
						
						if (!isKeyframeableProp(toProp) || typeof fromProp !== typeof toProp) {
							// The toProp isn't valid, so just make the current value for the this frame
							// the same as the fromProp
							currentFrameProps[keyProp] = fromProp;
						} else {
							if (typeof fromProp === 'string') {
								isColor = true;
								fromProp = getRGBArr(fromProp);
								toProp = getRGBArr(toProp);
							}

							// The fromProp and toProp have been validated.
							// Perform the easing calculation to find the middle value based on the _currentFrame
							if (isColor) {
								// If the property is a color, do some logic to
								// blend it across the states
								currentFrameProps[keyProp] = 'rgb(';

								for (i = 0; i < fromProp.length; i++) {
									currentFrameProps[keyProp] += Math.floor(applyEase.call(this, easing, fromKeyframe, toKeyframe, fromProp[i], toProp[i], options.currentFrame)) + ',';
								}

								// Swap the last RGB comma for an end-paren
								currentFrameProps[keyProp] = currentFrameProps[keyProp].replace(/,$/, ')');

							} else {
								currentFrameProps[keyProp] = applyEase.call(this, easing, fromKeyframe, toKeyframe, fromProp, toProp, options.currentFrame);
							}
						}
					}
				}
			}

			extend(currentFrameProps, fromState);
			return currentFrameProps;
		},
		
		_getPreviousKeyframeId: function (lookup) {
			return this._getLatestKeyframeId(lookup) - 1;
		},

		/**
		 * @param {Array} lookup A lookup array for the internal `_keyframes` object
		 * 
		 * @return {Number} The index of the last keyframe that was run in the animation.  Returns `-1` if there are no keyframes remaining for this object in the animation.
		 */
		_getLatestKeyframeId: function (lookup) {
			var i;
			
			if (this._currentFrame === 0) {
				return 0;
			}

			if (this._currentFrame > lookup[lookup.length - 1]) {
				// There are no more keyframes left in the animation loop for this object
				return -1;
			}

			for (i = lookup.length - 1; i >= 0; i--) {
				if (lookup[i] < this._currentFrame) {
					return i;
				}
			}

			return lookup.length - 1;
		},

		_getNextKeyframeId: function (lookup, latestKeyframeId) {
			return latestKeyframeId === lookup.length - 1 ? latestKeyframeId : latestKeyframeId + 1;
		},

		_keyframize: function (implementationObj) {
			var self = this;

			// Make really really sure the id is unique, if one is not provided
			if (typeof implementationObj.id === 'undefined') {
				implementationObj.id =
					implementationObj.params.id || implementationObj.params.name || generateUniqueName();
			}

			if (typeof this._objStateIndex[implementationObj.id] === 'undefined') {
				this._objStateIndex[implementationObj.id] = [];
				this._objStateIndex[implementationObj.id].queue = [];
			}

			implementationObj.keyframe = function keyframe (keyframeId, stateObj) {
				// Save a "safe" copy of the state object before modifying it - will be used later in this function.
				// This is done here to prevent the `_originalStates` property from being changed
				// by other code that references it.
				var orig = extend({}, stateObj);
				
				stateObj.prototype = this;

				try {
					keyframeId = self._getRealKeyframe(keyframeId);
				} catch (ex) {
					if (window.console && window.console.error) {
						console.error(ex);
					}
					return undefined;
				}
				
				if (keyframeId < 0) {
					throw 'keyframe ' + keyframeId + ' is less than zero!';
				}
				
				// Create keyframe zero if it was not done so already
				if (keyframeId > 0 && typeof self._keyframes['0'] === 'undefined') {
					self._keyframes['0'] = {};
					self._keyframeIds.unshift(0);
				}

				// If this keyframe does not already exist, create it
				if (typeof self._keyframes[keyframeId] === 'undefined') {
					self._keyframes[keyframeId] = {};
				}
				
				if (typeof self._originalStates[keyframeId] === 'undefined') {
					self._originalStates[keyframeId] = {};
				}

				// Create the keyframe state info for this object
				self._keyframes[keyframeId][implementationObj.id] = stateObj;
				
				// Save a copy of the original `stateObj`.  This is used for updating keyframes after they are created.
				self._originalStates[keyframeId][implementationObj.id] = orig;

				// Perform necessary maintenance upon all of the keyframes in the animation
				self._updateKeyframes(implementationObj, keyframeId);

				// Copy over any "missing" parameters for this keyframe from the original object definition
				extend(stateObj, implementationObj.params);
				self._updateAnimationDuration();
				
				return this;
			};

			implementationObj.to = function to (duration, stateObj) {
				var last, queue = self._objStateIndex[implementationObj.id].queue;

				queue.push({
					'duration': self._getRealKeyframe(duration),
					'state': stateObj
				});

				last = queue[queue.length - 1];
				last._internals = {};

				last._internals.startTime = null;
				last._internals.fromState = null;
				last._internals.toState = null;
				last._internals.pauseBuffer = null;
				last._internals.pauseBufferUpdated = null;

				return this;
			};

			/**
			 * Cleanly removes `implementationObj` from `keyframeId`, as well as all internal references to it.  
			 * An error is logged if `implementationObj` does not exist at `keyframeId`.
			 *
			 * {param} keyframeId The desired keyframe to remove `implementationObj` from.
			 *
			 * {returns} `implementationObj` for chaining.
			 */
			implementationObj.remove = function remove (keyframeId) {
				var i,
					keyframe,
					liveCopy,
					keyframeHasObjs = false;
				
				keyframeId = self._getRealKeyframe(keyframeId);
				
				if (self._keyframes[keyframeId] && self._keyframes[keyframeId][implementationObj.id]) {
					
					delete self._keyframes[keyframeId][implementationObj.id];
					delete self._originalStates[keyframeId][implementationObj.id];
					
					// Check to see if there's any objects left in the keyframe.
					// If not, delete the keyframe.
					for (keyframe in self._keyframes[keyframeId]) {
						if (self._keyframes[keyframeId].hasOwnProperty(keyframe)) {
							keyframeHasObjs = true;
						}
					}
					
					// You can't delete keyframe zero!  Logically it must always exist!
					if (!keyframeHasObjs && keyframeId !== 0) {
						
						delete self._keyframes[keyframeId];
						delete self._originalStates[keyframeId];
						
						for (i = 0; i < self._keyframeIds.length; i++) {
							if (self._keyframeIds[i] === keyframeId) {
								self._keyframeIds.splice(i, 1);
								break;
							}
						}
						
						for (i = 0; i < self._reachedKeyframes.length; i++) {
							if (self._reachedKeyframes[i] === keyframeId) {
								self._reachedKeyframes.splice(i, 1);
								break;
							}
						}
					}
					
					for (i = 0; i < self._objStateIndex[implementationObj.id].length; i++) {
						if (self._objStateIndex[implementationObj.id][i] === keyframeId) {
							self._objStateIndex[implementationObj.id].splice(i, 1);
						}
					}
					
					if (keyframeId in self._liveCopies) {
						delete self._liveCopies[keyframeId];
					}
					
					for (liveCopy in self._liveCopies) {
						if (self._liveCopies.hasOwnProperty(liveCopy) && self._liveCopies[liveCopy].copyOf === keyframeId) {
							implementationObj.remove(liveCopy);
						}
					}
					
					self._updateAnimationDuration();
					
				} else {
					if (console && console.error) {
						if (self._keyframes[keyframeId]) {
							console.error('Trying to remove ' + implementationObj.id + ' from keyframe ' + keyframeId + ', but ' + implementationObj.id + ' does not exist at that keyframe.');
						} else {
							console.error('Trying to remove ' + implementationObj.id + ' from keyframe ' + keyframeId + ', but keyframe ' + keyframeId + ' does not exist.');
						}
					}
				}
				
				return this;
			};

			// Note!  You cannot update the properties of a keyframe that is a liveCopy.
			// You can only update the properties of the keyframe that it is copying.
			implementationObj.updateKeyframe = function updateKeyframe (keyframeId, newProps) {
				var keyframeToUpdate,
					originalState;
				
				keyframeId = self._getRealKeyframe(keyframeId);
				
				if (self._keyframes[keyframeId] && self._keyframes[keyframeId][implementationObj.id]) {
					originalState = self._originalStates[keyframeId][implementationObj.id];
					keyframeToUpdate = self._keyframes[keyframeId][implementationObj.id];
					extend(originalState, newProps, true);
					implementationObj.keyframe(keyframeId, originalState);
				} else {
					if (window.console && window.console.error) {
						if (!self._keyframes[keyframeId]) {
							console.error('Keyframe ' + keyframeId + ' does not exist.');
						} else {
							console.error('Keyframe ' + keyframeId + ' does not contain ' + implementationObj.id);
						}
					}
				}
				
				return this;
			};

			implementationObj.liveCopy = function liveCopy (keyframeId, keyframeIdToCopy) {
				
				keyframeId = self._getRealKeyframe(keyframeId);
				keyframeIdToCopy = self._getRealKeyframe(keyframeIdToCopy);
				
				if (self._keyframes[keyframeIdToCopy] && self._keyframes[keyframeIdToCopy][implementationObj.id]) {
					// Maintain an index of liveCopies so that they are updated in `_updateKeyframes`.
					self._liveCopies[keyframeId] = {
						'implementationObjId': implementationObj.id,
						'copyOf': keyframeIdToCopy
					};
					
					implementationObj.keyframe(keyframeId, {});
				} else {
					if (window.console && window.console.error) {
						if (!self._keyframes[keyframeIdToCopy]) {
							console.error('Trying to make a liveCopy of ' + keyframeIdToCopy + ', but keyframe ' + keyframeIdToCopy + ' does not exist.');
						} else {
							console.error('Trying to make a liveCopy of ' + keyframeIdToCopy + ', but  ' + implementationObj.id + ' does not exist at keyframe ' + keyframeId + '.');
						}
					}
				}
			};

			implementationObj.getState = function getState () {
				return self._currentState[implementationObj.id] || {};
			};
			
			implementationObj.get = function get (prop) {
				return implementationObj.getState()[prop];
			};

			return implementationObj;
		},
		
		// Calculates the "real" keyframe from `identifier`.
		// This means that you can speicify keyframes from things other than plain integers.
		// For example, you can calculate the real keyframe that will run at a certain period of time.
		// Valid formats:
		// 
		// x : keyframe integer
		// xms : kayframe at an amount of milliseconds
		// xs : kayframe at an amount of seconds
		_getRealKeyframe: function (identifier) {
			var quantifier, unit, calculatedKeyframe;

			if (typeof identifier === 'number') {
				return parseInt(identifier, 10);
			} else if (typeof identifier === 'string') {
				// Strip spaces
				identifier = identifier.replace(/\s/g, '');

				quantifier = /^(\d|\.)+/.exec(identifier)[0];
				unit = /\D+$/.exec(identifier);

				// The quantifier was passed as a string... just return it as a number
				if (!unit) {
					return parseInt(quantifier, 10);
				}

				if (calcKeyframe[unit]) {
					calculatedKeyframe = parseInt(calcKeyframe[unit].call(this, quantifier), 10);
				} else {
					throw 'Invalid keyframe identifier unit!';
				}

				return calculatedKeyframe;
			} else {
				throw 'Invalid keyframe identifier type!';
			}

		},

		_updateKeyframes: function (implementationObj, keyframeId) {
			this._updateKeyframeIdsList(keyframeId);
			this._normalizeObjectAcrossKeyframes(implementationObj.id);
			this._updateLiveCopies();
			this._updateObjStateIndex(implementationObj, {
				add: keyframeId
			});
		},

		_updateKeyframeIdsList: function (keyframeId) {
			var i;

			for (i = 0; i < this._keyframeIds.length; i++) {
				if (this._keyframeIds[i] === keyframeId) {
					return;
				}
			}

			this._keyframeIds.push(keyframeId);
			sortArrayNumerically(this._keyframeIds);
		},

		_normalizeObjectAcrossKeyframes: function (keyframedObjId) {
			var newStateId, 
				prevStateId, 
				i, 
				length = this._keyframeIds.length,
				newStateObj, 
				prevStateObj, 
				prop;

			// Traverse all keyframes in the animation
			for (i = 0; i < length; i++) {

				newStateId = this._keyframeIds[i];
				newStateObj = this._keyframes[newStateId][keyframedObjId];

				if (typeof prevStateId !== 'undefined') {
					prevStateObj = this._keyframes[prevStateId][keyframedObjId];
					extend(newStateObj, prevStateObj);
				}

				// Find any hex color strings and convert them to rgb(x, x, x) format.
				// More overhead for keyframe setup, but makes for faster frame processing later
				for (prop in newStateObj) {
					if (newStateObj.hasOwnProperty(prop)) {
						if (isColorString(newStateObj[prop])) {
							newStateObj[prop] = hexToRGBStr(newStateObj[prop]);
						}
					}
				}

				// Only store the prevState if keyframedObjId actually exists in this keyframe 
				if (newStateObj) {
					prevStateId = newStateId;
				}
			}
		},

		_updateObjStateIndex: function (implementationObj, params) {
			var index = this._objStateIndex[implementationObj.id],
				stateAlreadyExists = false,
				i;

			if (typeof params.add !== 'undefined') {
				for (i = 0; i < index.length; i++) {
					if (index[i] === params.add) {
						stateAlreadyExists = true;
					}
				}
				
				if (!stateAlreadyExists) {
					index.push(params.add);
					sortArrayNumerically(index);
				}
			}
		},

		_updateLiveCopies: function () {
			var liveCopy;
			
			for (liveCopy in this._liveCopies) {
				if (this._liveCopies.hasOwnProperty(liveCopy)) {
					this._keyframes[liveCopy][this._liveCopies[liveCopy].implementationObjId] = this._keyframes[this._liveCopies[liveCopy].copyOf][this._liveCopies[liveCopy].implementationObjId];
				}
			}
		},

		_updateAnimationDuration: function () {
			// Calculate and update the number of seconds this animation will run for
			this._lastKeyframe = last(this._keyframeIds);
			this._animationDuration = 1000 * (this._lastKeyframe / this._params.fRate);
		}

	}.init(canvas, params, events);
}

// Attach tween methods to the `kapi.tween` function to extend it.
kapi.tween = {
	// All equations are copied from here: http://www.gizma.com/easing/
	// Originally written by Robert Penner, copied under BSD License (http://www.robertpenner.com/)
	//
	// Params are as follows
	// t = current time
	// b = start value
	// c = change in value
	// d = duration
	// no easing, no acceleration
	linear: function (t, b, c, d) {
		return c * t / d + b;
	}
};